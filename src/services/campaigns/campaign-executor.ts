import { getSenderSettings } from '../settings/sender-settings';

import {
  getWhatsAppStatus,
  openWhatsAppChat,
  sendWhatsAppCampaignMessage,
  WhatsAppAutomationError,
} from '../whatsapp/whatsapp-service';

import {
  claimQueuedCampaign,
  finishCampaignIfComplete,
  getCampaignExecutionData,
  getCampaignStatus,
  getDeliveryStatus,
  getNextQueuedCampaignId,
  initializeMessageDeliveries,
  markCampaignFailed,
  markDeliveryFailed,
  markDeliverySending,
  markDeliverySent,
  markRecipientFailed,
  markRecipientNotContactable,
  markRecipientProcessing,
  markRecipientSuccess,
  pauseCampaignForSenderProblem,
  recalculateCampaignCounters,
  recordCampaignEvent,
} from './campaign-execution-repository';

let executorTimer: ReturnType<typeof setInterval> | null = null;

let executorBusy = false;

let stopRequested = false;
const idleWaiters: Array<() => void> = [];

function randomBetween(minimum: number, maximum: number) {
  if (maximum <= minimum) {
    return minimum;
  }

  return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

async function waitWithCampaignControl(campaignId: string, durationMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < durationMs) {
    if (stopRequested) {
      return false;
    }

    const status = getCampaignStatus(campaignId);

    if (status !== 'running') {
      return false;
    }

    const remaining = durationMs - (Date.now() - startedAt);

    await new Promise<void>((resolve) =>
      setTimeout(resolve, Math.min(500, Math.max(1, remaining))),
    );
  }

  return true;
}

function getErrorDetails(error: unknown) {
  if (error instanceof WhatsAppAutomationError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'SEND_ERROR',
      message: error.message,
    };
  }

  return {
    code: 'SEND_ERROR',
    message: 'Unknown WhatsApp sending error.',
  };
}

