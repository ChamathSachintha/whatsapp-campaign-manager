import { app } from 'electron';

import { existsSync } from 'node:fs';

import path from 'node:path';

import {
  chromium,
  type BrowserContext,
  type Locator,
  type Page,
} from 'playwright-core';

import {
  getSenderSettings,
  type SenderSettings,
} from '../settings/sender-settings';

export type WhatsAppConnectionState =
  | 'disconnected'
  | 'opening'
  | 'waiting_for_qr'
  | 'connected'
  | 'error';

export type WhatsAppStatus = {
  state: WhatsAppConnectionState;
  message: string;
  browserName: string | null;
};

export type WhatsAppCampaignMessage = {
  type: 'text' | 'image' | 'image-caption' | 'document' | 'document-caption';

  textContent: string | null;
  caption: string | null;
  mediaPath: string | null;
};

export class WhatsAppAutomationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);

    this.name = 'WhatsAppAutomationError';

    this.code = code;
  }
}

let browserContext: BrowserContext | null = null;

let whatsappPage: Page | null = null;

let connectionState: WhatsAppConnectionState = 'disconnected';

let connectionMessage = 'WhatsApp Web is not open.';

let activeBrowserName: string | null = null;

let openingPromise: Promise<WhatsAppStatus> | null = null;

/* =========================================================
   BROWSER
   ========================================================= */

function getBrowserCandidates() {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;

    const programFiles = process.env.PROGRAMFILES;

    const programFilesX86 = process.env['PROGRAMFILES(X86)'];

    return [
      {
        name: 'Google Chrome',

        path:
          localAppData &&
          path.join(
            localAppData,
            'Google',
            'Chrome',
            'Application',
            'chrome.exe',
          ),
      },

      {
        name: 'Google Chrome',

        path:
          programFiles &&
          path.join(
            programFiles,
            'Google',
            'Chrome',
            'Application',
            'chrome.exe',
          ),
      },

      {
        name: 'Google Chrome',

        path:
          programFilesX86 &&
          path.join(
            programFilesX86,
            'Google',
            'Chrome',
            'Application',
            'chrome.exe',
          ),
      },

      {
        name: 'Microsoft Edge',

        path:
          programFilesX86 &&
          path.join(
            programFilesX86,
            'Microsoft',
            'Edge',
            'Application',
            'msedge.exe',
          ),
      },

      {
        name: 'Microsoft Edge',

        path:
          programFiles &&
          path.join(
            programFiles,
            'Microsoft',
            'Edge',
            'Application',
            'msedge.exe',
          ),
      },
    ].filter(
      (
        browser,
      ): browser is {
        name: string;
        path: string;
      } => Boolean(browser.path && existsSync(browser.path)),
    );
  }

  if (process.platform === 'darwin') {
    return [
      {
        name: 'Google Chrome',

        path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      },

      {
        name: 'Microsoft Edge',

        path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      },
    ].filter((browser) => existsSync(browser.path));
  }

  return [
    {
      name: 'Google Chrome',

      path: '/usr/bin/google-chrome',
    },

    {
      name: 'Google Chrome',

      path: '/usr/bin/google-chrome-stable',
    },

    {
      name: 'Microsoft Edge',

      path: '/usr/bin/microsoft-edge',
    },
  ].filter((browser) => existsSync(browser.path));
}

/* =========================================================
   BASIC HELPERS
   ========================================================= */

async function isVisible(locator: Locator): Promise<boolean> {
  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
}

async function sleep(page: Page, milliseconds: number) {
  await page.waitForTimeout(milliseconds);
}

async function insideMainFooter(locator: Locator) {
  try {
    return await locator.evaluate((element) =>
      Boolean(element.closest('#main footer')),
    );
  } catch {
    return false;
  }
}

/* =========================================================
   CONNECTION
   ========================================================= */

