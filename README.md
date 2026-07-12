# Canvas Deadline Copilot

Canvas Deadline Copilot is a Manifest V3 Chrome extension for reviewing assignment deadlines from one user-configured Canvas LMS site. It brings deadline metadata from multiple active courses into a compact popup, where the user can search and filter assignments, create calendar exports, and optionally schedule local browser reminders.

The extension is intentionally manual and local-first. It has no scheduled Canvas synchronization, Canvas or Google OAuth, hosted backend, email delivery, analytics, advertising, telemetry, submission-status lookup, or automatic calendar synchronization. It is an independent project and is not affiliated with or endorsed by Instructure, Canvas, Google, or Chrome.

## Problem

Canvas separates deadlines across course pages, while students often need one deadline-oriented view. This extension consolidates assignment metadata from the active courses available to one Canvas account into a locally cached dashboard without operating a credential-handling backend.

## Implemented features

- Configure an HTTPS Canvas origin and a manually created personal Canvas API token.
- Request optional Chrome host access only for the exact configured Canvas origin when testing or synchronizing.
- Manually fetch active courses and paginated assignment data through the Canvas REST API.
- Validate and normalize assignment records before replacing the local cache.
- Continue with a partial result when at least one course succeeds, while reporting the number of failed courses.
- Preserve the previous cache when the course request fails or every syncable course fails.
- Display published cached assignments with assignment-name search, course filtering, and overdue, due-today, upcoming, and no-due-date filters.
- Show course, due time, points, and a validated Canvas assignment link.
- Export one assignment or the currently filtered dated assignments as RFC 5545 ICS data.
- Open a user-selected, prefilled Google Calendar event template without calendar-account access.
- Schedule opt-in Chrome notifications at 7 days, 24 hours, 2 hours, or 30 minutes before eligible deadlines.
- Recover safely from malformed settings, cache, and reminder history; expose non-sensitive diagnostics and separate controls for clearing credentials or cached assignments.

## Screenshots

Release screenshots have not been added to the repository yet. Before Chrome Web Store submission, replace these placeholders with captures of the shipping build using synthetic data only:

1. **Popup dashboard placeholder** — published assignments, search, course/status filters, and calendar actions.
2. **Settings placeholder** — Canvas connection state and reminder controls, with the token field empty.
3. **Recovery-state placeholder** — a partial-sync warning or a meaningful empty state.

See the synthetic-data and image requirements in the [store listing draft](docs/STORE_LISTING.md) and [release checklist](docs/RELEASE_CHECKLIST.md).

## Architecture

Vite builds three Manifest V3 runtime entry points:

| Component | Responsibility |
| --- | --- |
| Popup (`popup.html`) | Reads the local cache, starts manual synchronization, filters published assignments, and starts calendar actions. |
| Options page (`options.html`) | Saves the Canvas origin/token, tests the connection, manages reminder preferences, shows diagnostics, and clears local data. |
| Background service worker (`background.js`) | Reconciles deterministic Chrome alarms, delivers notifications, and handles safe notification clicks. It does not contact Canvas to synchronize assignments. |
| Canvas client (`src/lib/canvas.ts`) | Builds same-origin HTTPS API requests, follows validated pagination links, parses Canvas responses, and normalizes assignments. |
| Storage boundary (`src/lib/storage.ts`) | Validates settings, assignment snapshots, reminder preferences, and delivery history stored in `chrome.storage.local`. |
| Pure domain helpers (`src/lib/`) | Classify/filter assignments, generate calendar data, derive reminder alarms, validate URLs, and sanitize errors outside the Chrome UI boundaries. |

The principal data flow is:

1. The user saves an HTTPS Canvas origin and token in the options page.
2. Testing or synchronizing requests Chrome permission for only that normalized origin. A connection test calls Canvas's current-user endpoint; it does not save the profile response.
3. A popup-initiated sync fetches active courses, then each accessible course's assignments, following Canvas pagination.
4. Valid records are normalized and saved as one local snapshot. The popup sends a data-free `assignments-updated` message; the service worker also observes storage changes.
5. The service worker reconciles alarms from the cached snapshot and saved reminder preferences. The popup independently reads that snapshot for display and user-initiated calendar export.

Service workers can stop while idle, so persisted storage and Chrome alarms are the durable state; in-memory queues only serialize work during the current worker lifetime. See [Architecture](docs/ARCHITECTURE.md) for storage keys, message flow, and detailed runtime boundaries.

## Technology stack

- Chrome Extensions Manifest V3
- React 18 and React DOM
- TypeScript 5
- Vite 6 with the React plugin
- Chrome storage, permissions, alarms, notifications, runtime messaging, and tab APIs
- Node.js 22 and pnpm 10 in continuous integration
- Node's built-in test runner with synthetic fixtures and mocked browser boundaries

