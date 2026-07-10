import { useEffect, useMemo, useState } from 'react';
import { sortAssignmentsByDueDate } from '../lib/assignments';
import { hasCanvasSettings, syncCanvasAssignments } from '../lib/canvas';
import { ensureCanvasHostPermission } from '../lib/permissions';
import { getAssignmentCache, getSettings, saveAssignmentCache } from '../lib/storage';
import type { AssignmentSyncResult, CanvasSettings, NormalizedAssignment } from '../types';

type LoadState = 'loading' | 'ready' | 'error';

export function Popup() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [settings, setSettings] = useState<CanvasSettings | null>(null);
  const [syncResult, setSyncResult] = useState<AssignmentSyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const assignments = useMemo(
    () => sortAssignmentsByDueDate(syncResult?.assignments ?? []),
    [syncResult],
  );
  const hasCredentials = settings ? hasCanvasSettings(settings) : false;

  useEffect(() => {
    let isMounted = true;

    Promise.all([getSettings(), getAssignmentCache()])
      .then(([storedSettings, cachedResult]) => {
        if (!isMounted) {
          return;
        }

        setSettings(storedSettings);
        setSyncResult(cachedResult);
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

  const openSettings = () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
      return;
    }

    window.open(chrome.runtime.getURL('options.html'));
  };

  const handleSync = async () => {
    if (!settings || !hasCanvasSettings(settings)) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      await ensureCanvasHostPermission(settings.canvasUrl);
      const nextResult = await syncCanvasAssignments(settings);
      await saveAssignmentCache(nextResult);
      setSyncResult(nextResult);
    } catch (error) {
      setSyncError(getErrorMessage(error, 'Unable to sync assignments from Canvas.'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main className="popup-shell">
      <section className="popup-panel">
        <header>
          <p className="eyebrow">Chrome extension</p>
          <h1>Canvas Deadline Copilot</h1>
          <p className="muted-copy">Sync deadlines from your active Canvas courses.</p>
        </header>

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
          <p className="status-message status-idle">
            Add your Canvas URL and API token before syncing assignments.
          </p>
        )}

        <div className="popup-actions">
          {loadState === 'ready' && hasCredentials && (
            <button type="button" onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? 'Syncing...' : 'Sync assignments'}
            </button>
          )}

          <button type="button" className="secondary-button" onClick={openSettings}>
            {hasCredentials ? 'Settings' : 'Open settings'}
          </button>
        </div>

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

        {loadState === 'ready' && syncResult && (
          <p className="sync-time">Last synced {formatDateTime(syncResult.lastSyncedAt)}</p>
        )}

        {loadState === 'ready' && <AssignmentList assignments={assignments} hasCache={Boolean(syncResult)} />}
      </section>
    </main>
  );
}

function AssignmentList({
  assignments,
  hasCache,
}: {
  assignments: NormalizedAssignment[];
  hasCache: boolean;
}) {
  if (assignments.length === 0) {
    return (
      <p className="empty-state">
        {hasCache
          ? 'No assignments found in your active courses.'
          : 'No assignments cached yet. Sync to load your Canvas deadlines.'}
      </p>
    );
  }

  return (
    <ul className="assignment-list" aria-label="Canvas assignments">
      {assignments.map((assignment) => (
        <li className="assignment-item" key={`${assignment.courseId}-${assignment.id}`}>
          <a
            className="assignment-link"
            href={assignment.htmlUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            {assignment.name}
          </a>
          <p className="assignment-course">{assignment.courseName}</p>
          <p className="assignment-meta">
            {assignment.dueAt ? (
              <time dateTime={assignment.dueAt}>Due {formatDateTime(assignment.dueAt)}</time>
            ) : (
              <span>No due date</span>
            )}
            {assignment.pointsPossible !== null && (
              <span>
                {assignment.pointsPossible} {assignment.pointsPossible === 1 ? 'point' : 'points'}
              </span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'at an unknown time';
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