async function detectPageState(page: Page): Promise<WhatsAppConnectionState> {
  if (page.isClosed()) {
    return 'disconnected';
  }

  const connectedSelectors = [
    '#pane-side',

    '[aria-label="Chat list"]',

    '[data-testid="chat-list"]',
  ];

  for (const selector of connectedSelectors) {
    const locator = page.locator(selector).first();

    if (await isVisible(locator)) {
      return 'connected';
    }
  }

  const qrSelectors = [
    'canvas[aria-label*="Scan"]',

    '[data-testid="qrcode"]',

    'div[data-ref] canvas',
  ];

  for (const selector of qrSelectors) {
    const locator = page.locator(selector).first();

    if (await isVisible(locator)) {
      return 'waiting_for_qr';
    }
  }

  try {
    const bodyText = await page.locator('body').innerText({
      timeout: 3000,
    });

    if (/scan.*qr|link.*device|log in.*qr/i.test(bodyText)) {
      return 'waiting_for_qr';
    }
  } catch {
    // Ignore.
  }

  return 'opening';
}

async function updateConnectionState() {
  if (!browserContext || !whatsappPage || whatsappPage.isClosed()) {
    connectionState = 'disconnected';

    connectionMessage = 'WhatsApp Web is not open.';

    return;
  }

  const state = await detectPageState(whatsappPage);

  connectionState = state;

  if (state === 'connected') {
    connectionMessage = 'WhatsApp Web is connected.';
  } else if (state === 'waiting_for_qr') {
    connectionMessage =
      'Scan the QR code in the browser window using WhatsApp.';
  } else {
    connectionMessage = 'WhatsApp Web is loading.';
  }
}

/* =========================================================
   BROWSER LAUNCH
   ========================================================= */

