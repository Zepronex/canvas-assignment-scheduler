# Canvas Deadline Copilot release checklist

Use this checklist for version 1.0.0 and adapt it for later releases. It is intentionally stricter than “the build succeeds.” Do not submit the extension to the Chrome Web Store until every blocking policy, security, privacy, artifact, and publisher item is resolved.

## Blocking policy and security decisions

- [ ] **Resolve the Canvas authentication-policy blocker.** Instructure's current [OAuth2 guidance](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth) describes manually generated access tokens as a testing mechanism, says asking another user to generate and enter one violates Canvas API Policy, and states that multi-user applications must use OAuth. Obtain a documented policy determination or approval from Instructure and affected institutions, or revise the authentication/distribution plan before public submission.
- [ ] **Reconcile token storage with Chrome Web Store secure-handling requirements.** Version 1.0.0 stores the Canvas API token in <code>chrome.storage.local</code> without application-level encryption. Review the current [Chrome Web Store user-data and secure-handling rules](https://developer.chrome.com/docs/webstore/user_data) and obtain an explicit compliance/security determination. Do not imply that the token is encrypted.
- [ ] Confirm the extension's in-product credential disclosure and consent flow satisfy current Chrome Web Store disclosure requirements before the token is stored.
- [ ] Confirm the publisher has the right to distribute the extension name, icon, screenshots, promotional artwork, and all referenced trademarks. Keep the independent, non-affiliation wording.
- [ ] Record the decision and reviewer for each blocker in the release ticket.

## Scope and source control

- [ ] Confirm the release contains no email reminders, hosted backend, automatic calendar synchronization, submission/completion fetching, or other unsupported feature claim.
- [ ] Confirm the release scope is <code>extension/</code>; the legacy <code>frontend/</code>, <code>backend/</code>, <code>.temp/</code>, repository docs, and development dependencies must not enter the ZIP.
- [ ] Review all commits intended for the release and confirm they are logical, professional, and limited to Day 7 hardening/release work.
- [ ] Confirm no unrelated user work was overwritten.
- [ ] Confirm generated <code>extension/dist/</code>, <code>extension/.test-build/</code>, and <code>extension/release/</code> output is ignored by Git.
- [ ] Finish with <code>git status --short</code> showing a clean worktree.

## Manifest and release metadata

- [ ] Confirm <code>extension/public/manifest.json</code> and <code>extension/package.json</code> both use version <code>1.0.0</code>.
- [ ] Confirm the manifest name is **Canvas Deadline Copilot** and its description accurately matches the store listing.
- [ ] Confirm 16, 32, 48, and 128 pixel PNG icons exist, have the correct dimensions, and are declared for the extension and action.
- [ ] Visually inspect every icon at native size for legibility, transparency artifacts, and adequate contrast.
- [ ] Review the official [Chrome Web Store image guidance](https://developer.chrome.com/docs/webstore/images/) and confirm the 128 pixel store icon has appropriate transparent safe padding. The current artwork should not be assumed compliant without this visual check.
- [ ] Confirm the service worker, popup, options page, and icon paths in the built manifest resolve.
- [ ] Confirm production source maps remain disabled.

## Permissions and external destinations

- [ ] Confirm required permissions are limited to <code>storage</code>, <code>alarms</code>, and <code>notifications</code>.
- [ ] Confirm there are no required host permissions.
- [ ] Confirm <code>https://*/*</code> remains an optional declaration solely to support institution-specific Canvas domains.
- [ ] In a clean profile, verify Chrome requests only the exact normalized Canvas origin when testing or syncing.
- [ ] Verify changing the saved Canvas origin attempts to revoke the old origin and reports a safe fallback when Chrome cannot revoke it.
- [ ] Verify clearing credentials attempts to revoke the saved origin and tells the user to review Chrome site access if revocation fails.
- [ ] Check Chrome's site-access UI for permissions granted while testing unsaved settings; verify the documentation explains that these may require manual removal.
- [ ] Confirm Canvas API requests, response URLs, pagination links, and API-returned assignment links reject HTTP, embedded URL credentials, and cross-origin destinations. Confirm popup, calendar, and notification-click links reject non-HTTPS or credential-bearing URLs.
- [ ] Confirm the only non-Canvas calendar destination is the fixed HTTPS Google Calendar template endpoint.
- [ ] Confirm external anchors use safe new-tab behavior and no remotely hosted executable code is loaded.

## Privacy and Chrome Web Store declarations

- [ ] Publish <code>docs/PRIVACY.md</code> at a stable, public HTTPS URL controlled or approved by the publisher.
- [ ] Open that URL in a signed-out browser and confirm it is accessible without repository or account access.
- [ ] Enter the public privacy-policy URL in the Chrome Web Store Developer Dashboard. Do not submit a local path, draft-only URL, or placeholder.
- [ ] Ensure the privacy policy, store description, in-product disclosure, and dashboard answers describe the same implementation.
- [ ] In the dashboard privacy fields, evaluate at minimum authentication information, Canvas profile information handled during connection tests, and course/assignment website content. Use the dashboard's current definitions rather than assuming local-only processing is exempt.
- [ ] Complete every permission-justification field with the text in [STORE_LISTING.md](STORE_LISTING.md).
- [ ] Complete the data-use disclosure and Limited Use certification truthfully.
- [ ] Confirm the developer does not receive credentials, assignments, diagnostics, or usage data and that no analytics, advertising, or telemetry endpoint exists.
- [ ] Disclose that <code>chrome.storage.local</code> is not application-level encrypted by the extension.
- [ ] Disclose that Google receives prefilled assignment details only when the user opens the Google Calendar link.
- [ ] Disclose notification and lock-screen exposure.
- [ ] Disclose the exact, separate effects of clearing cached assignments and clearing credentials.
- [ ] Confirm the dashboard does not claim “does not handle data” merely because data is stored locally.
- [ ] Review current [Chrome Web Store privacy policy requirements](https://developer.chrome.com/docs/webstore/program-policies/privacy) immediately before submission.

## Automated verification

Run from <code>extension/</code>:

~~~bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm package
~~~

Then run from the repository root:

~~~bash
git diff --check
~~~

- [ ] Dependency installation succeeds with the committed lockfile.
- [ ] All tests pass.
- [ ] Typechecking passes.
- [ ] The production build passes.
- [ ] Packaging passes and creates <code>extension/release/canvas-deadline-copilot-1.0.0.zip</code>.
- [ ] <code>git diff --check</code> reports no whitespace errors.
- [ ] The GitHub Actions workflow is green for the final commit on both push and pull-request coverage.
- [ ] Review dependency vulnerability output using an approved current scanner; document any accepted risk without placing sensitive values in logs.

## ZIP inspection

~~~bash
cd extension
unzip -t release/canvas-deadline-copilot-1.0.0.zip
unzip -Z1 release/canvas-deadline-copilot-1.0.0.zip
~~~

- [ ] ZIP integrity passes.
- [ ] <code>manifest.json</code> is at the archive root and reports version 1.0.0.
- [ ] The archive root contains only the built manifest, background worker, popup/options HTML, 16/32/48/128 icons, and the generated <code>assets/</code> directory.
- [ ] The ZIP contains no TypeScript/JSX source, source maps, tests, fixtures, docs, lockfiles, package manifests, Git metadata, development-server files, dependency directories, logs, environment files, or legacy application files.
- [ ] The ZIP contains no API credentials, authorization-header values, personal Canvas domains, real course/assignment/user data, screenshots with personal data, or workspace-specific paths.
- [ ] Run a secret scanner configured to report file names or locations without echoing matched secret values. Investigate every hit.
- [ ] Search for development markers and local paths without printing potentially sensitive matched content.
- [ ] Record the ZIP file size and SHA-256 checksum in the release ticket.
- [ ] Extract the ZIP into a fresh temporary directory and load that extracted directory in Chrome. Do not rely only on the pre-ZIP <code>dist/</code> test.

## Manual functional QA

Use a clean Chrome profile and synthetic or dedicated test Canvas data.

### First run and settings

- [ ] Popup explains manual sync, filters, calendar actions, reminders, and local credential storage.
- [ ] **Set up Canvas** and **Settings** actions open the options page, including when the preferred background path is unavailable.
- [ ] Missing credentials, malformed stored settings, and an unavailable storage API show safe actionable states instead of crashing.
- [ ] Canvas URL and token fields have visible labels, keyboard focus, and helpful validation.
- [ ] A saved token is never repopulated or displayed; its replacement field is blank after reload.
- [ ] Saving an unchanged origin with a blank replacement token keeps the existing credential.
- [ ] Changing the origin requires a replacement token and clears the previous assignment cache.
- [ ] Connection testing shows configured, verified, denied, unauthorized, network, and malformed-response states without exposing the token.

### Diagnostics and data controls

- [ ] Current status accurately shows configured/verified Canvas state, reminder enabled state, and selected windows.
- [ ] Diagnostics show last successful sync, cache count, scheduled reminder-alarm count, and latest partial-sync warning without sensitive data.
- [ ] Diagnostics tolerate an unavailable alarms API.
- [ ] Refresh diagnostics updates the displayed values.
- [ ] **Clear cached assignments** requires confirmation, removes only the assignment cache, and leaves credentials and reminder settings intact.
- [ ] Clearing the cache causes future reminder alarms to reconcile away; document any transient Chrome API delay.
- [ ] **Clear saved Canvas credentials** requires confirmation, removes only the URL/token, and retains cache, reminder settings/history, and alarms.
- [ ] After credential clearing, the popup does not expose the retained cache, but a retained cached reminder can still fire until reminders are disabled or the cache is cleared.
- [ ] Clearing either item does not claim to remove a downloaded ICS file, a saved calendar event, Canvas-side token, or external service data.

### Assignment states and sync

- [ ] No credentials state directs the user to settings.
- [ ] No cached assignments state directs the user to sync.
- [ ] A successful empty sync explains that Canvas returned no published assignments.
- [ ] A result containing only assignments without due dates explains reminder/export limitations while still listing the assignments.
- [ ] Active filters with zero matches show a clear-filters action.
- [ ] Search, course selection, all status filters, counts, and clear-filters behavior are correct.
- [ ] A partial course failure retains successful courses and displays/stores the concise warning.
- [ ] A total sync failure preserves the prior cache.
- [ ] A background-message failure does not make an otherwise successful sync fail.
- [ ] Corrupted cache/settings/history values recover to safe defaults and are removed or sanitized best effort.

### Reminders

- [ ] Reminders default to off.
- [ ] Enabling requires at least one of 7 days, 24 hours, 2 hours, or 30 minutes.
- [ ] Published future assignments schedule the selected windows.
- [ ] Overdue, unpublished, no-date, invalid-date, and already-missed windows do not schedule notifications.
- [ ] Alarms reconstruct after browser restart, extension reload/update, service-worker restart, cache change, and reminder-setting change.
- [ ] Duplicate delivery history suppresses a second notification.
- [ ] Notification failure does not record a reminder as delivered.
- [ ] Notification title/body contain only assignment name, course, due time, and reminder label.
- [ ] Notification clicks open only a valid HTTPS Canvas link and clean up the notification even when tab opening fails.
- [ ] Disabled Chrome or operating-system notifications fail safely.

### Calendar

- [ ] Individual ICS export downloads one dated assignment.
- [ ] Bulk ICS export contains only visible dated assignments and reports skipped no-date items.
- [ ] ICS imports with the expected local display time across a DST boundary.
- [ ] Event duration is one hour and text/Unicode escaping is valid.
- [ ] Unsafe Canvas links are omitted.
- [ ] Google Calendar opens only after the user activates its link and receives the expected prefilled details.
- [ ] No Google OAuth, Calendar API access, or automatic synchronization occurs.

### Accessibility and layout

- [ ] All controls are reachable and operable with the keyboard in logical order.
- [ ] Focus indicators remain visible against every control background.
- [ ] Form inputs have persistent labels; groups use fieldsets/legends or equivalent semantics.
- [ ] Loading and success updates are exposed as status messages; errors are exposed as alerts.
- [ ] Assignment state and connection state are communicated with text, not color alone.
- [ ] Buttons and links have clear accessible names, including new-tab behavior where relevant.
- [ ] Popup has no horizontal overflow at its expected 410 pixel width.
- [ ] Popup and options page remain usable at 200% browser zoom.
- [ ] Screen-reader smoke testing covers onboarding, sync feedback, filters, calendar feedback, current status, diagnostics, confirmation actions, and errors.

## Store listing and assets

- [ ] Final listing copy matches [STORE_LISTING.md](STORE_LISTING.md) and the shipping build.
- [ ] No listing text claims automatic Canvas sync, automatic calendar sync, submission/completion tracking, email, a hosted backend, OAuth, or unsupported integrations.
- [ ] Capture at least one and no more than five current screenshots at 1280×800 pixels, using 640×400 only if deliberately chosen under current guidance.
- [ ] Screenshots use synthetic data. They contain no real tokens, credential dots, user/profile details, institution identifiers, course/assignment content, notifications, bookmarks, or workspace paths.
- [ ] Provide the required 128×128 store icon and 440×280 small promotional tile.
- [ ] Decide whether to provide the optional 1400×560 marquee image.
- [ ] Ensure all store images use current branding, accurate UI, square/full-bleed screenshot formatting, and no unlicensed Canvas or Google logo.
- [ ] Review the official [listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/) and [image requirements](https://developer.chrome.com/docs/webstore/images/) immediately before upload.
- [ ] Confirm the issue tracker proposed for support is public, monitored, and appropriate.
- [ ] Add a monitored private security-reporting contact before submission; do not direct sensitive vulnerability reports to a public issue.
- [ ] Confirm publisher name, official URL, category, locale, support URL, and privacy URL.

## Final install and submission readiness

- [ ] Install the packaged ZIP in a new profile and repeat the release smoke test.
- [ ] Compare the installed manifest permissions with the documented justifications.
- [ ] Inspect the extension service-worker console, popup, and options page; confirm there are no errors and no sensitive logs.
- [ ] Confirm Chrome Web Store privacy answers and Limited Use certification are complete and consistent.
- [ ] Confirm the Canvas authentication-policy and token-storage blockers at the top of this checklist are formally closed.
- [ ] Record remaining limitations and approved risks.
- [ ] Obtain publisher approval.
- [ ] Do not submit as part of Day 7; preserve the verified ZIP and release record for the separate submission step.
