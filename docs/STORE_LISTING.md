# Chrome Web Store listing draft

This is copy and asset guidance for Canvas Deadline Copilot version 1.0.0. It is a draft, not authorization to submit.

**Submission blockers:** Before using this copy publicly, resolve Instructure's manual-token/OAuth policy for multi-user applications and reconcile unencrypted <code>chrome.storage.local</code> token storage with current Chrome Web Store secure-handling requirements. Publish the privacy policy and complete the dashboard privacy disclosures and Limited Use certification. If the implementation changes to resolve either blocker, update every section below.

## Product name

Canvas Deadline Copilot

## Short description

Track Canvas deadlines, export calendar events, and receive optional Chrome reminders without a hosted backend.

The short description is under the Chrome Web Store limit and does not claim automatic synchronization.

## Detailed description

Canvas Deadline Copilot brings assignment deadlines from a Canvas LMS site into a compact Chrome popup.

After you configure an HTTPS Canvas site and credential, assignments sync only when you choose **Sync assignments**. The extension shows published assignments from active courses, keeps the latest validated snapshot locally, and lets you search by assignment name or filter by course and deadline status.

Optional browser reminders can be scheduled for 7 days, 24 hours, 2 hours, or 30 minutes before future due dates. Reminders are reconstructed from the local cache after Chrome or the extension restarts. Delivery is best effort and depends on Chrome, your device, and operating-system notification settings.

For calendar planning, you can download one assignment or the visible dated assignments as an ICS file. You can also explicitly open a prefilled Google Calendar event for one assignment. Canvas Deadline Copilot does not connect to a calendar account or automatically synchronize calendar changes.

The settings page shows connection and reminder status plus non-sensitive diagnostics. Separate confirmed actions let you clear cached assignments or clear the saved Canvas URL and API token. Clearing credentials keeps the cached assignment snapshot and reminder state until you clear or disable them separately.

Canvas requests go directly from the extension to the exact HTTPS Canvas origin you authorize. Extension state is stored in the current Chrome profile. There is no developer-operated runtime backend, analytics, advertising, or telemetry. See the privacy disclosure and policy for storage, notification, Google Calendar, and data-retention details.

Canvas Deadline Copilot does not read assignment submission/completion status and does not sync Canvas automatically. It is an independent project and is not affiliated with or endorsed by Instructure or Google.

## Single-purpose statement

Canvas Deadline Copilot's single purpose is to help a user review assignment deadlines manually fetched from the Canvas site they configure and take deadline-related actions through optional local reminders and user-initiated calendar exports.

## Permission justifications

### storage

Stores the user-configured Canvas HTTPS origin and API token, validated assignment cache, reminder preferences, and reminder delivery records in <code>chrome.storage.local</code> so the popup and event-driven service worker can work across browser sessions. The extension does not use <code>chrome.storage.sync</code>. The token is local but is not application-level encrypted by the extension.

### alarms

Schedules deadline reminder events for the windows selected by the user and reconstructs missing reminder alarms after Chrome starts, the extension updates, or relevant local state changes. Alarms are derived from the latest manually synced cache; they do not perform background Canvas sync.

### notifications

Displays deadline reminders only after the user enables reminders. A notification contains the assignment name, course name, localized due time, and selected reminder-window label.

### Optional host access: https://*/*

Canvas sites can use institution-specific and self-hosted HTTPS domains that are unknown at build time, so the manifest declares a broad HTTPS pattern as optional. The extension does not receive access to all HTTPS sites at installation. When the user tests or syncs a Canvas URL, it requests permission only for that exact normalized HTTPS origin. Canvas API pagination, responses, and assignment links are constrained to the configured origin. Changing or clearing the saved origin triggers best-effort permission revocation.

## Privacy disclosure text

Canvas Deadline Copilot handles authentication information and Canvas course/assignment content to provide its single deadline-management purpose.

The Canvas site URL, API token, assignment snapshot, reminder settings, and reminder delivery state are stored in the current Chrome profile using <code>chrome.storage.local</code>. The extension does not add application-level encryption to that storage. The publisher does not receive this data, and the released extension has no analytics, advertising, telemetry, or developer-operated runtime backend.

When the user tests a connection or manually syncs, the API token is sent in an HTTPS authorization header directly to the exact Canvas origin the user authorized. The token is not placed in UI diagnostics, notifications, calendar payloads, runtime messages, or application logs.

When the user explicitly chooses **Add to Google Calendar**, the browser opens a Google HTTPS template URL containing prefilled assignment details. Google can receive and associate those details with the active Google account. ICS files are generated locally, but downloaded files can later be handled by the browser, operating system, backup services, or calendar application selected by the user.

Chrome notifications can show assignment name, course, due time, and reminder window on a desktop, shared screen, notification history, or lock screen, depending on browser and operating-system settings.

Clearing cached assignments removes only the assignment snapshot and reconciles future extension reminder alarms. Clearing saved Canvas credentials removes only the saved URL and token and makes a best-effort host-permission revocation; it retains the assignment cache, reminder settings/history, and alarms. Users must clear the cache or disable reminders separately to stop reminders based on retained cached assignments. Removing local extension data does not revoke the token at Canvas or retract data already sent to Canvas or Google.

