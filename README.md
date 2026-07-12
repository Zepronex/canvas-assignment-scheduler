# Canvas Deadline Copilot

Canvas Deadline Copilot is a compact Chrome extension for reviewing assignment deadlines from a user-configured Canvas LMS site. It manually syncs published assignments, keeps a validated local cache, offers optional browser reminders, and provides user-initiated calendar exports.

The extension has no hosted runtime backend, analytics, advertising, or automatic calendar integration. Canvas and Google Calendar are separate services with their own terms and privacy practices. This project is independent and is not affiliated with or endorsed by Instructure or Google.

The Chrome Web Store release is built only from <code>extension/</code>. The repository's legacy <code>frontend/</code>, <code>backend/</code>, and development files are not part of the packaged extension.

## Key features

- Manual assignment sync from active Canvas courses over HTTPS.
- Local deadline dashboard with assignment-name search, course filtering, and overdue, today, upcoming, and no-date views.
- Resilient partial syncs that preserve assignments from courses that succeeded.
- Optional Chrome notifications at 7 days, 24 hours, 2 hours, or 30 minutes before a deadline.
- Reminder reconstruction after Chrome starts, the extension updates, or relevant local data changes.
- Individual or bulk ICS downloads for assignments with valid due dates.
- Explicit per-assignment Google Calendar template links.
- Non-sensitive diagnostics for connection state, reminder settings, last successful sync, cache size, scheduled alarms, and partial-sync warnings.
- Separately confirmed controls for clearing cached assignments or saved Canvas credentials.
- Safe fallbacks for invalid settings, malformed cache data, unavailable background messaging, and Chrome API failures.

## Architecture

Canvas Deadline Copilot is a Manifest V3 extension with three built entry points:

| Component | Responsibility |
| --- | --- |
| Popup | Reads the local cache, starts a manual Canvas sync, filters assignments, and starts calendar actions. |
| Options page | Configures the Canvas origin and token, tests the connection, manages reminders, shows diagnostics, and exposes local data controls. |
| Canvas API client | Performs validated, paginated HTTPS requests directly to the exact Canvas origin authorized by the user. |
| Local storage | Stores the Canvas connection, assignment snapshot, reminder preferences, and reminder delivery state in <code>chrome.storage.local</code>. |
| Background service worker | Reconciles reminder alarms and handles notification delivery and clicks; it does not sync Canvas in the background. |
| Calendar helpers | Generate local RFC 5545 ICS files or an explicit Google Calendar template URL without calendar-account permissions. |

After a successful manual sync, the popup writes the validated cache and sends a data-free update signal. The service worker also observes the cache change and reconstructs the required Chrome alarms. Assignment data is read from local storage rather than copied into runtime messages.

See [Architecture](docs/ARCHITECTURE.md) for component boundaries, storage keys, reminder reconstruction, calendar flows, and a message-flow diagram.

## Technology stack

- Chrome Extensions Manifest V3
- React 18 and TypeScript
- Vite 6
- Chrome storage, permissions, alarms, and notifications APIs
- Node.js 22 in CI
- pnpm 10
- Node's built-in test runner with mocked Chrome APIs

## Local development

Prerequisites:

- A current Chrome or Chromium-based browser with Manifest V3 support
- Node.js 22
- pnpm 10
- System <code>zip</code> and <code>unzip</code> commands when creating the release archive

Install the extension dependencies:

~~~bash
cd extension
pnpm install --frozen-lockfile
~~~

Build the extension:

~~~bash
pnpm build
~~~

Vite also provides <code>pnpm dev</code> for isolated UI work. A normal Vite browser tab does not provide all Chrome extension APIs, so final behavior must be tested as a loaded unpacked extension.

## Build and load unpacked

1. From <code>extension/</code>, run <code>pnpm build</code>.
2. Open <code>chrome://extensions</code>.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the generated <code>extension/dist</code> directory.
6. After another build, use the extension card's **Reload** action before retesting.

The production build contains the popup, options page, background worker, manifest, icons, and generated JavaScript/CSS assets. Source maps are disabled.

To build and create the versioned release archive:

~~~bash
cd extension
pnpm package
~~~

