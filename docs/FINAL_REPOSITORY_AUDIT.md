# Canvas Deadline Copilot final repository audit

- Audit date: 2026-07-12
- Audited branch: `feature/final-cleanup`
- Extension and package version: `1.0.0`

This document is the fact-checked description of the repository after final engineering cleanup. It is intended for maintainers, reviewers, release personnel, and anyone evaluating technical or résumé claims. It describes the implementation that exists; it is not Chrome Web Store approval or authorization to distribute the extension publicly.

| Evidence | Final state |
| --- | --- |
| Runtime product | Manifest V3 Chrome extension only |
| Manifest metadata | **Canvas Deadline Copilot** — “View Canvas assignment deadlines, export calendar events, and schedule optional Chrome reminders.” |
| Runtime entry points | Popup, options page, background service worker |
| Automated tests | 83 passing tests in 11 test files |
| Required permissions | `storage`, `alarms`, `notifications` |
| Optional host declaration | `https://*/*`; runtime request is limited to the normalized configured Canvas origin |
| Release artifact | Validated versioned ZIP containing 14 runtime files plus the `assets/` directory entry |
| Deployment status | Not submitted to or published on the Chrome Web Store |

## Audit method and cleanup disposition

Before deletion, the repository was inventoried through tracked-file enumeration, import/reference searches, Manifest V3 entry-point tracing, Vite production builds, tests, CI and packaging review, dependency-manifest inspection, and generated-bundle searches. The three active runtime roots were confirmed as:

1. `public/manifest.json` → `popup.html` → `src/popup/main.tsx`;
2. `public/manifest.json` → `options.html` → `src/options/main.tsx`; and
3. `public/manifest.json` → built `background.js` from `src/background/index.ts`.

The removed `frontend/`, `backend/`, and `.temp/` trees were absent from the manifest, Vite inputs, extension imports, CI working directory, and release allowlist. They were superseded web-prototype code, including a Create React App frontend, a FastAPI token-proxy backend, duplicate dependency metadata, and an obsolete frontend lockfile. Their removal is architecturally significant: the final product does not operate a web application or send credentials through a project-owned backend.

The unreachable `extension/src/lib/date.ts` module and assignment-note storage/type scaffolding were also removed only after confirming zero runtime imports, zero test consumers, and absence from the built extension. Test-only compatibility exports and alternate sorting/calendar APIs with no runtime caller were removed while their meaningful behavior coverage was redirected through the production APIs.

All remaining extension React modules and CSS selectors are reachable from the popup/options entry graphs, with dynamic status classes accounted for. Tracked source and active documentation contain no unresolved `TODO`, `FIXME`, or `HACK` marker.

No active extension dependency was removed: both runtime dependencies and all six development dependencies are used. The obsolete prototype dependency manifests and lockfile were removed with their applications. The active lockfile was not broadly upgraded. The final pnpm 10 configuration explicitly permits only esbuild's required dependency lifecycle script.

## A. Product summary

### Intended users and problem solved

Canvas Deadline Copilot is for an individual Chrome user who has access to one Canvas LMS account and wants a consolidated deadline-oriented view across that account's active courses. Canvas normally separates assignments by course; the extension manually fetches deadline metadata and keeps a validated local snapshot for searching, filtering, reminders, and calendar handoffs.

### Implemented functionality

