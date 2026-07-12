import { useEffect, useMemo, useState } from 'react';
import {
  filterAndSortAssignments,
  getAssignmentStatus,
  getAssignmentStatusCounts,
} from '../lib/assignments';
import { downloadICS, generateGoogleCalendarUrl } from '../lib/calendar';
import { hasCanvasSettings, syncCanvasAssignments } from '../lib/canvas';
import { formatPartialSyncWarning } from '../lib/diagnostics';
import { getConnectionErrorMessage } from '../lib/errors';
import { ensureCanvasHostPermission } from '../lib/permissions';
import { notifyAssignmentsUpdated } from '../lib/messages';
import {
  getAssignmentCache,
  getReminderSettings,
  getSettings,
  saveAssignmentCache,
} from '../lib/storage';
import { getSafeHttpsUrl } from '../lib/urls';
import type {
  AssignmentStatus,
  AssignmentStatusFilter,
  AssignmentSyncResult,
  CanvasCourse,
  CanvasSettings,
  NormalizedAssignment,
  ReminderSettings,
} from '../types';

type LoadState = 'loading' | 'ready' | 'error';
type CalendarFeedback = { tone: 'success' | 'error'; message: string };

const STATUS_OPTIONS: ReadonlyArray<{
  value: AssignmentStatusFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'no-date', label: 'No due date' },
];

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  upcoming: 'Upcoming',
  'no-date': 'No due date',
};