For version 1.0.0, the artifact is written to <code>extension/release/canvas-deadline-copilot-1.0.0.zip</code>. The packaging script validates the build, rejects source maps and unexpected files, stages only built extension assets, and verifies the ZIP file list. Generated <code>dist/</code> and <code>release/</code> output is ignored by Git.

## Configure Canvas

### Before creating a token

An API token is equivalent to a credential and inherits the access granted by Canvas. Keep it private, use an expiration date where available, and revoke it from Canvas if the device or token might be compromised.

Institutional settings differ. Some institutions disable manually generated tokens or impose additional rules. Instructure's current [OAuth2 guidance](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth) describes manual token generation as a testing mechanism and states that multi-user applications must use OAuth. A publisher must resolve that policy requirement before public distribution. The steps below are for a user configuring a local build where their institution permits a manually generated token.

### Create and save a Canvas API token

1. Sign in to the Canvas site that contains the assignments.
2. Open the account or profile settings page.
3. Find **Approved Integrations** or the institution's equivalent access-token section.
4. Choose **New Access Token**, give it a recognizable purpose, and select an appropriate expiration date if offered.
5. Generate the token and copy it immediately. Canvas may not show it again.
6. Open Canvas Deadline Copilot's settings page.
7. Enter the HTTPS origin of the same Canvas site and paste the token into the password-style replacement field.
8. Save the settings, then choose **Test connection**.
9. Return to the popup and choose **Sync assignments**.

Never place a token in source code, terminal output, screenshots, documentation, bug reports, or chat messages. The options page does not repopulate a saved token; leaving the replacement field blank keeps the existing token only when the saved Canvas origin is unchanged.

## Reminder behavior

Reminders are off by default. A user can enable any combination of 7 days, 24 hours, 2 hours, and 30 minutes. At least one window must be selected while reminders are enabled.

Reminder alarms are derived from the latest validated local assignment cache. Only published assignments with valid future due dates are eligible. Overdue assignments, assignments without a due date, and reminder times that have already passed do not create catch-up notifications.

Chrome alarms are reconciled when the service worker loads, Chrome starts, the extension is installed or updated, assignments are synced, the cache changes, or reminder settings change. This reconstruction reduces missed reminders after a restart or update, but delivery remains best effort: Chrome, operating-system notification settings, sleep, shutdown, and device availability can delay or suppress a notification.

A notification contains the assignment name, course name, due time, and reminder-window label. This information may be visible on a lock screen or shared display. Clicking a reminder opens only a validated HTTPS Canvas assignment URL when one is available.

There is no scheduled background Canvas sync. Reminders continue to use the last cached snapshot until the user syncs again or clears the cache.

## Calendar export behavior

Calendar actions are always initiated by the user and require a valid due date:

- **Export ICS** downloads one assignment as a local calendar file.
- **Export visible ICS** downloads the currently visible dated assignments as one file.
- **Add to Google Calendar** opens a prefilled HTTPS Google Calendar template for one assignment in a new tab.

Each generated event lasts one hour and can contain the assignment name, course name, points, due time, and a sanitized Canvas link. Calendar timestamps are emitted in UTC so the importing calendar can display them in its configured timezone.

ICS generation happens locally and requires no Chrome downloads permission. Activating the Google Calendar link sends the prefilled event details to Google. The extension does not use Google OAuth, call the Google Calendar API, read any calendar, or automatically synchronize later Canvas changes. Exporting again creates another handoff; it does not update an earlier calendar event.

## Privacy and security model

- The Canvas origin, API token, assignment cache, reminder settings, and reminder delivery state are stored in extension-scoped <code>chrome.storage.local</code>.
- Canvas Deadline Copilot does not add application-level encryption to that storage. It must not be described as an encrypted credential vault.
- The token is used only in an HTTPS authorization header sent directly to the configured Canvas origin. It is not included in diagnostics, notifications, calendar payloads, runtime messages, or application logs.
- Canvas pagination, final responses, assignment links, notification links, and cached links are required to remain HTTPS and on the configured Canvas origin where applicable.
- The extension has no operational backend, analytics SDK, telemetry, advertising, or remote hosted code.
- Google receives assignment details only when the user explicitly opens a Google Calendar template URL.
- Chrome and the operating system control notification visibility and history.

The options page provides two distinct actions:

