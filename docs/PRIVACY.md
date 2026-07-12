# Canvas Deadline Copilot privacy and data handling

This document describes version 1.0.0 of the Canvas Deadline Copilot Chrome extension. It is an implementation-focused privacy disclosure, not a promise that data never leaves the browser. The extension sends data to the user's Canvas site to perform requested connection tests and assignment syncs, and it sends assignment details to Google when the user explicitly opens a prefilled Google Calendar event.

## Summary

- Canvas credentials and extension state are stored in the current Chrome profile using `chrome.storage.local`.
- Chrome local extension storage is local but not application-level encrypted by Canvas Deadline Copilot.
- Canvas API requests go directly from the extension to the exact HTTPS Canvas origin authorized by the user.
- The extension has no operational backend, analytics, telemetry, advertising, or application logging.
- Browser notifications can expose assignment information on the desktop or lock screen.
- ICS export creates a local download. Google Calendar export is an explicit handoff to Google and is not local-only.

## Data the extension handles

### Canvas credentials

The extension stores:

- the HTTPS origin of the user's Canvas site; and
- the Canvas API token entered by the user.

The API token is stored as entered, apart from surrounding whitespace removal. It is not hashed or encrypted by the extension because it must be available to authenticate direct Canvas API requests. The token is used only as a bearer credential in the HTTPS `Authorization` header sent to the configured Canvas origin. It is not included in assignment links, notifications, calendar exports, diagnostics, runtime messages, or application logs.

The options page does not repopulate or display a saved token. A separate password-style field accepts a replacement token. Keeping the replacement field blank retains the existing token only when the saved Canvas origin is unchanged. These UI controls reduce accidental on-screen exposure but do not encrypt the stored value.

### Canvas profile, courses, and assignments

A connection test requests and validates the current Canvas user profile in memory. The extension shows whether the connection succeeded but does not display the returned profile name or persist the profile or email as a separate record.

An assignment sync reads active-course and assignment data. The persisted cache can include:

- Canvas course IDs, names, course codes, workflow state, and access restrictions;
- assignment IDs, course IDs and names, assignment names, due dates, points, workflow state, update timestamps, and HTTPS Canvas assignment links;
- the last successful sync time; and
- the number of courses that failed during the latest usable partial sync.

The popup uses this cache for local filtering, status classification, display, reminders, diagnostics, and calendar export.

### Assignment notes

The local storage schema supports a map of assignment IDs to user-entered note text. The current popup does not expose note editing, but data created by an earlier or development build can remain under the `assignmentNotes` storage key until extension data is cleared or the extension is removed.

### Reminder data

The extension stores whether reminders are enabled, the selected reminder windows, and reminder delivery history. A delivery record contains a deterministic alarm identifier, delivery timestamp, and an optional sanitized HTTPS Canvas assignment URL used for notification-click routing.

Chrome also stores scheduled alarm metadata for the extension. Alarm identifiers encode numeric course and assignment IDs, the selected window, and the assignment due timestamp.

### Diagnostics

Diagnostics are derived from the validated local cache and Chrome alarms. They contain only the last successful sync time, number of cached assignments, number of scheduled reminder alarms, and the latest partial-sync warning. They do not include the Canvas API token.

## Where data goes

### The user's Canvas site

When the user tests a connection or syncs assignments, the extension sends HTTPS requests directly to the configured Canvas origin. Requests can include the API token in the authorization header and Canvas API path/query parameters. Canvas returns the profile, courses, assignments, and pagination metadata needed for the requested action.

Canvas Deadline Copilot does not proxy these requests through a developer-operated service. The Canvas institution processes the requests and returned data under its own policies.

### Google Calendar

When the user selects **Add to Google Calendar**, the extension opens a URL at `https://calendar.google.com/calendar/render`. Its query string contains a prefilled event title, start and end time, assignment name, course name, points when available, and a sanitized Canvas assignment link when valid.

Opening that link sends those details to Google and may associate them with the Google account active in the browser. Google's privacy terms and account settings then apply. The extension does not use Google OAuth, call the Google Calendar API, read a Google calendar, or automatically synchronize events.

### Local ICS downloads

When the user exports ICS, the extension generates the calendar file in memory and starts a browser download using a temporary blob URL. The file can contain assignment and course names, points, due/update timestamps, a deterministic event identifier containing numeric Canvas IDs, and a sanitized Canvas assignment link.

The extension itself does not upload the ICS file. After download, the file is outside extension storage and may be handled by the browser, operating system, backup software, cloud-synced download folders, or whichever calendar application the user opens it with.

### Canvas assignment links

Opening an assignment from the popup or clicking a reminder notification opens a validated HTTPS Canvas URL in a browser tab. The destination Canvas site receives an ordinary navigation request. External links opened from extension pages use `noopener` and `noreferrer` where applicable.

## Notifications and lock-screen exposure

When reminders are enabled, a Chrome notification displays:

- the assignment name;
- the course name;
- the localized due date and time; and
- the configured reminder-window label.

Chrome and the operating system control where notifications appear. Depending on device settings, this information can be visible in notification history, banners, shared-screen presentations, or on the lock screen without unlocking the device. Users who do not want that exposure should leave reminders disabled or configure Chrome/operating-system notification privacy settings.

The visible notification does not include the API token. Notification click routing uses the locally stored sanitized HTTPS assignment URL and then makes a best-effort attempt to clear the notification.

## Permissions

The extension requests these required Chrome permissions:

