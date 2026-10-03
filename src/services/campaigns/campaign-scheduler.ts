import { processDueCampaigns } from './campaign-repository';

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

function runSchedulerCheck() {
  try {
    const queuedCount = processDueCampaigns();

    if (queuedCount > 0) {
      console.log(
        `[Campaign Scheduler] ${queuedCount} scheduled campaign(s) moved to queued.`,
      );
    }
  } catch (error) {
    console.error(
      '[Campaign Scheduler] Unable to process due campaigns.',
      error,
    );
  }
}

export function startCampaignScheduler() {
  if (schedulerTimer) {
    return;
  }

  // Check overdue schedules immediately when Electron starts.
  runSchedulerCheck();

  // Check every 30 seconds while the app is running.
  schedulerTimer = setInterval(runSchedulerCheck, 30_000);
}

export function stopCampaignScheduler() {
  if (!schedulerTimer) {
    return;
  }

  clearInterval(schedulerTimer);

  schedulerTimer = null;
}