## Repository structure

```text
.
├── .github/workflows/ci.yml       # Push and pull-request continuous integration
├── docs/                          # Architecture, privacy, release, listing, and final-audit documents
├── extension/
│   ├── public/                    # Manifest V3 manifest and extension icons
│   ├── scripts/                   # Deterministic package and package-validation scripts
│   ├── src/
│   │   ├── background/            # Service-worker entry point
│   │   ├── lib/                   # Canvas, storage, reminder, calendar, URL, and error logic
│   │   ├── options/               # React options-page entry point and UI
│   │   └── popup/                 # React popup entry point and dashboard UI
│   ├── test/                      # Node tests for domain and Chrome-boundary behavior
│   ├── options.html               # Options-page Vite entry
│   ├── popup.html                 # Popup Vite entry
│   ├── package.json               # Scripts and dependency declarations
│   ├── pnpm-lock.yaml             # Locked dependency graph
│   └── vite.config.ts             # Three-entry production build configuration
├── .gitignore                     # Excludes dependencies, credentials, maps, and generated output
├── LICENSE                        # MIT license
└── README.md
```

Only `extension/` contains runtime extension code. Generated `extension/dist/`, `extension/.test-build/`, and `extension/release/` directories are ignored and must not be committed.

## Local development

Prerequisites:

- Node.js 22
- pnpm 10 (the repository declares pnpm 10.15.1)
- A current Chrome or Chromium browser with Manifest V3 support
- System `zip` and `unzip` commands for release packaging

Install the locked dependencies from the repository root:

```bash
cd extension
pnpm install --frozen-lockfile
```

Run commands from `extension/`:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start Vite for isolated UI development. A normal web tab cannot provide the full Chrome extension API environment. |
| `pnpm test` | Compile test-targeted TypeScript and run the automated Node test suite. |
| `pnpm typecheck` | Typecheck the extension without emitting files. |
| `pnpm build` | Create the production extension in `extension/dist/`; source maps are disabled. |
| `pnpm package` | Run a production build, validate its manifest and contents, and create the versioned release ZIP. |

Run `git diff --check` from the repository root before submitting a change.

## Load the unpacked extension

1. Run `pnpm build` from `extension/`.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Select the generated `extension/dist/` directory.
6. Pin Canvas Deadline Copilot if desired, then open its popup.
7. After subsequent builds, select **Reload** on the extension card before retesting.

The Vite development server is useful for UI iteration, but Canvas permission prompts, local extension storage, service-worker lifecycle behavior, alarms, notifications, and calendar handoffs require load-unpacked browser testing.

## Configure a Canvas token

A Canvas API token is a credential with the access granted by the user's Canvas account. Keep it private, choose an expiration date when the institution permits one, and revoke it in Canvas if it may have been exposed. Institutions can disable personal token creation or impose additional rules.

Where personal token creation is allowed:

1. Sign in to the Canvas site that contains the assignments.
2. Open account settings and find **Approved Integrations**, **Access Tokens**, or the institution's equivalent section.
3. Create a token with a recognizable purpose and an appropriate expiration date.
4. Copy the token immediately; Canvas may not show it again.
5. Open the extension's options page.
6. Enter the Canvas site's HTTPS base URL and paste the token into the password-style token field.
7. Select **Save settings**, then **Test connection** and approve access to that exact Canvas origin when Chrome prompts.
8. Return to the popup and select **Sync assignments**.

The options page never repopulates a saved token. Leaving the token field blank retains the existing token only when the saved Canvas origin is unchanged. Never put a token in source code, `.env` files, terminal output, screenshots, documentation, issues, or test fixtures.

## Assignment synchronization and cache behavior

Synchronization occurs only when the user selects **Sync assignments**. There is no alarm, timer, service-worker task, or startup hook that refreshes Canvas data automatically.

The client requests active courses and follows same-origin Canvas pagination. It skips courses marked access-restricted by date, then requests assignments for the remaining courses. Every well-formed assignment returned by those requests is normalized and cached, including unpublished assignments. The popup and reminder scheduler separately filter for `workflowState === "published"`, so unpublished assignments are neither displayed nor scheduled.

If one or more course assignment requests succeed, the successful results become the new snapshot; failed courses are omitted and a partial-sync warning is stored. This partial snapshot replaces the previous cache. If the initial course request fails, or every syncable course assignment request fails, no new snapshot is saved and the previous cache remains available.

The cache contains assignment metadata only: identifiers, names, course information, due dates, points, workflow state, update timestamps, and Canvas links. The extension does not request submission, completion, grading, or student-progress data, so it cannot infer whether an assignment has been completed.