- Saves one normalized HTTPS Canvas origin and a manually entered personal Canvas API token in `chrome.storage.local`.
- Leaves the saved token field blank on later options-page loads so the credential is not displayed again.
- Requests optional Chrome host access for the exact normalized Canvas origin when the user tests or synchronizes it.
- Tests credentials against `/api/v1/users/self` without persisting the returned Canvas profile.
- Manually fetches active Canvas courses and each accessible course's assignments through the Canvas REST API.
- Follows Canvas `Link`-header pagination while constraining continuations to the configured origin.
- Parses and normalizes assignment identifiers, course data, names, due dates, points, publication state, update time, and same-origin Canvas link.
- Caches a validated assignment snapshot locally with the last sync time and partial-failure count.
- Replaces the cache with current successful-course results after a usable partial sync; preserves the prior cache when the course request or every syncable course assignment request fails.
- Displays published cached assignments in the popup with assignment-name search, course filtering, and overdue, due-today, upcoming, and no-date status filtering.
- Shows course, due time, points, and a safe Canvas assignment link. It does not mark work complete because no submission data is requested.
- Generates RFC 5545 ICS downloads for a single dated assignment or the currently filtered dated assignments.
- Opens a user-selected, prefilled Google Calendar template URL for one dated assignment.
- Provides opt-in Chrome reminders, disabled by default, at 7 days, 24 hours, 2 hours, and 30 minutes before eligible future deadlines.
- Reconciles deterministic alarms after worker load, Chrome startup, extension installation/update, assignment-cache changes, reminder-setting changes, and assignment-update messages.
- Clears stale alarms, suppresses recorded deliveries, creates notifications, and routes notification clicks only through a stored safe HTTPS assignment URL.
- Recovers from malformed settings, caches, reminder preferences, and delivery histories with safe defaults and best-effort repair/removal.
- Shows non-sensitive diagnostics and separate controls for clearing cached assignments or saved credentials.

Canvas can return valid unpublished assignments, and validated unpublished records can remain in the local snapshot. The popup, status counts, calendar actions, and reminder scheduler independently exclude them.

### Explicit non-features

Version 1.0.0 does **not** provide:

- scheduled or automatic Canvas synchronization;
- Canvas OAuth or Google OAuth;
- email, SMS, mobile-push, or server-side reminders;
- a hosted backend, credential broker, remote database, or cross-device sync;
- analytics, advertising, telemetry, or developer-operated runtime logging;
- Canvas submission, completion, grading, or student-progress fetching;
- Google Calendar API integration or automatic calendar synchronization;
- automatic Chrome Web Store submission, deployment, or publication; or
- guaranteed reminder timing or delivery.

## B. Final architecture

| Component | Implementation and responsibility |
| --- | --- |
| Popup | React UI in `src/popup/`. Loads settings/cache/reminder state, starts manual sync, displays and filters published assignments, and starts calendar actions. |
| Options page | React UI in `src/options/`. Saves credentials, tests Canvas, manages reminders, shows diagnostics, and clears local state. |
| Canvas client | `src/lib/canvas.ts`. Normalizes origins, builds authenticated requests, follows pagination, validates responses, parses Canvas records, and aggregates per-course results. |
| Normalized model | `src/types.ts` plus Canvas parsing. Separates Canvas wire fields from the camel-case assignment shape consumed by the UI, storage, reminders, and calendar code. |
| Storage/cache | `src/lib/storage.ts`. Owns four typed `chrome.storage.local` keys, validates every read/write boundary, and supplies safe recovery defaults. |
| Background worker | `src/background/index.ts`, built as the module `background.js`. Owns reminder reconciliation, alarm events, notifications, and notification clicks; it never synchronizes Canvas. |
| Reminder planning | Pure scheduling and identity rules in `src/lib/reminders.ts`; dependency-injected reconciliation/delivery sequencing in `src/lib/reminderRuntime.ts`. |
| Calendar generation | `src/lib/calendar.ts`. Builds ICS text, local blob downloads, and a fixed Google Calendar template URL without OAuth or calendar-account access. |
| Permissions and URLs | `src/lib/permissions.ts` and `src/lib/urls.ts`. Request/revoke the exact configured origin and reject non-HTTPS, credential-bearing, wildcard, malformed, and disallowed cross-origin URLs. |
| Messages/errors/diagnostics | Small shared modules standardize the data-free assignment-update discriminator, safe UI errors, and non-sensitive status summaries. |
| Build and package | Vite produces the three entry points; packaging validates versions, allowlisted contents, manifest references, staging, and ZIP contents. |
| CI | GitHub Actions installs the frozen lockfile, runs tests and typecheck, then runs `pnpm package`, which performs the production build and ZIP validation. |

### Chrome message and event flow