async function launchWhatsAppBrowser() {
  const settings = getSenderSettings();

  const browsers = getBrowserCandidates();

  if (browsers.length === 0) {
    throw new Error(
      'Google Chrome or Microsoft Edge could not be found on this computer.',
    );
  }

  const profileDirectory = path.join(
    app.getPath('userData'),
    'whatsapp-session',
  );

  let lastError: unknown | null = null;

  for (const browser of browsers) {
    try {
      const context = await chromium.launchPersistentContext(profileDirectory, {
        executablePath: browser.path,

        headless: false,

        viewport: null,

        timeout: settings.navigationTimeoutMs,

        args: ['--start-maximized'],
      });

      browserContext = context;

      activeBrowserName = browser.name;

      context.on('close', () => {
        browserContext = null;

        whatsappPage = null;

        connectionState = 'disconnected';

        connectionMessage = 'WhatsApp Web browser was closed.';
      });

      const existingPages = context.pages();

      whatsappPage = existingPages[0] ?? (await context.newPage());

      whatsappPage.setDefaultTimeout(settings.actionTimeoutMs);

      whatsappPage.setDefaultNavigationTimeout(settings.navigationTimeoutMs);

      whatsappPage.on('close', () => {
        whatsappPage = null;
      });

      await whatsappPage.goto('https://web.whatsapp.com/', {
        waitUntil: 'domcontentloaded',

        timeout: settings.navigationTimeoutMs,
      });

      await updateConnectionState();

      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to open WhatsApp Web.');
}

/* =========================================================
   CONNECTION API
   ========================================================= */

export async function connectWhatsApp(): Promise<WhatsAppStatus> {
  if (openingPromise) {
    return openingPromise;
  }

  openingPromise = (async () => {
    try {
      connectionState = 'opening';

      connectionMessage = 'Opening WhatsApp Web...';

      if (browserContext && whatsappPage && !whatsappPage.isClosed()) {
        await whatsappPage.bringToFront();

        await updateConnectionState();

        return getWhatsAppStatus();
      }

      await launchWhatsAppBrowser();

      return getWhatsAppStatus();
    } catch (error) {
      connectionState = 'error';

      connectionMessage =
        error instanceof Error ? error.message : 'Unable to open WhatsApp Web.';

      return getWhatsAppStatus();
    } finally {
      openingPromise = null;
    }
  })();

  return openingPromise;
}

export async function disconnectWhatsApp(): Promise<WhatsAppStatus> {
  try {
    if (browserContext) {
      await browserContext.close();
    }
  } catch {
    // Browser may already be closed.
  }

  browserContext = null;

  whatsappPage = null;

  connectionState = 'disconnected';

  connectionMessage =
    'WhatsApp Web browser is closed. Your local login profile is preserved.';

  return getWhatsAppStatus();
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  if (browserContext && whatsappPage && !whatsappPage.isClosed()) {
    try {
      await updateConnectionState();
    } catch {
      // Preserve current state.
    }
  }

  return {
    state: connectionState,

    message: connectionMessage,

    browserName: activeBrowserName,
  };
}

async function requireConnectedPage() {
  if (!browserContext || !whatsappPage || whatsappPage.isClosed()) {
    throw new WhatsAppAutomationError(
      'WHATSAPP_NOT_CONNECTED',
      'WhatsApp Web is not open.',
    );
  }

  await updateConnectionState();

  if (connectionState !== 'connected') {
    throw new WhatsAppAutomationError(
      'WHATSAPP_SESSION_NOT_READY',
      'WhatsApp Web is not connected.',
    );
  }

  return whatsappPage;
}

/* =========================================================
   NORMAL CHAT COMPOSER
   ========================================================= */

async function getComposeBox(page: Page, timeoutMs: number) {
  const selectors = [
    '#main footer [contenteditable="true"][aria-label*="message" i]',

    '#main footer [contenteditable="true"][role="textbox"]',

    '#main footer [contenteditable="true"]',

    'footer [contenteditable="true"][role="textbox"]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).last();

    try {
      await locator.waitFor({
        state: 'visible',

        timeout: timeoutMs,
      });

      return locator;
    } catch {
      // Try next selector.
    }
  }

  throw new WhatsAppAutomationError(
    'CHAT_COMPOSER_NOT_FOUND',
    'WhatsApp message composer could not be found.',
  );
}

/* =========================================================
   MEDIA PREVIEW STATE

   Your current WhatsApp Web build exposes:
   button[aria-label="Add file"]

   We use this as our main preview indicator.
   ========================================================= */

async function isMediaPreviewOpen(page: Page) {
  const addFile = page.locator('button[aria-label="Add file"]').last();

  if ((await addFile.count()) > 0 && (await isVisible(addFile))) {
    return true;
  }

  const caption = page.locator('[aria-label*="Add a caption" i]').last();

  return (await caption.count()) > 0 && (await isVisible(caption));
}

async function waitForMediaPreviewOpen(page: Page, settings: SenderSettings) {
  const deadline = Date.now() + settings.mediaUploadTimeoutMs;

  while (Date.now() < deadline) {
    if (await isMediaPreviewOpen(page)) {
      console.log('[WhatsApp] Media preview is open.');

      return;
    }

    await sleep(page, 200);
  }

  throw new WhatsAppAutomationError(
    'MEDIA_PREVIEW_TIMEOUT',
    'WhatsApp media preview did not open.',
  );
}

/* =========================================================
   CLEAN STALE PREVIEW
   ========================================================= */

async function closeAnyMediaPreview(page: Page) {
  if (!(await isMediaPreviewOpen(page))) {
    return;
  }

  console.log('[WhatsApp] Closing stale media preview.');

  await page.keyboard.press('Escape');

  await sleep(page, 400);

  if (await isMediaPreviewOpen(page)) {
    await page.keyboard.press('Escape');

    await sleep(page, 400);
  }
}

/* =========================================================
   OPEN RECIPIENT CHAT
   ========================================================= */

function normalizePhoneForUrl(phone: string) {
  const digits = phone.replace(/\D/g, '');

  if (!digits) {
    throw new WhatsAppAutomationError(
      'INVALID_PHONE',
      'Recipient phone number is invalid.',
    );
  }

  return digits;
}

function looksNotContactable(text: string) {
  return [
    /phone number shared via url is invalid/i,

    /isn't on whatsapp/i,

    /is not on whatsapp/i,

    /not on whatsapp/i,

    /invalid phone number/i,
  ].some((pattern) => pattern.test(text));
}

export async function openWhatsAppChat(
  phone: string,
): Promise<'ready' | 'not_contactable'> {
  const page = await requireConnectedPage();

  await closeAnyMediaPreview(page);

  const settings = getSenderSettings();

  const digits = normalizePhoneForUrl(phone);

  await page.goto(
    `https://web.whatsapp.com/send?phone=${encodeURIComponent(digits)}`,
    {
      waitUntil: 'domcontentloaded',

      timeout: settings.navigationTimeoutMs,
    },
  );

  const deadline = Date.now() + settings.navigationTimeoutMs;

  while (Date.now() < deadline) {
    try {
      const compose = await getComposeBox(page, 1000);

      if (await compose.isVisible()) {
        connectionState = 'connected';

        return 'ready';
      }
    } catch {
      // Continue.
    }

    try {
      const bodyText = await page.locator('body').innerText({
        timeout: 1000,
      });

      if (looksNotContactable(bodyText)) {
        return 'not_contactable';
      }
    } catch {
      // Continue.
    }

    await sleep(page, 300);
  }

  throw new WhatsAppAutomationError(
    'CHAT_LOAD_TIMEOUT',
    'WhatsApp chat did not become ready.',
  );
}

/* =========================================================
   TEXT MESSAGE
   ========================================================= */

async function sendTextMessage(
  page: Page,
  text: string,
  settings: SenderSettings,
) {
  const compose = await getComposeBox(page, settings.actionTimeoutMs);

  await compose.click({
    timeout: settings.actionTimeoutMs,
  });

  await compose.fill(text, {
    timeout: settings.actionTimeoutMs,
  });

  await compose.press('Enter', {
    timeout: settings.actionTimeoutMs,
  });
}

/* =========================================================
   ATTACH BUTTON
   ========================================================= */

async function clickAttachButton(page: Page, settings: SenderSettings) {
  await closeAnyMediaPreview(page);

  const selectors = [
    'button[aria-label="Attach"]',

    'button[title="Attach"]',

    'span[data-icon="plus-rounded"]',

    'span[data-icon="clip"]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).last();

    if ((await locator.count()) === 0) {
      continue;
    }

    if (!(await isVisible(locator))) {
      continue;
    }

    try {
      await locator.click({
        timeout: settings.actionTimeoutMs,
      });

      await sleep(page, 250);

      return;
    } catch {
      try {
        await locator.locator('..').click({
          timeout: settings.actionTimeoutMs,
        });

        await sleep(page, 250);

        return;
      } catch {
        // Try next.
      }
    }
  }

  throw new WhatsAppAutomationError(
    'ATTACH_BUTTON_NOT_FOUND',
    'WhatsApp attachment button could not be found.',
  );
}

/* =========================================================
   ATTACHMENT MENU
   ========================================================= */

async function findAttachmentMenuOption(
  page: Page,
  type: 'image' | 'document',
  settings: SenderSettings,
) {
  const deadline = Date.now() + settings.actionTimeoutMs;

  const patterns =
    type === 'image'
      ? [/photos.*videos/i, /photo.*video/i, /^photos$/i]
      : [/^document$/i, /document/i];

  while (Date.now() < deadline) {
    const items = page.locator('[role="menuitem"], [role="button"], li');

    const count = await items.count();

    for (let index = 0; index < count; index += 1) {
      const candidate = items.nth(index);

      if (!(await isVisible(candidate))) {
        continue;
      }

      let text = '';

      try {
        text = (await candidate.innerText()).trim();
      } catch {
        continue;
      }

      if (patterns.some((pattern) => pattern.test(text))) {
        console.log(`[WhatsApp] Attachment option: ${text}`);

        return candidate;
      }
    }

    await sleep(page, 200);
  }

  throw new WhatsAppAutomationError(
    'ATTACHMENT_OPTION_NOT_FOUND',

    type === 'image'
      ? 'WhatsApp Photos & videos option could not be found.'
      : 'WhatsApp Document option could not be found.',
  );
}

/* =========================================================
   ATTACHMENT UPLOAD
   ========================================================= */

async function uploadAttachment(
  page: Page,
  filePath: string,
  type: 'image' | 'document',
  settings: SenderSettings,
) {
  await clickAttachButton(page, settings);

  const menuOption = await findAttachmentMenuOption(page, type, settings);

  try {
    const chooserPromise = page.waitForEvent('filechooser', {
      timeout: settings.actionTimeoutMs,
    });

    await menuOption.click({
      timeout: settings.actionTimeoutMs,
    });

    const chooser = await chooserPromise;

    await chooser.setFiles(filePath);

    console.log('[WhatsApp] File selected through WhatsApp file chooser.');

    return;
  } catch {
    console.log(
      '[WhatsApp] File chooser event unavailable. Trying matching file input.',
    );
  }

  const inputs = page.locator('input[type="file"]');

  const count = await inputs.count();

  for (let index = count - 1; index >= 0; index -= 1) {
    const input = inputs.nth(index);

    const accept = ((await input.getAttribute('accept')) ?? '').toLowerCase();

    if (type === 'image' && !accept.includes('image')) {
      continue;
    }

    if (type === 'document' && accept.includes('image')) {
      continue;
    }

    await input.setInputFiles(filePath, {
      timeout: settings.mediaUploadTimeoutMs,
    });

    console.log('[WhatsApp] File selected through matching upload input.');

    return;
  }

  throw new WhatsAppAutomationError(
    'FILE_UPLOAD_NOT_FOUND',
    'WhatsApp attachment input could not be found.',
  );
}

/* =========================================================
   CAPTION FIELD

   For caption-required message types we DO NOT
   send unless caption insertion is verified.
   ========================================================= */

async function findCaptionBox(page: Page, settings: SenderSettings) {
  const deadline = Date.now() + settings.mediaUploadTimeoutMs;

  const exactSelectors = [
    '[aria-label="Add a caption"]',

    '[aria-label="Add a caption…"]',

    '[aria-label*="Add a caption" i]',

    '[data-placeholder*="Add a caption" i]',

    '[aria-placeholder*="Add a caption" i]',

    '[placeholder*="Add a caption" i]',

    '[role="textbox"][aria-label*="caption" i]',

    '[contenteditable="true"][aria-label*="caption" i]',
  ];

  while (Date.now() < deadline) {
    /*
     * Prefer explicit WhatsApp caption labels.
     */

    for (const selector of exactSelectors) {
      const fields = page.locator(selector);

      const count = await fields.count();

      for (let index = count - 1; index >= 0; index -= 1) {
        const candidate = fields.nth(index);

        if (await isVisible(candidate)) {
          console.log(`[WhatsApp] Caption field: ${selector}`);

          return candidate;
        }
      }
    }

    /*
     * Geometry fallback:
     * choose a visible text editor in the lower half
     * of the media preview, never the normal chat footer.
     */

    const editors = page.locator(
      '[contenteditable="true"], textarea, input[type="text"], [role="textbox"]',
    );

    const editorCount = await editors.count();

    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    let best: {
      locator: Locator;
      score: number;
    } | null = null;

    for (let index = 0; index < editorCount; index += 1) {
      const candidate = editors.nth(index);

      if (!(await isVisible(candidate))) {
        continue;
      }

      if (await insideMainFooter(candidate)) {
        continue;
      }

      const box = await candidate.boundingBox();

      if (!box) {
        continue;
      }

      const centerY = box.y + box.height / 2;

      /*
       * Caption field should be in the lower
       * portion of the media composer.
       */

      if (centerY < viewport.height * 0.45) {
        continue;
      }

      const aria = (
        (await candidate.getAttribute('aria-label')) ?? ''
      ).toLowerCase();

      const placeholder = (
        (await candidate.getAttribute('data-placeholder')) ??
        (await candidate.getAttribute('placeholder')) ??
        ''
      ).toLowerCase();

      if (aria.includes('search') || placeholder.includes('search')) {
        continue;
      }

      let score = centerY;

      if (aria.includes('caption') || placeholder.includes('caption')) {
        score += 10000;
      }

      if (!best || score > best.score) {
        best = {
          locator: candidate,
          score,
        };
      }
    }

    if (best) {
      console.log('[WhatsApp] Caption field found using preview geometry.');

      return best.locator;
    }

    await sleep(page, 200);
  }

  throw new WhatsAppAutomationError(
    'CAPTION_BOX_NOT_FOUND',
    'WhatsApp media preview opened, but its caption field could not be found. The attachment was NOT sent.',
  );
}

async function readCaptionValue(locator: Locator) {
  try {
    return await locator.evaluate((element) => {
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      ) {
        return element.value;
      }

      return element.textContent ?? '';
    });
  } catch {
    return '';
  }
}

async function writeAndVerifyCaption(
  page: Page,
  captionBox: Locator,
  caption: string,
  settings: SenderSettings,
) {
  try {
    await captionBox.click({
      timeout: settings.actionTimeoutMs,
    });
  } catch {
    await captionBox.focus({
      timeout: settings.actionTimeoutMs,
    });
  }

  try {
    await captionBox.fill(caption, {
      timeout: settings.actionTimeoutMs,
    });
  } catch {
    await captionBox.focus();

    if (process.platform === 'darwin') {
      await page.keyboard.press('Meta+A');
    } else {
      await page.keyboard.press('Control+A');
    }

    await page.keyboard.press('Backspace');

    await page.keyboard.insertText(caption);
  }

  await sleep(page, 300);

  let value = await readCaptionValue(captionBox);

  /*
   * If WhatsApp's Lexical editor did not react to fill(),
   * re-enter with keyboard insertion.
   */

  if (!value.trim().includes(caption.trim())) {
    await captionBox.focus();

    if (process.platform === 'darwin') {
      await page.keyboard.press('Meta+A');
    } else {
      await page.keyboard.press('Control+A');
    }

    await page.keyboard.press('Backspace');

    await page.keyboard.insertText(caption);

    await sleep(page, 300);

    value = await readCaptionValue(captionBox);
  }

  if (!value.trim().includes(caption.trim())) {
    throw new WhatsAppAutomationError(
      'CAPTION_INSERT_FAILED',
      'The WhatsApp caption editor was found, but the caption could not be verified. The attachment was NOT sent.',
    );
  }

  console.log('[WhatsApp] Caption verified in media preview.');
}

/* =========================================================
   FIND MEDIA SEND BUTTON

   We first look semantically, then use geometry.

   The visual Send control in your screenshot is the
   large circular button at the lower-right.
   ========================================================= */

async function findMediaSendControl(page: Page, settings: SenderSettings) {
  const deadline = Date.now() + settings.actionTimeoutMs;

  while (Date.now() < deadline) {
    const semanticSelectors = [
      'button[aria-label="Send"]',

      '[role="button"][aria-label="Send"]',

      '[aria-label*="Send" i]',

      'button:has([data-icon="send"])',

      '[role="button"]:has([data-icon="send"])',

      '[data-icon="send"]',

      '[data-icon="send-filled"]',
    ];

    for (const selector of semanticSelectors) {
      const candidates = page.locator(selector);

      const count = await candidates.count();

      for (let index = count - 1; index >= 0; index -= 1) {
        const candidate = candidates.nth(index);

        if (!(await isVisible(candidate))) {
          continue;
        }

        if (await insideMainFooter(candidate)) {
          continue;
        }

        const clickable = candidate.locator(
          'xpath=ancestor-or-self::*[self::button or @role="button"][1]',
        );

        if ((await clickable.count()) > 0 && (await isVisible(clickable))) {
          console.log(
            `[WhatsApp] Media Send control found semantically: ${selector}`,
          );

          return clickable;
        }

        return candidate;
      }
    }

    /*
     * Geometry fallback.
     *
     * We inspect visible buttons and choose the most
     * likely lower-right action button.
     */

    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    const buttons = page.locator('button, [role="button"]');

    const count = await buttons.count();

    let best: {
      locator: Locator;
      score: number;
    } | null = null;

    for (let index = 0; index < count; index += 1) {
      const candidate = buttons.nth(index);

      if (!(await isVisible(candidate))) {
        continue;
      }

      const box = await candidate.boundingBox();

      if (!box) {
        continue;
      }

      const centerX = box.x + box.width / 2;

      const centerY = box.y + box.height / 2;

      /*
       * Current media Send is in lower-right.
       */

      if (centerX < viewport.width * 0.65 || centerY < viewport.height * 0.55) {
        continue;
      }

      const aria = (
        (await candidate.getAttribute('aria-label')) ?? ''
      ).toLowerCase();

      const title = (
        (await candidate.getAttribute('title')) ?? ''
      ).toLowerCase();

      if (
        aria.includes('add file') ||
        aria.includes('close') ||
        aria.includes('download') ||
        aria.includes('copy') ||
        title.includes('add file') ||
        title.includes('close')
      ) {
        continue;
      }

      let score = centerX + centerY * 2;

      if (aria.includes('send')) {
        score += 10000;
      }

      if (box.width >= 40 && box.height >= 40) {
        score += 500;
      }

      if (!best || score > best.score) {
        best = {
          locator: candidate,
          score,
        };
      }
    }

    if (best) {
      console.log(
        '[WhatsApp] Media Send control found using lower-right geometry.',
      );

      return best.locator;
    }

    await sleep(page, 200);
  }

  throw new WhatsAppAutomationError(
    'MEDIA_SEND_BUTTON_NOT_FOUND',
    'WhatsApp media Send control could not be identified.',
  );
}

/* =========================================================
   WAIT FOR PREVIEW CLOSE
   ========================================================= */

async function waitForMediaPreviewClosed(page: Page, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!(await isMediaPreviewOpen(page))) {
      try {
        const compose = await getComposeBox(page, 1500);

        if (await compose.isVisible()) {
          await sleep(page, 400);

          return true;
        }
      } catch {
        // Keep waiting.
      }
    }

    await sleep(page, 200);
  }

  return false;
}