## Reminder behavior

Browser reminders are disabled by default. The user can opt into any combination of 7 days, 24 hours, 2 hours, and 30 minutes; enabling reminders requires at least one selected window.

Only cached published assignments with valid future due dates are eligible. A deterministic alarm is created only when its reminder time is still in the future. Overdue assignments, no-date assignments, unpublished assignments, and already-missed reminder windows do not create catch-up notifications.

The service worker reconciles the desired schedule when it loads, when Chrome starts, after installation or update, after an assignment-update message, and when the assignment cache or reminder settings change. Reconciliation removes stale alarms and avoids redelivering recorded reminders. Notification clicks open the saved assignment link only when it is a safe HTTPS URL.

Delivery is best effort. Browser shutdown, device sleep, Chrome behavior, and operating-system notification settings can delay or suppress a reminder. Reminders use the last manual snapshot until the user synchronizes again. Notification content can be visible on a shared screen, lock screen, or notification history.

## Calendar behavior

Calendar actions require a valid assignment due date and are always initiated by the user:

- **Export ICS** downloads one assignment as a local RFC 5545 calendar file.
- **Export visible ICS** downloads the currently filtered, published, dated assignments in one file; no-date assignments are skipped.
- **Add to Google Calendar** opens a prefilled HTTPS Google Calendar template for one assignment in a new tab.

Generated events use UTC timestamps, a fixed one-hour duration, deterministic assignment identifiers, escaped and folded ICS text, and a sanitized HTTPS Canvas link when valid. ICS generation uses a temporary browser blob link and does not require the Chrome downloads permission.

Opening the Google Calendar template sends the prefilled event details to Google. The extension does not use Google OAuth, call the Google Calendar API, read a calendar, or update exported events when Canvas changes. Re-exporting is a new handoff and can create a duplicate event.

## Privacy and security model

- The Canvas origin, token, normalized assignment snapshot, reminder preferences, and reminder delivery history are stored in extension-scoped `chrome.storage.local`, not `chrome.storage.sync` or a developer-operated service.
- The token is not application-level encrypted by this extension. Local-only storage must not be described as an encrypted credential vault.
- The token is sent only as a bearer authorization header in direct HTTPS requests to the configured Canvas origin. It is not included in diagnostics, runtime messages, notifications, calendar payloads, or application logs.
- Canvas base URLs, pagination links, response origins, fetched assignment links, and notification links are validated before use. Canvas API pagination cannot leave the configured origin.
- Unexpected errors are converted to user-safe messages; malformed local data falls back safely and is removed or sanitized on a best-effort basis.
- There is no hosted runtime backend, analytics SDK, telemetry, advertising, remote code, or external credential service.
- ICS generation is local. Google receives assignment details only after the user selects the Google Calendar action.

Changing the saved Canvas origin or token clears the old assignment cache. Clearing cached assignments keeps credentials and reminder preferences. Clearing credentials removes the saved URL and token and attempts to revoke the old origin permission, but deliberately keeps the cache and reminder state; clear the cache or disable reminders separately to stop reminders based on retained data. Removing the extension normally removes extension-scoped local state, but does not revoke the underlying Canvas token, delete downloaded ICS files, or retract data already sent to Canvas or Google.

Read [Privacy and data handling](docs/PRIVACY.md) before packaging or distributing the extension.

## Manifest permissions

Version 1.0.0 declares exactly these entries:

| Manifest entry | Required? | Justification |
| --- | --- | --- |
| `storage` | Required | Persists the Canvas connection, validated assignment snapshot, reminder preferences, and delivery history across popup and service-worker lifetimes. |
| `alarms` | Required | Schedules and reconstructs opt-in deadline reminders while extension pages are closed. It is not used for Canvas synchronization. |
| `notifications` | Required | Displays deadline reminders after the user enables them. |
| `https://*/*` | Optional host permission | Canvas can be institution-hosted or self-hosted on origins unknown at build time. Chrome does not grant this pattern at installation; the extension requests only `${normalizedCanvasOrigin}/*` when the user tests or synchronizes that site. |

There are no required host permissions. The manifest does not request `tabs`, `downloads`, `identity`, cookies, history, or browsing-data access. Opening a user-selected URL with `chrome.tabs.create` does not require the broad `tabs` permission, and ICS downloads use a local blob URL.

## Testing

The automated suite covers:

- Canvas URL normalization, API responses, same-origin pagination, parsing, normalization, partial failure, and total-failure recovery;
- assignment classification, sorting, search, course/status filtering, and local-day boundaries;
- storage validation, corrupted-data recovery, credential changes, and clearing behavior;
- ICS formatting, Unicode folding, filenames, and Google Calendar URL generation;
- deterministic reminder planning, reconciliation, stale-alarm cleanup, delivery history, notification failure, and safe click handling;
- runtime messages, host permission requests/revocation, diagnostics, safe errors, and release-package integrity.