After the popup saves a successful assignment snapshot, it sends `{ type: "canvas-deadline:assignments-updated" }`. The message contains no token or assignment data. The worker validates the discriminator and queues a reminder rebuild. It also watches the assignment-cache and reminder-setting keys through `chrome.storage.onChanged`, so reminder recovery does not depend solely on a transient message receiver. Both triggers are safe because rebuilds are serialized and reconciliation is deterministic.

Chrome alarms provide persisted wake-up events; in-memory promises only serialize mutations while the service worker is alive. Notification delivery is recorded only after notification creation succeeds. Notification-click lookup and cleanup are contained so a storage, tab, or notification error does not leave an unhandled worker rejection.

## C. Final repository tree

```text
.
├── .github/
│   └── workflows/ci.yml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── FINAL_REPOSITORY_AUDIT.md
│   ├── PRIVACY.md
│   ├── RELEASE_CHECKLIST.md
│   └── STORE_LISTING.md
├── extension/
│   ├── public/
│   │   ├── manifest.json
│   │   └── icon16.png, icon32.png, icon48.png, icon128.png
│   ├── scripts/
│   │   ├── package.mjs
│   │   └── package-validation.mjs
│   ├── src/
│   │   ├── background/index.ts
│   │   ├── lib/
│   │   │   ├── assignments.ts, calendar.ts, canvas.ts, diagnostics.ts
│   │   │   ├── errors.ts, messages.ts, permissions.ts
│   │   │   ├── reminderRuntime.ts, reminders.ts, storage.ts, urls.ts
│   │   ├── options/OptionsPage.tsx, options/main.tsx
│   │   ├── popup/Popup.tsx, popup/main.tsx
│   │   ├── styles.css
│   │   ├── types.ts
│   │   └── vite-env.d.ts
│   ├── test/                    # 11 focused Node test files
│   ├── options.html
│   ├── popup.html
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── pnpm-workspace.yaml
│   ├── tsconfig.json
│   ├── tsconfig.test.json
│   └── vite.config.ts
├── .gitignore
├── LICENSE
└── README.md
```

Meaningful top-level ownership is intentionally small:

- `.github/workflows/ci.yml` is continuous integration only.
- `docs/` contains the active technical, privacy, release, store, and audit documents.
- `extension/` is the only application and contains all runtime source, tests, static assets, dependency metadata, build configuration, and package tooling.
- `README.md` is the project entry point; `LICENSE` is the MIT license; `.gitignore` excludes dependencies, secrets, local state, maps, and generated outputs.

Generated `extension/node_modules/`, `.test-build/`, `dist/`, and `release/` directories are not tracked. There is no active frontend application, backend, database, container, deployment manifest, content script, or hosted release asset in the repository.

## D. Data flow

### Settings save

1. The options page trims and normalizes the entered Canvas URL to an HTTPS origin. Empty, non-HTTPS, credential-bearing, wildcard, and malformed hosts are rejected.
2. The replacement token is trimmed. If the field is blank, the existing token can be reused only when the normalized origin is unchanged.
3. `saveSettings` validates both fields before writing `{ canvasUrl, canvasToken }` to the `settings` key in `chrome.storage.local`.
4. If either the origin or token differs from the saved value, the old assignment cache is cleared first so data from different credentials is not combined.
5. The password-style token field is cleared and never repopulated from storage. If the Canvas origin changed, the options page makes a best-effort request to revoke the previous host permission.

Saving settings does not test the connection and does not synchronize assignments.

### Permission request and Canvas validation

The manifest declares `https://*/*` only as an optional capability because a Canvas origin cannot be known at build time. On **Test connection** or **Sync assignments**, `ensureCanvasHostPermission` derives `${normalizedCanvasOrigin}/*` and passes only that origin to `chrome.permissions.request`. The user can deny the prompt without granting all-HTTPS access. Wildcard text in a configured hostname is rejected before Chrome is called.

**Test connection** sends a direct authenticated `GET` to `/api/v1/users/self`. It validates a positive numeric ID and non-empty name; an optional email returned by Canvas can exist in the in-memory response object, but the UI discards the profile and persists none of it. Network, authentication, authorization, endpoint, and malformed-response failures are mapped to fixed user-safe messages.