The extension does not sell user data, use it for advertising or credit decisions, or allow the publisher to read it. Data is used only for the extension's disclosed deadline-management features and related security/reliability behavior.

## Privacy practices dashboard review

The publisher must answer the live dashboard questionnaire using its current definitions. At minimum, review:

- authentication information, because the extension stores and transmits a Canvas API token;
- personally identifiable information, because a connection test handles the Canvas profile response in memory;
- website content, because course names, assignment names, due dates, points, and links are cached and displayed;
- whether any current dashboard category applies to configured Canvas origins or user-opened links;
- the Limited Use certification; and
- the exact local storage, Canvas transmission, Google Calendar handoff, notification, and retention disclosures.

Do not select “does not handle user data” solely because the publisher does not receive it or because processing is local.

## Privacy policy URL

**Publisher action required:** Host <code>docs/PRIVACY.md</code> at a stable public HTTPS URL, verify it while signed out, and enter that URL in the Chrome Web Store Developer Dashboard. Replace this instruction with the final URL before submission.

## Screenshot checklist

Chrome currently requires at least one screenshot and permits up to five. Use 1280×800 pixels where practical; 640×400 is an allowed alternative under the official [image guidance](https://developer.chrome.com/docs/webstore/images/). Recheck the requirements immediately before upload.

Recommended screenshot set:

1. First-run popup with the setup explanation and **Set up Canvas** action.
2. Populated synthetic dashboard showing search, course/status filters, text status labels, last sync time, and calendar actions.
3. A meaningful empty state, such as no active-filter results with **Clear filters**, or assignments without due dates.
4. Settings overview showing connection state, reminder enabled state/windows, and diagnostics. Keep the token replacement field completely empty.
5. Stored-data controls or a partial-sync warning using synthetic content.

For every screenshot:

- Use a clean Chrome profile and synthetic institution, course, assignment, and time data.
- Show no real token, masked credential length, user/profile name, email, school hostname, course/assignment content, browser bookmark, notification, file path, or other personal data. All visible course and assignment content must be synthetic.
- Capture the shipping version and current branding; do not use a mockup that differs from the extension.
- Use square corners and full-bleed formatting with no padding, distortion, blur, or excessive text.
- Avoid implying automatic sync, submission tracking, guaranteed reminder delivery, or calendar-account integration.
- Check readability after Chrome downscales the image.
- Verify keyboard focus is not accidentally captured in a confusing location.

## Promotional image checklist

- [ ] Provide the 128×128 extension/store icon from the release.
- [ ] Verify the icon follows current Chrome safe-padding guidance and remains legible at small sizes.
- [ ] Create the required 440×280 PNG or JPEG small promotional tile.
- [ ] Decide whether to create the optional 1400×560 marquee image.
- [ ] Use consistent colors and typography across the icon, screenshots, and promotional art.
- [ ] Use simple, full-bleed artwork that remains understandable at half size.
- [ ] Do not reuse a screenshot as the promotional tile.
- [ ] Do not use unlicensed Canvas, Instructure, Chrome, or Google artwork or imply endorsement.
- [ ] Do not add rankings, awards, guarantees, user counts, or features that cannot be substantiated.
- [ ] Recheck the official [Chrome Web Store listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/) and [image requirements](https://developer.chrome.com/docs/webstore/images/) before submission.

## Support and contact text

**Publisher confirmation required before submission:** Confirm that the repository issue tracker is public, monitored, and appropriate for end-user support. If not, replace the URL below.

Proposed public support copy:

> For setup help, bug reports, and feature feedback, visit https://github.com/Zepronex/canvas-assignment-scheduler/issues. Never include a Canvas API token, personal Canvas data, screenshots containing credentials, or private institution information in an issue.

The publisher must also add a monitored private security-reporting channel before submission. Do not direct unpatched vulnerability details or sensitive data to a public issue.

## Release notes for version 1.0.0

Initial release of Canvas Deadline Copilot:

- Manually sync published assignments from active courses on a user-configured HTTPS Canvas site.
- Search and filter a locally cached deadline dashboard by course and overdue, today, upcoming, or no-date status.
- Preserve assignments from successful courses during a partial sync.
- Opt into Chrome reminders at 7 days, 24 hours, 2 hours, or 30 minutes before future deadlines.
- Reconstruct reminder alarms after browser or extension lifecycle changes.
- Export individual or visible dated assignments as ICS files.
- Explicitly open prefilled Google Calendar event templates without Google OAuth or automatic calendar synchronization.
- Review non-sensitive connection, cache, sync, and reminder diagnostics.
- Separately clear cached assignments or saved Canvas credentials with confirmation.
- Recover safely from malformed local data and background-message failures.
- Restrict Canvas requests and external assignment links to validated HTTPS destinations.

## Claims that must not appear

Do not describe version 1.0.0 as providing:

- automatic or scheduled Canvas sync;
- automatic Google Calendar, Outlook, or Apple Calendar synchronization;
- email reminders;
- Google OAuth or Canvas OAuth;
- submission, completion, or grading-state tracking;
- a hosted service, cloud backup, cross-device sync, or encrypted token vault;
- guaranteed or real-time reminder delivery;
- support for every Canvas institution or browser; or
- affiliation with or endorsement by Instructure, Canvas, Google, or Chrome.