/* =========================================================
   SUBMIT MEDIA

   For caption messages:
   1. Caption must already be verified.
   2. Try Enter from caption field.
   3. If preview remains open, activate the actual
      lower-right Send control using DOM click.

   DOM click avoids the exact pointer interception
   error from your log.
   ========================================================= */

async function submitMediaPreview(
  page: Page,
  captionBox: Locator | null,
  settings: SenderSettings,
) {
  /*
   * Caption editor Enter is a useful first path because
   * WhatsApp commonly treats Enter as Send in the
   * attachment composer.
   */

  if (captionBox) {
    try {
      await captionBox.focus();

      await captionBox.press('Enter');

      console.log('[WhatsApp] Media submit attempted using caption Enter.');

      const closed = await waitForMediaPreviewClosed(page, 3000);

      if (closed) {
        console.log('[WhatsApp] Media preview closed after caption Enter.');

        return;
      }

      console.log(
        '[WhatsApp] Preview remained open after Enter. Falling back to Send control.',
      );
    } catch {
      // Use actual Send control.
    }
  }

  const sendControl = await findMediaSendControl(page, settings);

  /*
   * DO NOT use normal locator.click() here.
   *
   * Your log showed:
   * button[aria-label="Add file"] intercepts pointer events.
   *
   * Calling HTMLElement.click() activates the identified
   * control without Playwright's pointer hit-test.
   */

  try {
    await sendControl.evaluate((element) => {
      (element as HTMLElement).click();
    });

    console.log('[WhatsApp] Media Send activated using DOM click.');
  } catch (error) {
    console.warn('[WhatsApp] DOM click failed. Trying focused Enter.', error);

    await sendControl.focus();

    await page.keyboard.press('Enter');
  }

  const closed = await waitForMediaPreviewClosed(
    page,
    settings.mediaUploadTimeoutMs,
  );

  if (!closed) {
    throw new WhatsAppAutomationError(
      'MEDIA_SEND_TIMEOUT',
      'WhatsApp media preview remained open after the Send action.',
    );
  }

  console.log('[WhatsApp] Media preview closed successfully.');
}