### Assignment synchronization

1. The popup performs synchronization only after the user selects **Sync assignments**.
2. The client fetches `/api/v1/courses?enrollment_state=active&per_page=100`, following same-origin Canvas pagination.
3. Courses marked `access_restricted_by_date` are excluded from assignment requests.
4. Assignment collections are requested concurrently from `/api/v1/courses/{courseId}/assignments?per_page=100`, again following validated pagination.
5. Each assignment must contain valid IDs, text fields, a timezone-qualified update timestamp, a null or timezone-qualified due timestamp, finite/null points, an HTTPS same-origin link, and a `course_id` matching the requested course.
6. Canvas fields are normalized to the internal `NormalizedAssignment` shape. Valid unpublished assignments are retained in the snapshot but later filtered by consumers.

The token is used in the `Authorization: Bearer …` header. It is never placed in a URL, cache record, runtime message, notification, diagnostic, calendar event, or application log.

### Cache update and failure behavior

If at least one syncable course succeeds, `syncCanvasAssignments` returns the current courses, all assignments from successful course requests, a new ISO sync timestamp, and the number of failed courses. The popup validates and saves this result as a complete replacement snapshot. Assignments from a course that failed in the current run are omitted; older assignments from that course are not merged in.

If the course request fails, or every syncable course assignment request fails, the client throws and the popup does not call `saveAssignmentCache`. The prior cache therefore remains unchanged. A runtime-message failure is deliberately best effort and cannot turn an already saved sync into a visible synchronization failure.

Every cache read revalidates courses, assignments, timestamps, counts, and HTTPS links. A malformed or unsafe cache is discarded rather than rendered.

### Reminder reconciliation

Reminder preferences are stored separately and default to disabled with all four supported windows selected. Enabling requires at least one valid window.

A rebuild loads the cached assignments, reminder settings, delivered-alarm identifiers, and existing Chrome alarms. Pure scheduling logic includes only published assignments with a valid future due date and only windows whose send time is still in the future. Alarm names encode course ID, assignment ID, window minutes, and due timestamp, making them deterministic and due-date-versioned. Reconciliation clears extension-owned alarms not in the desired schedule, preserves exact matches, and creates missing alarms.

Rebuilds run on worker-module load, `runtime.onInstalled`, `runtime.onStartup`, the validated assignment-update message, and relevant local storage changes. Operation failures are counted and contained; a later rebuild retries state that remains unreconciled.

### Notification delivery and clicks

When an extension reminder alarm fires, the worker re-reads the cache, settings, and delivery history. It verifies the identifier, enabled window, absence of a delivery record, future due time, published state, and exact course/assignment/due-date match. It creates a Chrome notification containing assignment name, course, localized due time, and reminder-window label. Only after Chrome reports creation success does it record the delivery and sanitized click URL.

Reconstruction does not create catch-up alarms for reminder windows already past. Chrome can nevertheless delay an alarm that was scheduled earlier, for example during device sleep. If Chrome fires that existing alarm before the assignment due time and the other checks still pass, the notification can be late; after the due time it is suppressed.

Clicking a notification looks up the stored URL, revalidates it as safe HTTPS, opens a tab when valid, and attempts notification cleanup in all cases. The extension does not request the broad `tabs` permission merely to create a user-initiated tab.

### Calendar export

For ICS export, the popup passes a single assignment or the visible filtered assignments to local calendar generation. Invalid/no due dates are skipped. The generator creates deterministic RFC 5545 event IDs, UTC timestamps, a fixed one-hour duration, escaped/folded text, and a sanitized Canvas link. A temporary blob URL starts the browser download without the `downloads` permission and is then revoked.

For Google Calendar, the popup creates a fixed `https://calendar.google.com/calendar/render` URL containing the selected event details. Data reaches Google only after the user activates that link. There is no OAuth, Calendar API call, calendar read, automatic update, or deduplication.

## E. Security and privacy

### Stored and transmitted data

