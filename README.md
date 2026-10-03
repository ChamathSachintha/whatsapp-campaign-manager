# Outreach - WhatsApp Campaign Manager

> [!WARNING]
> **Use at your own risk.** This application is intended only for legitimate, authorized practices and messages to recipients who have consented to receive them. Do not use it for spam, harassment, fraud, or any unlawful or unauthorized activity. You are responsible for your use of the application and for complying with applicable laws and WhatsApp's terms and policies.

[![Desktop app](https://img.shields.io/badge/Desktop-Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)](#what-you-can-do)
[![Node.js requirement](https://img.shields.io/badge/Node.js-24.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](#before-you-begin)
[![Local storage](https://img.shields.io/badge/Storage-Local_SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](#local-data-and-backups)

A desktop workspace for preparing contact lists, composing WhatsApp campaigns, scheduling messages, and reviewing sending results. Campaign data is stored locally, and WhatsApp Web runs in a separate browser managed by the application.

This guide takes a new user from installation to their first campaign. Windows is the primary development environment; browser detection and packaging configuration also include macOS and Linux.

### Quick navigation

[![Set up the app](https://img.shields.io/badge/1-Set_up_the_app-15803D?style=for-the-badge)](#install-and-launch)
[![Connect WhatsApp](https://img.shields.io/badge/2-Connect_WhatsApp-15803D?style=for-the-badge&logo=whatsapp&logoColor=white)](#connect-whatsapp)
[![Import contacts](https://img.shields.io/badge/3-Import_contacts-15803D?style=for-the-badge)](#prepare-your-contact-list)
[![Create a campaign](https://img.shields.io/badge/4-Create_a_campaign-15803D?style=for-the-badge)](#create-and-send-your-first-campaign)

[![Scheduling and tray](https://img.shields.io/badge/Scheduling_%26_tray-334155?style=for-the-badge)](#scheduling-and-background-operation)
[![Troubleshooting](https://img.shields.io/badge/Troubleshooting-334155?style=for-the-badge)](#troubleshooting)
[![Build the app](https://img.shields.io/badge/Build_the_app-334155?style=for-the-badge)](#development-and-packaging)

Start with **Set up the app**, then follow the numbered buttons to send your first test campaign. Each button jumps to instructions in this guide.

## Contents

- [What you can do](#what-you-can-do)
- [Before you begin](#before-you-begin)
- [Install and launch](#install-and-launch)
- [Connect WhatsApp](#connect-whatsapp)
- [Prepare your contact list](#prepare-your-contact-list)
- [Create and send your first campaign](#create-and-send-your-first-campaign)
- [Scheduling and background operation](#scheduling-and-background-operation)
- [Understand campaign results](#understand-campaign-results)
- [Settings and sending speed](#settings-and-sending-speed)
- [Local data and backups](#local-data-and-backups)
- [Troubleshooting](#troubleshooting)
- [Development and packaging](#development-and-packaging)

## What you can do

- Import contact lists from CSV, Excel (`.xlsx` / `.xls`), and Markdown (`.md`).
- Validate Sri Lankan phone numbers and identify duplicates within an import.
- Compose ordered text, image, image-with-caption, document, and document-with-caption messages.
- Save drafts, change their recipient lists, or reuse an existing campaign as a new draft.
- Send immediately or schedule a campaign in the **Asia/Colombo** timezone.
- Follow progress, pause and resume sending, cancel campaigns, and retry failed work.
- Search tables and browse records in pages of 10.
- Review recent history and export summary or detailed CSV reports.
- Keep the application running in the system tray when closing the window.

## Before you begin

### Requirements

| Requirement         | Details                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop environment | A computer with a graphical desktop and a usable system tray for background operation.                                                                   |
| Browser             | Google Chrome or Microsoft Edge installed in a standard location. The app uses an installed browser; it does not download one.                           |
| WhatsApp account    | An account you can link to WhatsApp Web using your phone. A WhatsApp Business account is not required.                                                   |
| Internet connection | Required to install dependencies from source, connect WhatsApp, and send messages.                                                                       |
| Node.js and npm     | Required when running or building from source. Node.js **24.x** is the recommended baseline; the current Forge dependency requires at least **22.13.0**. |
| Git                 | Optional if you download the source as a ZIP; needed to clone the repository.                                                                            |

An installed, packaged desktop application does **not** require Node.js, npm, or Git on the recipient's computer.

The current contact validator accepts **Sri Lankan numbers only**. Scheduling uses **Asia/Colombo (UTC+05:30)**, regardless of your computer's timezone.

Only send to people who have agreed to receive your messages. This application automates WhatsApp Web; it does not use the official WhatsApp Business Platform. There are no API keys to configure.

### Do I need a WhatsApp Business account?

**No.** The current application uses Playwright to control an installed Chrome or Edge browser running **WhatsApp Web**. It does **not** integrate with the WhatsApp Business API or Meta's Cloud API. You do not need a Meta developer app, a business account, an API access token, or a webhook to set it up.

Connect your WhatsApp account by scanning the QR code as described below. A WhatsApp Business account is optional; using one does not change this application's connection into an API integration.

## Install and launch

### Option A: Use a packaged application

If the project maintainer has supplied an installer or packaged application:

1. Install or extract the package provided for your operating system.
2. Ensure Chrome or Edge is installed.
3. Launch **WhatsApp Campaign Manager**.
4. Continue with [Connect WhatsApp](#connect-whatsapp).

This repository contains packaging configuration. A prebuilt installer or published release is not required to run from source, and this guide does not assume one is available.

### Option B: Run from source

1. Install Node.js 24.x with npm. Restart your terminal after installation.
2. Clone the repository using its actual URL, or download and extract the source ZIP.
3. Open a terminal in the project directory containing `package.json`.
4. Check your tools, install dependencies, and start the application.

On **Windows PowerShell**:

```powershell
node --version
npm.cmd --version

# Change this path to the location of your downloaded or cloned project.
cd "D:\Projects\whatsapp-campaign-manager"

npm.cmd ci
npm.cmd start
```

On **macOS or Linux**, open the project directory and use:

```sh
node --version
npm --version
npm ci
npm start
```

`npm ci` installs the dependencies recorded in `package-lock.json`. The initial install needs network access to npm, Electron's download hosts, and the SheetJS CDN used for Excel support.

The application creates its database and initializes its tables on first launch. You do not need to install a database server, create an `.env` file, or run migrations manually.

When running from source, keep the launch terminal open while using the app. Stopping the development process also stops scheduling and sending.

## Connect WhatsApp

1. Open **Settings** from the sidebar.
2. In **WhatsApp Web**, select **Open WhatsApp Web**.
3. The application opens a separate Chrome or Edge window.
4. Use WhatsApp on your phone to link this browser by scanning its QR code.
5. Wait until the application shows **Connected** or **Ready to send**.

The app stores a dedicated local browser profile, so you can usually reuse your login on future launches. Open WhatsApp Web again after restarting the application; browser connection is not automatically started at launch.

Keep the app-managed WhatsApp browser open while sending. Use **Disconnect WhatsApp** in Settings when you want to close it; this preserves the local profile. Logging out from WhatsApp itself may require you to scan a new QR code later.

If no browser can be found, see [Troubleshooting](#troubleshooting).

## Prepare your contact list

### CSV example

Create a UTF-8 CSV file with a header row:

```csv
Name,Phone
Recipient One,0771234567
Recipient Two,+94772345678
```

These are format examples. Replace them with your own consenting recipients before sending. For your first test, use your own WhatsApp number.

### Accepted phone formats

| Input example   | Normalized result |
| --------------- | ----------------- |
| `0771234567`    | `+94771234567`    |
| `94771234567`   | `+94771234567`    |
| `+94771234567`  | `+94771234567`    |
| `0094771234567` | `+94771234567`    |

Spaces, brackets, and separators are removed during normalization. The validator checks number format; a valid format does not guarantee that the number has a WhatsApp account.

For Excel, format phone columns as **Text** so leading zeroes are preserved. The importer reads the **first worksheet**. Include a header row and avoid merged headers or unrelated introductory rows.

Markdown supports a contact table, or a simple phone-number list:

```markdown
| Name          | Phone        |
| ------------- | ------------ |
| Recipient One | 0771234567   |
| Recipient Two | +94772345678 |
```

### Import and review

1. Open **Contact lists**.
2. Select **Choose a file to import**.
3. Check the detected phone column; choose the correct column if needed.
4. Optionally choose a name column.
5. Review the validation results and resolve invalid entries in your source file when necessary.
6. Save the import so it becomes available when creating a campaign.

Duplicate numbers within a list are identified and excluded from campaign recipients. Suppressed contacts are also excluded when creating or replacing a campaign's recipient list. Every table supports search and displays up to 10 records per page.

## Create and send your first campaign

### Create a draft

1. Select **New campaign**.
2. Enter a clear campaign name and an optional description.
3. Choose a saved contact list.
4. Add one or more messages:
   - **Text Message** for plain text.
   - **Image** or **Image + Caption** for an image attachment.
   - **Document** or **Document + Caption** for a file attachment.
5. Use **Move up** and **Move down** to arrange the sending order.
6. Check the campaign summary and select **Save Draft**.

Caption message types require a caption. Image selection supports PNG, JPG, JPEG, WebP, and GIF; document selection includes PDF, Office files, TXT, CSV, and ZIP. Attachments are copied into the application's local campaign storage when saved.

Saving a draft does **not** send messages.

### Send or schedule

1. Open **Campaigns** and find your draft.
2. Select **Send**.
3. Choose **Send Now** or **Schedule Later**.
4. Confirm with **Add to sending queue** or **Schedule campaign**.
5. Open **Sending & schedule** to follow progress.

Queued campaigns start when WhatsApp is connected and the sender is free. The executor processes one campaign at a time and sends each recipient's messages in the configured order.

Start with a small test campaign to verify your contact list, message order, captions, and attachments before sending to a larger list.

### Edit, reuse, and delete

- **Edit** changes a draft's name, messages, attachments, and recipient list. Changing the selected contact import replaces its recipients when saved.
- **Reuse** opens an editable copy of a campaign. Save it as a new draft with your chosen recipient list; the original campaign and its history stay intact.
- **Delete campaign** removes a draft or a completed, failed, or cancelled campaign, including its associated history and stored media. Active campaigns must be cancelled before deletion.

## Scheduling and background operation

Scheduled times are interpreted in **Asia/Colombo**. Keep the application running, the computer awake, and WhatsApp connected for scheduled campaigns to send.

Scheduled campaigns are checked every 30 seconds and become queued when due. If the app was closed at their scheduled time, overdue campaigns are queued when the app next starts; they wait for a connected, available sender.

### Closing the window

Every close request offers three options:

| Option                   | What happens                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------- |
| **Keep sending in tray** | Hides the main window. The scheduler and sender continue running.                      |
| **Quit app**             | Stops sending, closes the managed WhatsApp browser, saves interrupted work, and exits. |
| **Keep app open**        | Cancels the close request.                                                             |

A running campaign triggers a warning before you quit. A message already being submitted may still go through; interrupted, uncertain messages are flagged for review. Interrupted running campaigns remain paused rather than restarting automatically.

Click the Outreach tray icon to reopen the window. Its context menu also provides **Open Outreach** and **Quit app…**. On Windows, the icon may be in the hidden-icons area of the taskbar.

Tray mode keeps the app running on your computer. It cannot send while the computer is asleep, shut down, or disconnected from the internet. If the system tray is unavailable, keep the main window open.

## Understand campaign results

| Status    | Meaning                                                             |
| --------- | ------------------------------------------------------------------- |
| Draft     | Saved and available for editing; not queued for delivery.           |
| Scheduled | Waiting for the scheduled time.                                     |
| Queued    | Waiting for a connected, available sender.                          |
| Running   | Currently processing recipients and messages.                       |
| Paused    | Stopped until you resume it or review interrupted work.             |
| Completed | Processing has finished; review the report for individual results.  |
| Failed    | Execution stopped with an error; review the report before retrying. |
| Cancelled | The campaign was stopped by the user.                               |

Open **Results & history** to view reports and export **Summary CSV** or **Detailed CSV** files. A message recorded as sent means it was submitted through WhatsApp Web; the application does not confirm recipient delivery or read receipts.

Retry actions preserve messages already recorded as sent. An **uncertain** message may have been submitted before an interruption, so retrying it can create a duplicate. Review uncertain results before confirming a retry.

### History filters and cleanup

- History views cover the **last 90 days**.
- Filter by day, week, month, or year using Asia/Colombo calendar dates. Weeks start on Monday.
- Month and year filters show only records within the retained 90-day viewing window.
- Select **Remove history older than 90 days** to permanently remove older completed, failed, and cancelled campaigns, including their reports and attachments.
- Cleanup is **manual**, and preserves drafts and active campaigns. It does not remove saved contact imports.

Export any reports you want to keep before deleting their campaigns or running history cleanup.

## Settings and sending speed

The **Sending speed** section controls randomized delays within your selected minimum and maximum ranges.

| Setting                                      | Default       |
| -------------------------------------------- | ------------- |
| Delay between messages to the same recipient | 7–10 seconds  |
| Delay between recipients                     | 10–18 seconds |
| Navigation timeout                           | 31 seconds    |
| Browser action timeout                       | 16 seconds    |
| Media upload timeout                         | 61 seconds    |

Select **Save Sender Settings** after making changes. The same-recipient message delay cannot be set below 7 seconds. Minimum and maximum values must form a valid range.

Connection timeouts are under **Advanced connection settings**. Database information is available under **Storage & diagnostics**. New users can leave these defaults unchanged.

## Local data and backups

The application uses Electron's user-data directory. With the current package name, its usual location is:

| Platform | Typical location                                           |
| -------- | ---------------------------------------------------------- |
| Windows  | `%APPDATA%\whatsapp-campaign-manager\`                     |
| macOS    | `~/Library/Application Support/whatsapp-campaign-manager/` |
| Linux    | `~/.config/whatsapp-campaign-manager/`                     |

The actual database path is printed in the launch terminal as `[Database] Path:`. Platform settings can change the usual directory location.

| Item                  | Contents                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| `campaign-manager.db` | Imports, contacts, campaigns, schedules, delivery records, and settings. |
| `campaign-media/`     | Copies of saved campaign attachments.                                    |
| `whatsapp-session/`   | The dedicated browser profile and WhatsApp login state.                  |

To back up your workspace:

1. Choose **Quit app**, allowing sending and database operations to stop.
2. Copy the entire user-data directory to your backup location.
3. To restore on the same environment, fully quit the app and restore that directory before relaunching.

Copying only the database does not include campaign attachments. Treat backups as private because they contain contact details and browser authentication data. A restored or migrated browser profile may require a fresh WhatsApp login; media paths stored in the database may also need attention if the user-data directory changes.

Local storage covers campaign and session data. Messages still travel through WhatsApp's service when sent.

## Troubleshooting

| Problem                                   | What to check                                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node` or `npm` is not recognized         | Install Node.js with npm and open a new terminal.                                                                                                       |
| PowerShell blocks `npm.ps1`               | Use `npm.cmd` as shown above; changing the execution policy is not needed.                                                                              |
| Dependency installation fails             | Check your internet connection and access to npm, Electron downloads, and the SheetJS CDN. Retry `npm ci` from the directory containing `package.json`. |
| Chrome or Edge cannot be found            | Install one in a standard location and restart the app. Portable browser locations are not automatically discovered.                                    |
| QR code is still required                 | Complete the phone-to-browser linking process, then wait for the connection status to update.                                                           |
| Campaign stays queued                     | Check that WhatsApp is connected, no other campaign is occupying the sender, and the app is still running.                                              |
| Scheduled time looks wrong                | The scheduler always uses Asia/Colombo, even if your computer uses a different timezone.                                                                |
| Sending stops after hiding the window     | Choose **Keep sending in tray** rather than Quit. Keep the source-launch terminal open, the computer awake, and the managed browser connected.          |
| Invalid phone numbers after Excel import  | Store phone cells as Text and preserve the leading zero or `94` country code. Only Sri Lankan number formats are accepted.                              |
| Attachment is missing                     | Check that the saved media files still exist in the user-data directory. Reattach the file in a draft if necessary.                                     |
| Message failed or is uncertain            | Open its report, reconnect WhatsApp if needed, and review the retry confirmation before resending.                                                      |
| Old history is not visible                | History views are limited to 90 days. Records outside that window remain stored until manually removed.                                                 |
| Launching again opens the existing window | The app uses a single-instance lock. Check the tray if the window was hidden.                                                                           |

For persistent problems, use **Help & feedback** in the app footer. Include the action you took, the error message, your operating system, and whether you are running from source or an installed package. Remove private contact and session data from shared screenshots or logs.

## Development and packaging

### Available commands

Use `npm.cmd` instead of `npm` on Windows PowerShell if script execution is blocked.

| Command             | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `npm start`         | Launch the Electron development application.                            |
| `npm run typecheck` | Check TypeScript, including unused-code checks.                         |
| `npm run lint`      | Check lint rules and formatting.                                        |
| `npm run lint:fix`  | Apply lint fixes and formatting changes.                                |
| `npm run package`   | Package the desktop application into `out/`.                            |
| `npm run make`      | Build the distributables configured in Electron Forge into `out/make/`. |

Run the checks before distributing a build:

```sh
npm run typecheck
npm run lint
npm run make
```

Configured makers include Windows Squirrel, macOS ZIP, Linux DEB, and Linux RPM. Build on the intended platform with the system tools required by its maker. Installers, signing, and publishing are not automatically provided by this repository; there is no configured release publisher.

Check native tray behavior and live WhatsApp automation on each target desktop before distribution, including sending a small campaign, scheduling, and closing to the tray.

### Project structure

```text
src/
  components/          Shared layout, tables, dialogs, and notifications
  db/                  SQLite initialization and migrations
  pages/               Overview, contacts, campaigns, scheduling, history, settings
  services/
    app/               Tray and application shutdown lifecycle
    campaigns/         Persistence, scheduler, and sending executor
    imports/           File parsing, number validation, and contact storage
    reports/           Report generation and CSV exports
    settings/          Sender configuration
    whatsapp/          Browser connection and WhatsApp Web automation
  types/               Shared types and renderer API declarations
  utils/               Display labels and history date filters
  main.ts              Electron main process and IPC handlers
  preload.ts           Renderer-to-main API bridge
  styles.css           Global application styling
forge.config.mts       Packaging configuration
```

The app is built with Electron, React, TypeScript, Vite, Tailwind CSS, Playwright Core, and Node's SQLite support. All application styling is maintained in `src/styles.css`.

## Maintainer

**Chamath Sachintha** — `chamathsachintha2002@gmail.com`

[![Contact the maintainer](https://img.shields.io/badge/Contact_the_maintainer-334155?style=for-the-badge&logo=gmail&logoColor=white)](mailto:chamathsachintha2002@gmail.com)

The package metadata declares the project license as **MIT**.