/* =========================================================
   MEDIA SEND
   ========================================================= */

async function sendMediaMessage(
  page: Page,
  message: WhatsAppCampaignMessage,
  settings: SenderSettings,
) {
  if (!message.mediaPath || !existsSync(message.mediaPath)) {
    throw new WhatsAppAutomationError(
      'MEDIA_FILE_MISSING',
      'Stored campaign attachment could not be found.',
    );
  }

  const uploadType: 'image' | 'document' =
    message.type === 'image' || message.type === 'image-caption'
      ? 'image'
      : 'document';

  const requiresCaption =
    message.type === 'image-caption' || message.type === 'document-caption';

  try {
    /*
     * Every recipient starts from a clean UI state.
     */

    await closeAnyMediaPreview(page);

    console.log(`[WhatsApp] Starting ${uploadType} upload.`);

    await uploadAttachment(page, message.mediaPath, uploadType, settings);

    await waitForMediaPreviewOpen(page, settings);

    /*
     * IMPORTANT:
     * for caption-required messages, nothing is sent
     * until the caption is positively verified.
     */

    let captionBox: Locator | null = null;

    if (requiresCaption) {
      const caption = message.caption?.trim();

      if (!caption) {
        throw new WhatsAppAutomationError(
          'EMPTY_CAPTION',
          'This campaign message requires a caption.',
        );
      }

      captionBox = await findCaptionBox(page, settings);

      await writeAndVerifyCaption(page, captionBox, caption, settings);
    }

    await submitMediaPreview(page, captionBox, settings);

    console.log(`[WhatsApp] ${uploadType} message submitted successfully.`);
  } catch (error) {
    console.error('[WhatsApp] Media send failed:', error);

    /*
     * CRITICAL FOR MULTI-RECIPIENT CAMPAIGNS:
     *
     * Never allow the next recipient to inherit the
     * previous recipient's unsent preview.
     */

    try {
      await closeAnyMediaPreview(page);
    } catch {
      try {
        await page.keyboard.press('Escape');

        await sleep(page, 300);

        await page.keyboard.press('Escape');
      } catch {
        // Ignore cleanup errors.
      }
    }

    throw error;
  }
}

/* =========================================================
   PUBLIC MESSAGE SENDER
   ========================================================= */

export async function sendWhatsAppCampaignMessage(
  message: WhatsAppCampaignMessage,
) {
  const page = await requireConnectedPage();

  const settings = getSenderSettings();

  if (message.type === 'text') {
    const text = message.textContent?.trim();

    if (!text) {
      throw new WhatsAppAutomationError(
        'EMPTY_TEXT',
        'Campaign text message is empty.',
      );
    }

    await sendTextMessage(page, text, settings);

    return;
  }

  await sendMediaMessage(page, message, settings);
}