async function executeCampaign(campaignId: string) {
  if (!claimQueuedCampaign(campaignId)) {
    return;
  }

  try {
    initializeMessageDeliveries(campaignId);

    const data = getCampaignExecutionData(campaignId);

    const settings = getSenderSettings();

    for (
      let recipientIndex = 0;
      recipientIndex < data.recipients.length;
      recipientIndex += 1
    ) {
      if (stopRequested) {
        return;
      }

      const campaignStatus = getCampaignStatus(campaignId);

      if (campaignStatus !== 'running') {
        return;
      }

      const recipient = data.recipients[recipientIndex];

      const currentData = getCampaignExecutionData(campaignId);

      const currentRecipient = currentData.recipients.find(
        (item) => item.id === recipient.id,
      );

      if (!currentRecipient || currentRecipient.status !== 'pending') {
        continue;
      }

      markRecipientProcessing(recipient.id);

      recordCampaignEvent(
        campaignId,
        'recipient_started',
        `Started recipient ${recipient.normalizedPhone}.`,
        {
          recipientId: recipient.id,
        },
      );

      let chatReady = false;

      try {
        const chatResult = await openWhatsAppChat(recipient.normalizedPhone);
        if (stopRequested) return;

        if (chatResult === 'not_contactable') {
          markRecipientNotContactable(campaignId, recipient.id);

          recalculateCampaignCounters(campaignId);

          continue;
        }

        chatReady = true;
      } catch (error) {
        if (stopRequested) return;
        const details = getErrorDetails(error);

        markRecipientFailed(recipient.id, details.code, details.message);

        recalculateCampaignCounters(campaignId);

        recordCampaignEvent(campaignId, 'recipient_failed', details.message, {
          recipientId: recipient.id,

          metadata: {
            code: details.code,
          },
        });

        if (
          details.code === 'WHATSAPP_SESSION_LOST' ||
          details.code === 'WHATSAPP_SESSION_NOT_READY' ||
          details.code === 'WHATSAPP_NOT_CONNECTED'
        ) {
          pauseCampaignForSenderProblem(campaignId, details.message);

          return;
        }
      }

      if (!chatReady) {
        continue;
      }

      let recipientFailed = false;

      for (
        let messageIndex = 0;
        messageIndex < data.messages.length;
        messageIndex += 1
      ) {
        if (stopRequested) {
          return;
        }

        const status = getCampaignStatus(campaignId);

        if (status !== 'running') {
          return;
        }

        const message = data.messages[messageIndex];

        const delivery = getDeliveryStatus(recipient.id, message.id);

        if (!delivery) {
          markRecipientFailed(
            recipient.id,
            'DELIVERY_RECORD_MISSING',
            'Message delivery record could not be found.',
          );

          recipientFailed = true;

          break;
        }

        if (delivery.status === 'sent') {
          continue;
        }

        if (delivery.status === 'unknown') {
          markRecipientFailed(
            recipient.id,
            'UNCERTAIN_DELIVERY',
            'A previous message attempt has an uncertain state. Explicit retry is required.',
          );

          recipientFailed = true;

          break;
        }

        if (delivery.status !== 'pending') {
          continue;
        }

        markDeliverySending(delivery.id);

        recordCampaignEvent(
          campaignId,
          'message_attempt_started',
          `Message ${message.position} started.`,
          {
            recipientId: recipient.id,

            deliveryId: delivery.id,
          },
        );

        try {
          await sendWhatsAppCampaignMessage({
            type: message.type,

            textContent: message.textContent,

            caption: message.caption,

            mediaPath: message.mediaPath,
          });

          if (stopRequested) return;
          markDeliverySent(delivery.id);

          recordCampaignEvent(
            campaignId,
            'message_submitted',
            `Message ${message.position} was submitted through WhatsApp Web.`,
            {
              recipientId: recipient.id,

              deliveryId: delivery.id,
            },
          );
        } catch (error) {
          if (stopRequested) return;
          const details = getErrorDetails(error);

          markDeliveryFailed(delivery.id, details.code, details.message);

          markRecipientFailed(recipient.id, details.code, details.message);

          recordCampaignEvent(campaignId, 'message_failed', details.message, {
            recipientId: recipient.id,

            deliveryId: delivery.id,

            metadata: {
              code: details.code,
            },
          });

          recipientFailed = true;

          if (
            details.code === 'WHATSAPP_SESSION_LOST' ||
            details.code === 'WHATSAPP_SESSION_NOT_READY' ||
            details.code === 'WHATSAPP_NOT_CONNECTED'
          ) {
            pauseCampaignForSenderProblem(campaignId, details.message);

            recalculateCampaignCounters(campaignId);

            return;
          }

          break;
        }

        const hasAnotherMessage = messageIndex < data.messages.length - 1;

        if (hasAnotherMessage) {
          const delay = randomBetween(
            settings.messageDelayMinMs,
            settings.messageDelayMaxMs,
          );

          const continued = await waitWithCampaignControl(campaignId, delay);

          if (!continued) {
            return;
          }
        }
      }

      if (!recipientFailed) {
        const refreshed = getCampaignExecutionData(campaignId);

        const allSent = refreshed.messages.every((message) => {
          const delivery = getDeliveryStatus(recipient.id, message.id);

          return delivery?.status === 'sent';
        });

        if (allSent) {
          markRecipientSuccess(recipient.id);

          recordCampaignEvent(
            campaignId,
            'recipient_completed',
            `Recipient ${recipient.normalizedPhone} completed.`,
            {
              recipientId: recipient.id,
            },
          );
        }
      }

      recalculateCampaignCounters(campaignId);

      const hasAnotherRecipient = recipientIndex < data.recipients.length - 1;

      if (hasAnotherRecipient) {
        const delay = randomBetween(
          settings.recipientDelayMinMs,
          settings.recipientDelayMaxMs,
        );

        const continued = await waitWithCampaignControl(campaignId, delay);

        if (!continued) {
          return;
        }
      }
    }

    recalculateCampaignCounters(campaignId);

    finishCampaignIfComplete(campaignId);
  } catch (error) {
    if (stopRequested) return;
    const message =
      error instanceof Error
        ? error.message
        : 'Campaign execution stopped because of an unexpected error.';

    console.error('[Campaign Executor]', error);

    const status = getCampaignStatus(campaignId);

    if (status === 'running') {
      markCampaignFailed(campaignId, message);
    }
  }
}

async function executorTick() {
  if (executorBusy || stopRequested) {
    return;
  }

  executorBusy = true;

  try {
    const whatsappStatus = await getWhatsAppStatus();

    if (stopRequested || whatsappStatus.state !== 'connected') {
      return;
    }

    const campaignId = getNextQueuedCampaignId();

    if (!campaignId) {
      return;
    }

    await executeCampaign(campaignId);
  } catch (error) {
    console.error(
      '[Campaign Executor] Unable to process delivery queue.',
      error,
    );
  } finally {
    executorBusy = false;
    for (const resolve of idleWaiters.splice(0)) resolve();
  }
}

export function startCampaignExecutor() {
  if (executorTimer) {
    return;
  }

  stopRequested = false;

  void executorTick();

  executorTimer = setInterval(() => {
    void executorTick();
  }, 2000);
}

export function stopCampaignExecutor(): Promise<void> {
  stopRequested = true;

  if (executorTimer) {
    clearInterval(executorTimer);

    executorTimer = null;
  }
  return executorBusy
    ? new Promise((resolve) => idleWaiters.push(resolve))
    : Promise.resolve();
}