| Permission | Purpose |
| --- | --- |
| `storage` | Store Canvas credentials, assignment cache, note data, reminder settings, and delivery history in `chrome.storage.local`. |
| `alarms` | Schedule and reconstruct deadline reminder events while the popup is closed. |
| `notifications` | Display user-enabled deadline reminders. |

The manifest declares `https://*/*` as an **optional** host-permission pattern because Canvas can be hosted on institution-specific or self-hosted domains that are not known at release time. The extension does not request access to every HTTPS site at install time. When the user tests or syncs a Canvas URL, it asks Chrome for only `${configuredCanvasOrigin}/*`. API pagination and assignment links are rejected if they leave the configured Canvas origin.

The extension does not request `tabs`, `downloads`, browsing-history, cookies, identity, or broad required host permissions. Creating a new tab for a user-selected link does not require the `tabs` permission, and ICS downloads use a local blob link rather than the `downloads` API.

## Security controls

- Canvas origins and externally opened assignment links must use HTTPS and cannot contain embedded URL usernames or passwords.
- Canvas API pagination, final response URLs, and assignment links must remain on the configured Canvas origin.
- Stored data is validated before use; corrupted values fall back to safe defaults and are removed or sanitized on a best-effort basis.
- Unsafe cached links are not rendered or placed in notifications and calendar payloads.
- Expected error messages are concise and do not include request headers, response bodies, or the API token.
- The service worker revalidates reminder settings, delivery history, assignment identity, publication state, and due time before displaying a notification.

These controls reduce accidental disclosure but do not protect against a compromised browser profile, operating system, Chrome installation, Canvas site, or device account.

## Retention and user controls

Chrome local extension storage persists across browser restarts and extension updates. Data remains until it is replaced, cleared through the available controls, removed as corrupted data, cleared through Chrome/profile controls, or removed with the extension. Downloaded files and data already handed to another service are outside these controls.

The options page provides two separately confirmed actions:

- **Clear cached assignments** removes only `assignmentCache`. It keeps Canvas credentials, assignment notes, reminder settings, and reminder delivery history. Removing the cache triggers service-worker reconciliation toward no future extension reminder alarms because there are no cached assignments to schedule. A Chrome API failure can delay alarm removal until a later rebuild. Clearing the cache does not remove a notification already displayed by Chrome.
- **Clear saved Canvas credentials** removes only the saved Canvas URL and API token. It keeps the assignment cache, assignment notes, reminder settings, reminder delivery history, and scheduled reminder alarms. The popup stops displaying cached assignments until credentials are configured again, but reminders based on the retained cache can still be delivered. To stop them, disable reminders or clear cached assignments as well.

After credentials are cleared, the options page makes a best-effort request to revoke Chrome access to the saved Canvas origin. It similarly attempts to revoke the previous origin when the saved Canvas origin changes. If Chrome cannot remove access, the page tells the user to review the extension's site-access settings. An origin granted while testing unsaved credentials can also remain until the user removes it through Chrome or removes the extension.

Other retention rules are:

- A successful or usable partial sync replaces the assignment cache. A failed sync preserves the last successful cache. Changing the saved origin or token clears the old cache before the new credentials are saved.
- Assignment notes are not removed by either settings-page clearing action. The current popup has no note-management UI; removing all extension data through Chrome or uninstalling the extension is the available way to remove legacy note data from the installed extension.
- Reminder settings remain until changed or all extension data is removed.
- Reminder delivery history is pruned when another reminder is recorded. At that point, entries older than approximately 90 days are dropped and the history is capped at 2,000 records including the new delivery. There is no separate delivery-history clearing button.
- Scheduled Chrome alarms are reconstructed from the retained cache, reminder settings, and delivery history whenever the service worker starts and on relevant storage changes.

Removing the extension normally removes its extension-scoped local storage, alarms, and granted extension permissions from that Chrome profile. It does not revoke the underlying token at Canvas, remove downloaded ICS files, retract data sent to Google, or delete calendar events the user chose to save.

## No developer data collection

The released extension code contains no analytics SDK, telemetry endpoint, advertising integration, or application logging. It does not send credentials, assignments, diagnostics, or usage data to the project's maintainers. It does not call the repository's legacy backend.

Chrome, the operating system, Canvas, Google Calendar, and any calendar application used for an exported ICS file are separate products and can process data independently under their own policies.

## Limitations and user responsibilities

- `chrome.storage.local` is extension-scoped local storage, not a secure password vault and not application-level encrypted by this extension.
- Anyone who can inspect the unlocked Chrome profile, the device, or a compromised extension/browser environment may be able to access stored data.
- A Canvas token has the access granted by Canvas. Users should create it through their institution's Canvas settings, keep it private, and revoke it in Canvas if they suspect exposure.
- Assignment data is a cached snapshot from the last manual sync. It can be stale until the user syncs again.
- Reminder delivery depends on Chrome, the operating system, device sleep state, notification settings, the last validated cache, and future scheduled alarm times. The extension cannot guarantee exact delivery.
- Clearing extension storage cannot retract data already sent to Canvas or Google, remove events a user saved in Google Calendar, delete downloaded ICS files, or clear Canvas/Google/browser records.
- Uninstalling or clearing the extension's local data does not remove the underlying Canvas API token from Canvas. Token revocation must be performed in Canvas.

Users should review their institution's Canvas policies, Google's privacy terms before using the Google Calendar handoff, and Chrome/operating-system notification settings before enabling reminders.