The token and Canvas origin are stored under `settings` in extension-scoped `chrome.storage.local`. Assignment metadata, reminder preferences, and delivery history use the separate `assignmentCache`, `reminderSettings`, and `reminderDeliveryHistory` keys. The extension does not use `chrome.storage.sync`, a remote database, or a developer-operated credential service.

`chrome.storage.local` is local to the Chrome profile but is not application-level encrypted by this project. The extension therefore must not be described as an encrypted vault. A compromised or inspected browser profile/device can expose the token and cached Canvas data. The token is transmitted only for user-requested Canvas API operations constructed for the configured HTTPS origin.

### URL and response controls

- Canvas base URLs must be HTTPS origins without embedded credentials or wildcard hosts.
- Initial API URLs are constructed from fixed Canvas API paths and the configured origin.
- A final fetch response URL is checked after the browser resolves redirects; an off-origin result is rejected.
- Canvas pagination links are resolved before the next request and must stay on the same origin.
- API-returned assignment links must be HTTPS and same-origin, and the returned assignment course ID must match the requested course.
- Stored and externally opened URLs reject HTTP, embedded credentials, wildcards, and malformed values.
- The only fixed non-Canvas runtime destination is the Google Calendar HTTPS template URL selected by the user.

### Error and message controls

Canvas, permission, and Chrome storage boundaries emit fixed messages rather than raw response bodies, request headers, `runtime.lastError` details, or unexpected exception text. The assignment-update runtime message contains only a discriminated type constant. Corrupted local values are validated before use, and unsafe URLs are removed or cause the containing cache to be rejected.

### Permission model

Required permissions are limited to:

- `storage` for credentials, cache, settings, and delivery history;
- `alarms` for future browser reminder events; and
- `notifications` for the user's opt-in deadline notices.

The broad HTTPS pattern is optional and is not granted on install. Runtime requests are exact-origin. There is no required host permission, `identity`, `downloads`, `tabs`, cookies, history, browsing-data, or content-script access.

### Absence of developer collection

The runtime contains no hosted backend, analytics SDK, advertising, telemetry endpoint, remote executable code, or developer-operated application logging. The publisher does not receive credentials, assignment data, diagnostics, or usage events. Canvas, Google, Chrome, the operating system, downloaded-file handlers, and the user's calendar application remain separate processors under their own policies.

### Remaining policy considerations

Two issues are release blockers rather than claims of resolved compliance:

1. Instructure's current [Canvas OAuth2 guidance](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth) describes manual tokens as a testing mechanism, says asking other users to generate and enter one violates Canvas API Policy, and states that multi-user applications must use OAuth. Version 1.0.0 has no OAuth flow. Public distribution requires a documented policy determination or a different authentication/distribution plan.
2. The publisher must reconcile storage of an authentication token without application-level encryption with current Chrome Web Store [user-data and secure-handling guidance](https://developer.chrome.com/docs/webstore/user_data), publish the [privacy disclosure](PRIVACY.md) at a stable public URL, and complete accurate dashboard disclosures and [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use) certification.

The privacy document contains the affirmative Limited Use statement supported by the audited code paths. That statement does not replace Chrome Web Store review, institutional approval, or legal advice.

## F. Testing

### Exact final count

The final automated suite contains **83 tests in 11 test files**:

| Test area | Tests | Main coverage |
| --- | ---: | --- |
| Assignments | 8 | Publication filtering, local-day status, search/course/status filters, counts, date sorting |
| Calendar | 10 | Deterministic RFC 5545 output, UTC conversion, escaping/folding, safe links, filenames, Google templates |
| Canvas API | 19 | URL/token validation, profile errors, pagination, origin safety, parsing, normalization, partial/total failures |
| Diagnostics | 3 | Cache/alarm summaries and unavailable API recovery |
| Messages | 6 | Non-sensitive payload, discriminator, callback/promise/synchronous failure containment |
| Package validation | 2 | Manifest V3 entry/icon references and invalid-reference rejection |
| Permissions | 3 | Exact-origin request/revoke, safe errors, wildcard rejection |
| Reminder runtime | 4 | Rebuild/retry behavior, delivery ordering, click cleanup |
| Reminder scheduling | 12 | Eligibility, windows, deterministic IDs, DST, reconciliation, delivery suppression, URL routing |
| Storage | 14 | Save/load/clear, corrupted data, credential changes, defaults, history sanitization, safe errors |
| URL safety | 2 | Valid HTTPS normalization and unsafe/credential/wildcard rejection |
| **Total** | **83** | **0 failures, 0 skipped, 0 cancelled, 0 TODO** |

### Commands used

From `extension/`:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm package
pnpm audit --audit-level=low
```

From the repository root:

```bash
git diff --check
git status --short
git ls-files
```

The final frozen installation was also forced once to verify a clean dependency reconstruction and confirm that pnpm 10.15.1 ran only the explicitly allowed esbuild lifecycle script. The time-bounded registry advisory query reported no known vulnerabilities; that result is not a permanent vulnerability-free guarantee.

### Mocks and test boundaries

Tests use synthetic `example.edu` Canvas fixtures. They mock Canvas `fetch` responses and pagination headers, `chrome.storage.local`, runtime messaging, optional permissions, alarms through dependency interfaces or Chrome-shaped callbacks, and the browser document/URL APIs used for ICS downloads. They do not use a real token, institution, course, user, notification service, or Google account.

### Manual QA still required

Automated tests do not render the React UIs or load the actual service-worker listener registrations inside Chrome. A clean-profile, load-unpacked test must still cover:

- first-run popup/options flows and real permission prompts;
- keyboard, screen-reader, focus, zoom, and popup-layout behavior;
- real Canvas connection and pagination with a dedicated test account/token;
- Manifest V3 worker suspension, restart, install/update, startup, and storage-change events;
- Chrome alarm persistence, device-sleep delays, OS notifications, and notification clicks;
- ICS download/import, timezone display, and Google Calendar handoff;
- installation from the extracted release ZIP rather than only `dist/`; and
- final screenshot/store-media review using synthetic data.

## G. CI and release process

### Continuous integration

`.github/workflows/ci.yml` runs for pushes and pull requests with repository contents restricted to read access. The single extension job uses Ubuntu, Node.js 22, and pnpm 10.15.1. It:

1. checks out the repository;
2. installs `extension/pnpm-lock.yaml` with `--frozen-lockfile`;
3. runs all 83 tests;
4. runs TypeScript typechecking; and
5. runs `pnpm package`, which performs the production Vite build before validating and creating the ZIP.

There is no CI secret, Canvas credential, deployment environment, artifact upload, release publication, or store API call in the workflow.

### Dependency state

The active extension has two runtime dependencies (`react`, `react-dom`) and six development dependencies (`@types/chrome`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `typescript`, `vite`). Every direct dependency is required by a source import, Chrome/React typing, TypeScript compilation, or Vite configuration. The final lock resolves React/React DOM 18.3.1, TypeScript 5.9.3, Vite 6.4.3, and the React Vite plugin 4.7.0; the frozen install, typecheck, and build all pass on the Node 22 CI baseline. Dependencies are correctly separated in `package.json`, and no broad upgrade was performed during cleanup.

Deleting the obsolete prototypes removed their unused dependency surfaces: the Create React App/React Router/Lucide/Web Vitals frontend stack, its large stale lockfile, a duplicate temporary package manifest, and the FastAPI/Uvicorn/Requests/Pydantic/python-dotenv backend requirements. These are not removals from the active extension package.

### Build and package automation

Vite has exactly three inputs: popup HTML, options HTML, and the background worker. Production source maps are disabled. Static icons and the manifest are copied from `public/`.

`pnpm package` checks package/manifest version equality, builds, and validates the distribution before archiving. It allows only:

- `manifest.json`;
- module `background.js`;
- `popup.html` and `options.html`;
- 16, 32, 48, and 128 pixel icons; and
- generated `.js`/`.css` files under the single `assets/` directory.

It rejects symlinks, extra directories/files, source maps, development-server/React-refresh markers, and the current workspace path. It validates that popup, options, background, and icon manifest references name files in the distribution. It copies the validated build into a temporary staging directory, checks staged files against the build, creates a metadata-minimized ZIP, and checks archive files against staging before replacing the final versioned archive.

The verified version 1.0.0 archive contains 14 runtime files (eight top-level files and six generated assets), plus the ZIP directory entry for `assets/`. It contains no TypeScript/TSX source, tests, documentation, lockfile, dependency tree, source map, local path, or tracked secret.

### Deployment boundary

Packaging is automation; deployment is not. The workflow does not retain/upload the ZIP, create a GitHub release, call the Chrome Web Store API, submit metadata, or publish the extension. Chrome Web Store upload and publication remain separate manual actions that require explicit publisher authorization after every blocker and manual QA item is closed. The current process is continuous integration with build/package validation, **not continuous deployment**.

## H. Known limitations

- Only one Canvas origin/account configuration is supported at a time.
- Canvas authentication is a manually entered personal token; there is no OAuth flow.
- Manual-token use is not cleared for public multi-user distribution under current Canvas guidance.
- The token is local but not application-level encrypted; Chrome Web Store secure-storage review remains open.
- Assignment synchronization is manual. The cache and reminders can become stale until the user syncs again.
- A partial sync omits failed courses and replaces, rather than merges with, the prior snapshot.
- Valid unpublished assignments can remain cached even though display, calendar actions, and reminders exclude them.
- The extension does not fetch submission/completion state; completed work can still appear overdue.
- Canvas course access dates, permissions, institutional settings, API changes, and personal-token availability can limit results.
- Reminder delivery depends on Chrome, device power/sleep state, and operating-system notification settings and is not guaranteed.
- Reconstruction does not create already-past windows, but Chrome can deliver a previously scheduled alarm late before the due time.
- Reminders use the last manual snapshot and do not learn about a Canvas due-date change until the next sync.
- Clearing credentials alone retains the cache, reminder settings/history, and alarms; the user must also clear the cache or disable reminders to stop cache-derived reminders.
- ICS and Google Calendar events are one-hour snapshots. They do not update automatically or prevent duplicate imports.
- Google Calendar handoff discloses the selected event details to Google and uses the browser's active Google account.
- Downloaded ICS files and data already sent to Canvas/Google are outside extension deletion controls.
- The release target is Chrome Manifest V3; other browsers are not supported release targets.
- React UI rendering and actual Chrome service-worker events are not integration-tested by the Node suite.
- Final clean-profile browser/accessibility QA is incomplete.
- Required store screenshots/promotional media, public privacy-policy hosting, private security contact, publisher metadata/approval, and final icon-safe-padding review are incomplete.
- Version 1.0.0 has not been submitted to or published on the Chrome Web Store.

## I. Résumé evidence and claim review

### Technologies genuinely used

- TypeScript and React 18 for popup/options UI and typed domain/runtime logic;
- Chrome Extensions Manifest V3 with a module service worker;
- Chrome storage, permissions, alarms, notifications, runtime messaging, and tab-creation APIs;
- Canvas LMS REST endpoints and RFC-style `Link` pagination;
- RFC 5545 ICS generation and browser blob downloads;
- user-initiated Google Calendar template URLs;
- Vite 6, pnpm 10, Node.js's built-in test runner, and GitHub Actions; and
- no Python, FastAPI, database, hosted service, OAuth SDK, analytics SDK, or calendar API client in the final repository.

### Strongest verifiable metrics

- 83 automated tests across 11 focused test files, all passing with no skipped/cancelled/TODO tests.
- Three Manifest V3 runtime entry points.
- Four user-selectable reminder windows.
- Three required permissions, zero required host permissions, and one optional host pattern narrowed to an exact origin at runtime.
- A validated 14-file runtime archive for version 1.0.0.
- Two runtime and six development dependencies, all accounted for.
- CI on both push and pull request with test, typecheck, production build, and package-integrity validation.

These are repository metrics, not evidence of production users, store installs, performance gains, availability, or business impact.

### Exact release status

The local version 1.0.0 build and package pipeline passes, and the release ZIP is structurally ready for manual browser QA. The extension has **not** been submitted, approved, listed, or published in the Chrome Web Store. Canvas authentication policy, Chrome token-storage review, public privacy hosting/disclosures, store media/contact metadata, and clean-profile QA remain blockers. The repository is MIT licensed.

### Draft CV claim comparison

#### Claim 1

> “Built a privacy-focused Chrome extension using TypeScript, React and Manifest V3 to collect, normalize and display assignments across multiple courses through the Canvas LMS REST API.”

**Assessment: Accurate, with wording refinement.** TypeScript, React, Manifest V3, the Canvas REST API, multi-course aggregation, normalization, and display are all present. “Collect” can imply publisher-side collection, whereas requests are made locally to a user-configured Canvas site. The dashboard displays only published assignments even though valid unpublished records can be cached. “Privacy-focused” is supported by the local/no-backend design but must not imply encrypted token storage or completed store-policy review.

**Recommended replacement:**

> Built a Manifest V3 Chrome extension with TypeScript and React that manually fetches, validates, normalizes, caches, and displays published Canvas LMS assignment deadlines across active courses.

#### Claim 2

> “Implemented pagination-aware synchronization, local caching, search and status filtering, partial-failure recovery and deterministic deadline scheduling through a background service worker.”

**Assessment: Accurate.** Synchronization follows Canvas pagination; the cache is validated locally; the popup has assignment-name, course, and status filters; individual course failures produce a usable current partial snapshot; and deterministic alarm reconciliation runs in the worker. Clarify that synchronization is manual and that partial recovery keeps current successful-course results rather than merging stale failed-course data.

**Recommended replacement:**

> Implemented pagination-aware manual synchronization, validated local caching, assignment-name, course, and deadline-status filtering, per-course partial-failure handling, and deterministic Chrome alarm reconciliation in a Manifest V3 service worker.

#### Claim 3

> “Added browser notifications, Google Calendar and iCalendar export, local-only credential storage, least-privilege permissions and automated tests for synchronization, filtering, reminders and calendar generation.”

**Assessment: Partially accurate.** Chrome notifications, ICS, Google Calendar templates, local extension storage, focused permissions, and the named tests exist. “Google Calendar export” can imply API integration or synchronization; it is a user-opened template URL. “Local-only credential storage” must not imply the token stays entirely on device because it is transmitted to Canvas for API requests. The manifest must declare a broad optional HTTPS capability, though Chrome grants only the requested configured origin at runtime.

**Recommended replacement:**

> Added opt-in Chrome notifications, RFC 5545 ICS downloads, user-initiated Google Calendar template links, extension-local credential storage with direct HTTPS Canvas requests, exact-origin optional host access, and automated tests covering synchronization, storage recovery, filtering, reminders, permissions, calendar generation, and release packaging.

### Suggested final CV bullets

- Built a Manifest V3 Chrome extension with TypeScript and React that manually fetches, validates, normalizes, caches, and displays published Canvas LMS assignment deadlines across active courses.
- Implemented pagination-aware synchronization, validated local caching, assignment-name/course/deadline filtering, per-course partial-failure handling, and deterministic Chrome alarm reconciliation in an event-driven service worker.
- Added opt-in Chrome notifications, RFC 5545 ICS downloads, user-initiated Google Calendar templates, exact-origin optional Canvas access, and 83 automated tests spanning API, storage recovery, filtering, permissions, reminders, calendar, and release-package integrity.

### Claims that must not be made

Do not claim that this repository provides or proves:

- automatic or scheduled Canvas synchronization;
- Canvas OAuth, Google OAuth, or Google Calendar API integration;
- automatic calendar synchronization or conflict-free event updates;
- email reminders, submission/completion tracking, or grading analytics;
- a hosted backend, cloud storage, telemetry, or cross-device sync;
- an encrypted credential vault or completed Chrome/Canvas policy approval;
- guaranteed/on-time reminder delivery;
- continuous deployment or automatic Chrome Web Store submission;
- Chrome Web Store publication, production users, install counts, uptime, or quantified performance gains; or
- affiliation with or endorsement by Instructure, Canvas, Google, Chrome, or any institution.