- **Clear cached assignments** removes the assignment snapshot only. It keeps credentials and reminder settings. The service worker then reconciles future reminder alarms toward an empty schedule.
- **Clear saved Canvas credentials** removes the saved Canvas URL and API token and makes a best-effort attempt to revoke that origin's Chrome permission. It deliberately retains the assignment cache, reminder settings, reminder history, and existing alarms. Cached reminders can therefore still fire until reminders are disabled or the cache is cleared separately.

Changing the saved Canvas origin or token clears the old assignment cache. Changing the origin also makes a best-effort attempt to revoke the previous host permission. Chrome's extension site-access UI should be reviewed if revocation fails or if access was granted while testing unsaved settings.

Removing the extension normally removes its extension-scoped local state and permissions, but it does not revoke the underlying token at Canvas, delete downloaded ICS files, or retract information already sent to Canvas or Google.

Read the complete [Privacy and data handling](docs/PRIVACY.md) document before packaging or publishing.

## Permissions

| Manifest entry | Why it is needed |
| --- | --- |
| <code>storage</code> | Keeps the Canvas connection, validated assignment cache, reminder configuration, and delivery state available across popup and service-worker lifetimes. |
| <code>alarms</code> | Schedules and reconstructs deadline reminder events while the popup is closed. |
| <code>notifications</code> | Shows deadline notifications after the user opts into reminders. |
| Optional <code>https://*/*</code> host pattern | Canvas can be hosted on institution-specific and self-hosted HTTPS domains that are unknown at build time. The broad pattern is declared as optional; the extension requests only the exact normalized Canvas origin when the user tests or syncs it. |

The extension does not request <code>tabs</code>, <code>downloads</code>, browsing-history, cookies, identity, or broad required host access. Creating a user-selected tab does not require the <code>tabs</code> permission, and ICS downloads use a temporary local blob link.

## Testing

From <code>extension/</code>:

~~~bash
pnpm test
pnpm typecheck
pnpm build
pnpm package
~~~

From the repository root:

~~~bash
git diff --check
~~~

The automated suite covers assignment classification and DST boundaries, Canvas URL/API validation and partial syncs, calendar generation, malformed settings and cache recovery, reminder reconciliation and delivery behavior, diagnostics, clearing actions, safe error messages, and background-message fallbacks. Tests use synthetic data and mocked Chrome APIs.

GitHub Actions runs dependency installation with the pnpm cache, tests, typechecking, and the production build for pushes and pull requests.

## Known limitations

- Canvas sync is manual. There is no scheduled or push-based Canvas refresh.
- The extension reads assignment metadata but does not fetch submission, completion, or grading state. A submitted assignment can still appear overdue.
- Only published assignments from active, accessible courses are shown. Institution permissions and Canvas API behavior can limit results.
- Reminder accuracy depends on the last manual sync and Chrome/operating-system scheduling.
- Reminder windows already missed are not delivered retroactively.
- Clearing credentials does not clear the cache or stop cached reminders; use the separate cache or reminder controls.
- Calendar export is a snapshot. There is no automatic Google Calendar, Outlook, or Apple Calendar synchronization.
- ICS events use a fixed one-hour duration.
- A manually generated Canvas token may be unavailable or unsuitable for public distribution under institutional or Instructure policy.
- The stored token is local but is not application-level encrypted by this extension.
- Version 1.0.0 targets Chrome Manifest V3; other browsers are not a supported release target.

## Release roadmap

1. **Version 1.0.0 release candidate:** onboarding, manual sync, local filtering/cache, reminders, calendar export, diagnostics, data controls, reliability hardening, accessibility checks, CI, and deterministic packaging.
2. **Before Chrome Web Store submission:** complete [the release checklist](docs/RELEASE_CHECKLIST.md), publish a stable privacy-policy URL, reconcile credential storage with current Chrome Web Store secure-handling requirements, and resolve Instructure's manual-token/OAuth policy for public distribution.
3. **After an approved release:** prioritize security updates, Chrome compatibility, accessibility, and reliability based on verified user feedback. No future integration is promised.

## Project documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Privacy and data handling](docs/PRIVACY.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Chrome Web Store listing draft](docs/STORE_LISTING.md)

## License

MIT. See [LICENSE](LICENSE).