export function Popup() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [settings, setSettings] = useState<CanvasSettings | null>(null);
  const [syncResult, setSyncResult] = useState<AssignmentSyncResult | null>(null);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [calendarFeedback, setCalendarFeedback] = useState<CalendarFeedback | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusFilter>('all');
  const [classificationTime, setClassificationTime] = useState(() => new Date());
  const allAssignments = syncResult?.assignments ?? [];
  const courses = useMemo(() => sortCourses(syncResult?.courses ?? []), [syncResult]);
  const overallStatusCounts = useMemo(
    () => getAssignmentStatusCounts(allAssignments, classificationTime),
    [allAssignments, classificationTime],
  );
  const assignmentsBeforeStatusFilter = useMemo(
    () =>
      filterAndSortAssignments(allAssignments, {
        searchQuery,
        selectedCourseId,
        statusFilter: 'all',
        now: classificationTime,
      }),
    [allAssignments, classificationTime, searchQuery, selectedCourseId],
  );
  const statusCounts = useMemo(
    () => getAssignmentStatusCounts(assignmentsBeforeStatusFilter, classificationTime),
    [assignmentsBeforeStatusFilter, classificationTime],
  );
  const assignments = useMemo(
    () =>
      filterAndSortAssignments(allAssignments, {
        searchQuery,
        selectedCourseId,
        statusFilter,
        now: classificationTime,
      }),
    [allAssignments, classificationTime, searchQuery, selectedCourseId, statusFilter],
  );
  const visibleAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => getAssignmentStatus(assignment, classificationTime) !== null,
      ),
    [assignments, classificationTime],
  );
  const calendarAssignments = useMemo(
    () =>
      visibleAssignments.filter(
        (assignment) => generateGoogleCalendarUrl(assignment) !== null,
      ),
    [visibleAssignments],
  );
  const hasCredentials = settings ? hasCanvasSettings(settings) : false;
  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedCourseId !== null || statusFilter !== 'all',
  );

  useEffect(() => {
    let isMounted = true;

    Promise.all([getSettings(), getAssignmentCache(), getReminderSettings()])
      .then(([storedSettings, cachedResult, storedReminderSettings]) => {
        if (!isMounted) {
          return;
        }

        setSettings(storedSettings);
        setSyncResult(cachedResult);
        setReminderSettings(storedReminderSettings);
        setLoadState('ready');
      })
      .catch(() => {
        if (isMounted) {
          setLoadState('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setCalendarFeedback(null);
  }, [searchQuery, selectedCourseId, statusFilter]);

  const openSettings = () => {
    const openFallback = () => window.open(chrome.runtime.getURL('options.html'));

    try {
      if (!chrome.runtime.openOptionsPage) {
        openFallback();
        return;
      }

      void chrome.runtime.openOptionsPage().catch(openFallback);
    } catch {
      openFallback();
    }
  };

  const handleSync = async () => {
    if (!settings || !hasCanvasSettings(settings)) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setCalendarFeedback(null);

    try {
      await ensureCanvasHostPermission(settings.canvasUrl);
      const nextResult = await syncCanvasAssignments(settings);
      await saveAssignmentCache(nextResult);
      await notifyAssignmentsUpdated();
      setSyncResult(nextResult);
      setClassificationTime(new Date());
    } catch (error) {
      const message = getConnectionErrorMessage(
        error,
        'Unable to sync assignments from Canvas.',
      );
      setSyncError(syncResult ? `${message} Cached assignments are unchanged.` : message);
    } finally {
      setIsSyncing(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCourseId(null);
    setStatusFilter('all');
  };

  const handleAssignmentExport = (assignment: NormalizedAssignment) => {
    try {
      const downloaded = downloadICS(
        [assignment],
        `canvas-assignment-${assignment.courseId}-${assignment.id}.ics`,
      );

      setCalendarFeedback(
        downloaded
          ? { tone: 'success', message: `Exported ${assignment.name} as an ICS file.` }
          : {
              tone: 'error',
              message: `${assignment.name} needs a valid due date before it can be exported.`,
            },
      );
    } catch {
      setCalendarFeedback({
        tone: 'error',
        message: `Unable to export ${assignment.name}. Try again.`,
      });
    }
  };

  const handleBulkExport = () => {
    try {
      if (!downloadICS(calendarAssignments)) {
        setCalendarFeedback({
          tone: 'error',
          message: 'No visible assignments have valid due dates to export.',
        });
        return;
      }

      const exportedLabel = calendarAssignments.length === 1 ? 'assignment' : 'assignments';
      const skippedCount = visibleAssignments.length - calendarAssignments.length;
      const skippedMessage = skippedCount
        ? ` ${skippedCount} without a valid due date ${skippedCount === 1 ? 'was' : 'were'} skipped.`
        : '';

      setCalendarFeedback({
        tone: 'success',
        message: `Exported ${calendarAssignments.length} visible ${exportedLabel} as one ICS file.${skippedMessage}`,
      });
    } catch {
      setCalendarFeedback({
        tone: 'error',
        message: 'Unable to export the visible assignments. Try again.',
      });
    }
  };

  return (
    <main className="popup-shell">
      <section className="popup-panel" aria-labelledby="popup-title">
        <header className="popup-header">
          <div>
            <p className="eyebrow">Deadline dashboard</p>
            <h1 id="popup-title">Canvas Deadline Copilot</h1>
          </div>
          <button type="button" className="text-button" onClick={openSettings}>
            {hasCredentials ? 'Settings' : 'Open settings'}
          </button>
        </header>

        {loadState === 'ready' && hasCredentials && reminderSettings && (
          <div className="reminder-summary" aria-label="Browser reminder status">
            <span>
              Browser reminders are <strong>{reminderSettings.enabled ? 'on' : 'off'}</strong>
            </span>
            <button type="button" className="text-button" onClick={openSettings}>
              Reminder settings
            </button>
          </div>
        )}

        {loadState === 'loading' && (
          <p className="status-message status-idle" role="status">
            Loading cached assignments...
          </p>
        )}

        {loadState === 'error' && (
          <p className="status-message status-error" role="alert">
            Unable to read extension storage. Open settings and try again.
          </p>
        )}

        {loadState === 'ready' && !hasCredentials && (
          <section className="onboarding-card" aria-labelledby="onboarding-title">
            <h2 id="onboarding-title">Keep Canvas deadlines in view</h2>
            <p>
              Sync assignments, filter deadlines, export calendar events, and opt in to
              browser reminders.
            </p>
            <p className="onboarding-privacy">
              Add your Canvas URL and API token to begin. Credentials stay in this
              browser's local extension storage and are sent only to your Canvas site.
            </p>
            <button type="button" onClick={openSettings}>
              Set up Canvas
            </button>
          </section>
        )}

        {loadState === 'ready' && hasCredentials && (
          <div className="sync-row">
            <button type="button" onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? 'Syncing assignments...' : 'Sync assignments'}
            </button>
            {syncResult && (
              <p className="sync-time">
                Last synced <time dateTime={syncResult.lastSyncedAt}>{formatSyncTime(syncResult.lastSyncedAt)}</time>
              </p>
            )}
          </div>
        )}

        {isSyncing && (
          <p className="status-message status-syncing" role="status">
            Fetching courses and assignments from Canvas...
          </p>
        )}

        {syncError && (
          <p className="status-message status-error" role="alert">
            {syncError}
          </p>
        )}

        {loadState === 'ready' && hasCredentials && Boolean(syncResult?.failedCourseCount) && (
          <p className="status-message status-warning" role="status">
            {formatPartialSyncWarning(syncResult?.failedCourseCount ?? 0)}
          </p>
        )}

        {loadState === 'ready' &&
          hasCredentials &&
          Boolean(syncResult) &&
          overallStatusCounts.all > 0 && (
          <section className="dashboard-controls" aria-label="Assignment filters">
            <div className="filter-grid">
              <label className="filter-field search-field">
                <span>Search assignments</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Assignment name"
                />
              </label>

              <label className="filter-field course-field">
                <span>Course</span>
                <select
                  value={selectedCourseId ?? ''}
                  onChange={(event) =>
                    setSelectedCourseId(event.target.value ? Number(event.target.value) : null)
                  }
                >
                  <option value="">All courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="status-filter">
              <legend>Status</legend>
              <div className="status-filter-list">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    type="button"
                    className="status-filter-button"
                    aria-pressed={statusFilter === option.value}
                    aria-label={`${option.label}: ${statusCounts[option.value]}`}
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    <span>{option.label}</span>
                    <strong>{statusCounts[option.value]}</strong>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="filter-summary" aria-live="polite">
              <span>
                Showing {visibleAssignments.length} of {statusCounts.all}
              </span>
              <button
                type="button"
                className="clear-filters-button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                Clear filters
              </button>
            </div>
          </section>
        )}

        {loadState === 'ready' &&
          hasCredentials &&
          overallStatusCounts.all > 0 &&
          overallStatusCounts['no-date'] === overallStatusCounts.all && (
            <p className="status-message status-idle" role="status">
              Canvas returned assignments, but none has a due date. They are listed below,
              but cannot trigger reminders or calendar exports until Canvas provides dates.
            </p>
          )}

        {loadState === 'ready' && hasCredentials && visibleAssignments.length > 0 && (
          <section className="calendar-export-toolbar" aria-labelledby="calendar-export-title">
            <p className="calendar-export-copy">
              <strong id="calendar-export-title">Calendar export</strong>
              <span>
                {formatCalendarExportAvailability(
                  visibleAssignments.length,
                  calendarAssignments.length,
                )}
              </span>
            </p>
            <button
              type="button"
              className="bulk-export-button"
              onClick={handleBulkExport}
              disabled={calendarAssignments.length === 0}
              aria-label="Export all visible assignments with due dates as one ICS file"
            >
              Export visible ICS
            </button>
          </section>
        )}

        {calendarFeedback && (
          <p
            className={`status-message ${
              calendarFeedback.tone === 'success' ? 'status-saved' : 'status-error'
            }`}
            role={calendarFeedback.tone === 'success' ? 'status' : 'alert'}
          >
            {calendarFeedback.message}
          </p>
        )}

        {loadState === 'ready' && hasCredentials && (
          <AssignmentList
            assignments={visibleAssignments}
            classificationTime={classificationTime}
            hasActiveFilters={hasActiveFilters}
            hasCache={Boolean(syncResult)}
            hasPublishedAssignments={overallStatusCounts.all > 0}
            onClearFilters={clearFilters}
            onExportAssignment={handleAssignmentExport}
          />
        )}
      </section>
    </main>
  );
}

function AssignmentList({
  assignments,
  classificationTime,
  hasActiveFilters,
  hasCache,
  hasPublishedAssignments,
  onClearFilters,
  onExportAssignment,
}: {
  assignments: readonly NormalizedAssignment[];
  classificationTime: Date;
  hasActiveFilters: boolean;
  hasCache: boolean;
  hasPublishedAssignments: boolean;
  onClearFilters: () => void;
  onExportAssignment: (assignment: NormalizedAssignment) => void;
}) {
  if (assignments.length === 0) {
    let message = 'No assignments cached yet. Sync to load your Canvas deadlines.';

    if (hasActiveFilters && hasPublishedAssignments) {
      return (
        <div className="empty-state">
          <p role="status">No assignments match the active filters.</p>
          <button type="button" className="secondary-button" onClick={onClearFilters}>
            Clear filters
          </button>
        </div>
      );
    } else if (hasCache) {
      message = 'Canvas returned no published assignments in your active courses.';
    }

    return (
      <p className="empty-state" role="status">
        {message}
      </p>
    );
  }

  return (
    <ul className="assignment-list" aria-label="Canvas assignments">
      {assignments.map((assignment) => {
        const status = getAssignmentStatus(assignment, classificationTime);
        if (!status) {
          return null;
        }

        const googleCalendarUrl = generateGoogleCalendarUrl(assignment);
        const canvasUrl = getSafeHttpsUrl(assignment.htmlUrl);
        const unavailableMessageId = googleCalendarUrl
          ? undefined
          : `calendar-unavailable-${assignment.courseId}-${assignment.id}`;

        return (
          <li className="assignment-card" key={`${assignment.courseId}-${assignment.id}`}>
            <div className="assignment-card-header">
              <div className="assignment-heading">
                <h2>{assignment.name}</h2>
                <p className="assignment-course">{assignment.courseName}</p>
              </div>
              <span className={`assignment-status status-${status}`}>
                {STATUS_LABELS[status]}
              </span>
            </div>

            <div className="assignment-card-footer">
              <p className="assignment-meta">
                <span>{formatDueDate(assignment.dueAt, status)}</span>
                {assignment.pointsPossible !== null && (
                  <span>
                    {assignment.pointsPossible} {assignment.pointsPossible === 1 ? 'point' : 'points'}
                  </span>
                )}
              </p>
              {canvasUrl ? (
                <a
                  className="canvas-link-button"
                  href={canvasUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Open ${assignment.name} in Canvas (opens in a new tab)`}
                >
                  Open in Canvas
                </a>
              ) : (
                <span className="canvas-link-unavailable">Canvas link unavailable</span>
              )}
            </div>

            <div
              className="assignment-calendar-actions"
              role="group"
              aria-label={`Calendar actions for ${assignment.name}`}
            >
              <button
                type="button"
                className="assignment-calendar-action assignment-ics-action"
                onClick={() => onExportAssignment(assignment)}
                disabled={!googleCalendarUrl}
                aria-label={`Export ${assignment.name} as an ICS file`}
                aria-describedby={unavailableMessageId}
              >
                Export ICS
              </button>
              {googleCalendarUrl ? (
                <a
                  className="assignment-calendar-action assignment-google-action"
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Add ${assignment.name} to Google Calendar (opens in a new tab)`}
                >
                  Add to Google Calendar
                </a>
              ) : (
                <button
                  type="button"
                  className="assignment-calendar-action assignment-google-action"
                  disabled
                  aria-label={`Add ${assignment.name} to Google Calendar`}
                  aria-describedby={unavailableMessageId}
                >
                  Add to Google Calendar
                </button>
              )}
            </div>

            {!googleCalendarUrl && (
              <p className="calendar-unavailable" id={unavailableMessageId}>
                A valid due date is required for calendar export.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function sortCourses(courses: CanvasCourse[]): CanvasCourse[] {
  return [...courses].sort((first, second) => first.name.localeCompare(second.name));
}

function formatCalendarExportAvailability(visibleCount: number, exportableCount: number): string {
  if (visibleCount === 0) {
    return 'No assignments are visible.';
  }

  if (exportableCount === 0) {
    return 'No visible assignments have valid due dates.';
  }

  const assignmentLabel = exportableCount === 1 ? 'assignment' : 'assignments';
  return `${exportableCount} visible ${assignmentLabel} with due dates.`;
}

function formatSyncTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'at an unknown time';
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDueDate(value: string | null, status: AssignmentStatus): string {
  if (!value) {
    return 'Deadline not set';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Due date unavailable';
  }

  if (status === 'today') {
    return `Due today, ${date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }

  return `Due ${date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })}`;
}