Tests use synthetic Canvas records, mocked `fetch`, and mocked Chrome APIs. They do not contact a real Canvas site, create real Chrome alarms or notifications, or validate Chrome Web Store policy compliance. Load-unpacked QA is still required for UI, accessibility, permission prompts, browser lifecycle behavior, notifications, calendar handoffs, and the packaged artifact.

## Continuous integration and release packaging

GitHub Actions runs on pushes and pull requests. The workflow uses Node.js 22 and pnpm 10.15.1, installs with `pnpm install --frozen-lockfile`, runs tests and typechecking, then runs `pnpm package`. The package command performs the production build itself, so CI does not need a separate build step.

For manifest/package version 1.0.0, `pnpm package` writes:

```text
extension/release/canvas-deadline-copilot-1.0.0.zip
```

Packaging verifies that package and manifest versions match, builds from source, permits only the expected runtime entry points, icons, manifest, and generated JavaScript/CSS assets, validates manifest file references, rejects source maps, unexpected files, symlinks, workspace paths, and development-server markers, and confirms that the ZIP matches the validated staging tree. Source, tests, local paths, and generated maps are not intended to enter the archive. `dist/` and `release/` are generated locally and ignored by Git.

This is continuous integration plus local release-package automation. The workflow does not upload a release artifact, create a GitHub release, submit to the Chrome Web Store, or deploy the extension.

## Chrome Web Store status and policy review

Canvas Deadline Copilot version 1.0.0 is a release candidate. It has **not been submitted to or published in the Chrome Web Store**. A successful build or package is not evidence of store approval.

Public distribution with manually entered Canvas tokens requires a final policy review. Instructure's official [OAuth2 documentation](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth) describes manually generated tokens as a testing mechanism and requires OAuth for multi-user applications. The current extension does not implement OAuth, so the publisher must obtain an appropriate policy determination or change the authentication/distribution plan before public release.

The publisher must also reconcile the unencrypted `chrome.storage.local` token design and in-product disclosures with the current Chrome Web Store [user-data requirements](https://developer.chrome.com/docs/webstore/user_data) and [privacy policy requirements](https://developer.chrome.com/docs/webstore/program-policies/privacy). Other open release work includes a public privacy-policy URL, dashboard disclosures and Limited Use certification, final synthetic screenshots and promotional artwork, clean-profile package QA, and publisher/support/security contact review. Track every blocker in the [release checklist](docs/RELEASE_CHECKLIST.md).

## Known limitations

- Only one Canvas origin can be configured at a time.
- Canvas synchronization is manual; the cache and any derived reminders can become stale.
- The extension cannot determine submission, completion, or grading status. A completed assignment can still appear overdue.
- Canvas permissions, course access dates, institutional settings, and API behavior can limit returned data.
- Only published assignments are displayed or scheduled, although validated unpublished records returned by Canvas remain in the local snapshot.
- Reminder reconstruction does not create catch-up alarms for windows already in the past. Chrome can still delay an alarm that was already scheduled and deliver it late before the assignment due time.
- Clearing credentials alone does not clear cached assignments or disable reminders derived from that cache.
- Calendar exports are snapshots with a fixed one-hour event duration; they do not update or deduplicate previously imported events.
- Google Calendar handoff exposes the selected event details to Google and uses the account active in the browser.
- Personal token creation may be unavailable or inappropriate for public distribution under Canvas or institutional policy.
- Local token storage is not application-level encrypted and still requires final Chrome Web Store compliance review.
- Version 1.0.0 targets Chrome Manifest V3; other browsers are not supported release targets.

## Local contribution guidance

Keep changes scoped to `extension/` runtime code, tests, active documentation, or release tooling. Preserve the separation between pure logic in `src/lib/` and Chrome API boundaries in the popup, options page, and service worker. Add focused regression tests for behavior changes, use only synthetic Canvas data, and run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm package`, and `git diff --check` before proposing a release change.

Do not commit personal Canvas data, API tokens, credentials, local paths, `.env` files, source maps, dependencies, `.test-build/`, `dist/`, or `release/` output. Changes that affect permissions, authentication, collected data, external URLs, notification content, or calendar handoffs also require corresponding privacy, architecture, store-listing, and release-checklist review.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Privacy and data handling](docs/PRIVACY.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Chrome Web Store listing draft](docs/STORE_LISTING.md)
- [Final repository audit](docs/FINAL_REPOSITORY_AUDIT.md)

## License

Canvas Deadline Copilot is licensed under the [MIT License](LICENSE).
