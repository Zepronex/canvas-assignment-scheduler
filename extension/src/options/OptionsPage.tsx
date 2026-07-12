import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { normalizeCanvasBaseUrl, validateCanvasConnection } from '../lib/canvas';
import {
  getExtensionDiagnostics,
  type ExtensionDiagnostics,
} from '../lib/diagnostics';
import { getConnectionErrorMessage } from '../lib/errors';
import { ensureCanvasHostPermission, revokeCanvasHostPermission } from '../lib/permissions';
import { DEFAULT_REMINDER_SETTINGS, REMINDER_WINDOW_OPTIONS } from '../lib/reminders';
import {
  clearAssignmentCache,
  clearSettings,
  getReminderSettings,
  getSettings,
  saveReminderSettings,
  saveSettings,
} from '../lib/storage';
import type { CanvasSettings, ReminderSettings, ReminderWindowMinutes } from '../types';

type FeedbackState = 'idle' | 'saving' | 'testing' | 'saved' | 'connected' | 'error';
type Feedback = { state: FeedbackState; message: string };
type ConnectionState = 'loading' | 'not-configured' | 'configured' | 'connected' | 'error';
type DiagnosticsState = 'loading' | 'ready' | 'unavailable';

interface ConnectionStatus {
  state: ConnectionState;
  message: string;
}

const EMPTY_FEEDBACK: Feedback = { state: 'idle', message: '' };

export function OptionsPage() {
  const [canvasUrl, setCanvasUrl] = useState('');
  const [replacementToken, setReplacementToken] = useState('');
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const savedSettingsRef = useRef<CanvasSettings | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: 'loading',
    message: 'Checking saved Canvas credentials...',
  });
  const [status, setStatus] = useState<Feedback>(EMPTY_FEEDBACK);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() =>
    cloneDefaultReminderSettings(),
  );
  const [savedReminderSettings, setSavedReminderSettings] = useState<ReminderSettings>(() =>
    cloneDefaultReminderSettings(),
  );
  const [reminderStatus, setReminderStatus] = useState<Feedback>(EMPTY_FEEDBACK);
  const [diagnostics, setDiagnostics] = useState<ExtensionDiagnostics | null>(null);
  const [diagnosticsState, setDiagnosticsState] =
    useState<DiagnosticsState>('loading');
  const [dataStatus, setDataStatus] = useState<Feedback>(EMPTY_FEEDBACK);
  const [isLoading, setIsLoading] = useState(true);

  const isSettingsBusy = status.state === 'saving' || status.state === 'testing';
  const isReminderBusy = reminderStatus.state === 'saving';
  const isDataBusy = dataStatus.state === 'saving';
  const isAnyActionBusy = isLoading || isSettingsBusy || isReminderBusy || isDataBusy;
  const savedReminderWindowLabels = formatReminderWindowLabels(
    savedReminderSettings.windows,
  );

  const refreshDiagnostics = useCallback(async (): Promise<void> => {
    setDiagnosticsState('loading');

    try {
      setDiagnostics(await getExtensionDiagnostics());
      setDiagnosticsState('ready');
    } catch {
      setDiagnostics(null);
      setDiagnosticsState('unavailable');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void Promise.allSettled([
      getSettings(),
      getReminderSettings(),
      getExtensionDiagnostics(),
    ]).then(([settingsResult, reminderResult, diagnosticsResult]) => {
      if (!isMounted) {
        return;
      }

      if (settingsResult.status === 'fulfilled') {
        const storedSettings = settingsResult.value;
        const credentialsConfigured = Boolean(
          storedSettings.canvasUrl && storedSettings.canvasToken,
        );

        savedSettingsRef.current = credentialsConfigured ? storedSettings : null;
        setHasSavedCredentials(credentialsConfigured);
        setCanvasUrl(credentialsConfigured ? storedSettings.canvasUrl : '');
        setReplacementToken('');
        setConnectionStatus(
          credentialsConfigured
            ? configuredConnectionStatus(storedSettings.canvasUrl)
            : notConfiguredConnectionStatus(),
        );
      } else {
        savedSettingsRef.current = null;
        setHasSavedCredentials(false);
        setCanvasUrl('');
        setReplacementToken('');
        setConnectionStatus({
          state: 'error',
          message: 'Saved Canvas connection status is unavailable.',
        });
        setStatus({
          state: 'error',
          message: 'Unable to load saved Canvas settings. Re-enter them below if needed.',
        });
      }

      if (reminderResult.status === 'fulfilled') {
        const storedReminderSettings = reminderResult.value;
        setReminderSettings(cloneReminderSettings(storedReminderSettings));
        setSavedReminderSettings(cloneReminderSettings(storedReminderSettings));
      } else {
        const safeDefaults = cloneDefaultReminderSettings();
        setReminderSettings(safeDefaults);
        setSavedReminderSettings(cloneReminderSettings(safeDefaults));
        setReminderStatus({
          state: 'error',
          message: 'Unable to load reminder settings. Safe defaults are shown.',
        });
      }

      if (diagnosticsResult.status === 'fulfilled') {
        setDiagnostics(diagnosticsResult.value);
        setDiagnosticsState('ready');
      } else {
        setDiagnostics(null);
        setDiagnosticsState('unavailable');
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let normalizedCanvasUrl: string;

    try {
      normalizedCanvasUrl = normalizeCanvasBaseUrl(canvasUrl);
    } catch (error) {
      setStatus({
        state: 'error',
        message: getConnectionErrorMessage(error, 'Enter a valid HTTPS Canvas URL.'),
      });
      return;
    }

    const canvasToken = resolveCanvasToken(
      normalizedCanvasUrl,
      replacementToken,
      savedSettingsRef.current,
    );
    if (!canvasToken) {
      setStatus({
        state: 'error',
        message: savedSettingsRef.current
          ? 'Enter a Canvas API token when changing the saved Canvas URL.'
          : 'Enter a Canvas API token.',
      });
      return;
    }

    setStatus({ state: 'saving', message: 'Saving Canvas settings...' });

    try {
      const previousCanvasUrl = savedSettingsRef.current?.canvasUrl ?? null;
      const nextSettings = { canvasUrl: normalizedCanvasUrl, canvasToken };
      await saveSettings(nextSettings);
      savedSettingsRef.current = nextSettings;
      setHasSavedCredentials(true);
      setCanvasUrl(normalizedCanvasUrl);
      setReplacementToken('');
      setConnectionStatus(configuredConnectionStatus(normalizedCanvasUrl));

      let previousPermissionRemoved = true;
      if (previousCanvasUrl && previousCanvasUrl !== normalizedCanvasUrl) {
        try {
          await revokeCanvasHostPermission(previousCanvasUrl);
        } catch {
          previousPermissionRemoved = false;
        }
      }

      setStatus({
        state: 'saved',
        message: previousPermissionRemoved
          ? 'Canvas settings saved locally.'
          : 'Canvas settings saved. Review this extension’s site access in Chrome to remove the previous Canvas permission.',
      });
      await refreshDiagnostics();
    } catch (error) {
      setStatus({
        state: 'error',
        message: getConnectionErrorMessage(error, 'Unable to save Canvas settings.'),
      });
    }
  };

  const handleTestConnection = async () => {
    let normalizedCanvasUrl: string;

    try {
      normalizedCanvasUrl = normalizeCanvasBaseUrl(canvasUrl);
    } catch (error) {
      setStatus({
        state: 'error',
        message: getConnectionErrorMessage(error, 'Enter a valid HTTPS Canvas URL.'),
      });
      return;
    }

    const canvasToken = resolveCanvasToken(
      normalizedCanvasUrl,
      replacementToken,
      savedSettingsRef.current,
    );
    if (!canvasToken) {
      setStatus({
        state: 'error',
        message: savedSettingsRef.current
          ? 'Enter a Canvas API token to test a different Canvas URL.'
          : 'Enter a Canvas API token.',
      });
      return;
    }

    const isTestingSavedCredentials = Boolean(
      savedSettingsRef.current?.canvasUrl === normalizedCanvasUrl &&
        !replacementToken.trim(),
    );
    setStatus({ state: 'testing', message: 'Testing the Canvas connection...' });

    try {
      await ensureCanvasHostPermission(normalizedCanvasUrl);
      await validateCanvasConnection({ canvasUrl: normalizedCanvasUrl, canvasToken });
      setCanvasUrl(normalizedCanvasUrl);
      setConnectionStatus({
        state: 'connected',
        message: isTestingSavedCredentials
          ? `Connection verified for ${formatCanvasHost(normalizedCanvasUrl)}.`
          : `Connection verified for ${formatCanvasHost(normalizedCanvasUrl)}. Save these settings to use them for sync.`,
      });
      setStatus({
        state: 'connected',
        message: 'Canvas connection verified successfully.',
      });
    } catch (error) {
      setConnectionStatus(
        savedSettingsRef.current
          ? {
              state: 'configured',
              message: `The latest connection test failed. Saved credentials for ${formatCanvasHost(savedSettingsRef.current.canvasUrl)} are unchanged.`,
            }
          : {
              state: 'error',
              message: 'The latest Canvas connection test failed.',
            },
      );
      setStatus({
        state: 'error',
        message: getConnectionErrorMessage(error, 'Unable to test the Canvas connection.'),
      });
    }
  };

  const handleReminderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (reminderSettings.enabled && reminderSettings.windows.length === 0) {
      setReminderStatus({
        state: 'error',
        message: 'Select at least one reminder window before enabling reminders.',
      });
      return;
    }

    setReminderStatus({ state: 'saving', message: 'Saving reminder settings...' });

    try {
      await saveReminderSettings(reminderSettings);
      setSavedReminderSettings(cloneReminderSettings(reminderSettings));
      setReminderStatus({ state: 'saved', message: 'Reminder settings saved.' });
      await refreshDiagnostics();
    } catch (error) {
      setReminderStatus({
        state: 'error',
        message: getConnectionErrorMessage(error, 'Unable to save reminder settings.'),
      });
    }
  };

  const toggleReminderWindow = (windowMinutes: ReminderWindowMinutes) => {
    setReminderStatus(EMPTY_FEEDBACK);
    setReminderSettings((current) => ({
      ...current,
      windows: current.windows.includes(windowMinutes)
        ? current.windows.filter((window) => window !== windowMinutes)
        : [...current.windows, windowMinutes],
    }));
  };

  const handleClearCache = async () => {
    if (
      !confirmAction(
        'Clear all cached Canvas assignments? Saved credentials and reminder settings will not be removed.',
      )
    ) {
      return;
    }

    setDataStatus({ state: 'saving', message: 'Clearing cached assignments...' });

    try {
      await clearAssignmentCache();
      await refreshDiagnostics();
      setDataStatus({ state: 'saved', message: 'Cached assignments cleared.' });
    } catch (error) {
      setDataStatus({
        state: 'error',
        message: getConnectionErrorMessage(error, 'Unable to clear cached assignments.'),
      });
    }
  };

  const handleClearCredentials = async () => {
    if (
      !confirmAction(
        'Clear the saved Canvas URL and API token? Cached assignments will remain until you clear them separately.',
      )
    ) {
      return;
    }

    const previousCanvasUrl = savedSettingsRef.current?.canvasUrl ?? null;
    setDataStatus({ state: 'saving', message: 'Clearing saved Canvas credentials...' });

    try {
      await clearSettings();
      savedSettingsRef.current = null;
      setHasSavedCredentials(false);
      setCanvasUrl('');
      setReplacementToken('');
      setStatus(EMPTY_FEEDBACK);
      setConnectionStatus(notConfiguredConnectionStatus());

      let permissionRemoved = true;
      if (previousCanvasUrl) {
        try {
          await revokeCanvasHostPermission(previousCanvasUrl);
        } catch {
          permissionRemoved = false;
        }
      }

      await refreshDiagnostics();
      setDataStatus({
        state: 'saved',
        message: permissionRemoved
          ? 'Saved Canvas credentials cleared.'
          : 'Saved Canvas credentials cleared. Review this extension’s site access in Chrome to remove any remaining Canvas permission.',
      });
    } catch (error) {
      setDataStatus({
        state: 'error',
        message: getConnectionErrorMessage(error, 'Unable to clear saved Canvas credentials.'),
      });
    }
  };

  const diagnosticsPlaceholder =
    diagnosticsState === 'loading' ? 'Loading...' : 'Unavailable';
  const lastSuccessfulSyncAt = diagnostics?.lastSuccessfulSyncAt ?? null;
  const formattedLastSync = lastSuccessfulSyncAt
    ? formatDiagnosticTime(lastSuccessfulSyncAt)
    : null;

  return (
    <main className="options-shell">
      <section className="settings-panel" aria-labelledby="options-title">
        <header className="settings-heading">
          <p className="eyebrow">Settings</p>
          <h1 id="options-title">Canvas Deadline Copilot</h1>
          <p className="muted-copy">
            Credentials stay in Chrome local extension storage and are used only for direct Canvas API requests.
          </p>
        </header>

        <section className="status-overview-section" aria-labelledby="current-status-title">
          <div className="section-heading">
            <p className="eyebrow">Overview</p>
            <h2 id="current-status-title">Current status</h2>
          </div>
          <dl className="status-grid">
            <div>
              <dt>Canvas connection</dt>
              <dd
                className={`status-message status-${connectionStatusTone(connectionStatus.state)}`}
                role={connectionStatus.state === 'error' ? 'alert' : 'status'}
                aria-live="polite"
              >
                {connectionStatus.message}
              </dd>
            </div>
            <div>
              <dt>Browser reminders</dt>
              <dd>{savedReminderSettings.enabled ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt>Selected reminder windows</dt>
              <dd>{savedReminderWindowLabels || 'None selected'}</dd>
            </div>
          </dl>
        </section>

        <section
          className="reminder-settings-section"
          aria-labelledby="canvas-settings-title"
        >
          <div className="section-heading">
            <p className="eyebrow">Canvas</p>
            <h2 id="canvas-settings-title">Canvas connection</h2>
            <p className="muted-copy">
              Enter the HTTPS address for your school’s Canvas site and a personal API token.
            </p>
          </div>

          <form className="settings-form" onSubmit={handleSubmit}>
            <label>
              <span>Canvas URL</span>
              <input
                type="text"
                inputMode="url"
                value={canvasUrl}
                onChange={(event) => {
                  setStatus(EMPTY_FEEDBACK);
                  setCanvasUrl(event.target.value);
                }}
                placeholder="https://your-school.instructure.com"
                autoComplete="url"
                required
                disabled={isAnyActionBusy}
              />
            </label>

            <label>
              <span>Canvas API token</span>
              <input
                type="password"
                value={replacementToken}
                onChange={(event) => {
                  setStatus(EMPTY_FEEDBACK);
                  setReplacementToken(event.target.value);
                }}
                placeholder={
                  hasSavedCredentials
                    ? 'Leave blank to keep the saved token'
                    : 'Paste a Canvas access token'
                }
                autoComplete="off"
                aria-describedby="canvas-token-help"
                disabled={isAnyActionBusy}
              />
              <small id="canvas-token-help">
                Saved tokens are never shown. Leave this blank only when keeping the saved Canvas URL.
              </small>
            </label>

            <div className="settings-actions">
              <button type="submit" disabled={isAnyActionBusy}>
                {status.state === 'saving' ? 'Saving...' : 'Save settings'}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={handleTestConnection}
                disabled={isAnyActionBusy}
              >
                {status.state === 'testing' ? 'Testing...' : 'Test connection'}
              </button>
            </div>
          </form>

          {status.message && (
            <p
              className={`status-message status-${status.state}`}
              role={status.state === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {status.message}
            </p>
          )}
        </section>

        <section
          className="reminder-settings-section"
          aria-labelledby="reminder-settings-title"
        >
          <div className="section-heading">
            <p className="eyebrow">Browser notifications</p>
            <h2 id="reminder-settings-title">Deadline reminders</h2>
            <p className="muted-copy">
              Opt in to Chrome notifications before selected Canvas deadlines. Overdue assignments and assignments without due dates never trigger reminders.
            </p>
          </div>

          <form className="reminder-settings-form" onSubmit={handleReminderSubmit}>
            <label className="toggle-setting">
              <input
                type="checkbox"
                checked={reminderSettings.enabled}
                onChange={(event) => {
                  setReminderStatus(EMPTY_FEEDBACK);
                  setReminderSettings((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }));
                }}
                disabled={isAnyActionBusy}
              />
              <span>
                <strong>Enable browser reminders</strong>
                <small>Notifications are off by default and run without keeping the popup open.</small>
              </span>
            </label>

            <fieldset className="reminder-window-fieldset" disabled={isAnyActionBusy}>
              <legend>Notify me before a deadline</legend>
              <div className="reminder-window-grid">
                {REMINDER_WINDOW_OPTIONS.map(({ minutes, label }) => (
                  <label key={minutes} className="reminder-window-option">
                    <input
                      type="checkbox"
                      checked={reminderSettings.windows.includes(minutes)}
                      onChange={() => toggleReminderWindow(minutes)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button type="submit" disabled={isAnyActionBusy}>
              {reminderStatus.state === 'saving' ? 'Saving...' : 'Save reminder settings'}
            </button>
          </form>

          {reminderStatus.message && (
            <p
              className={`status-message status-${reminderStatus.state}`}
              role={reminderStatus.state === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {reminderStatus.message}
            </p>
          )}
        </section>

        <section
          className="reminder-settings-section"
          aria-labelledby="diagnostics-title"
          aria-busy={diagnosticsState === 'loading'}
        >
          <div className="section-heading">
            <p className="eyebrow">Local extension state</p>
            <h2 id="diagnostics-title">Diagnostics</h2>
            <p className="muted-copy">Only non-sensitive local status information is shown.</p>
          </div>

          <dl className="status-grid diagnostics-grid">
            <div>
              <dt>Last successful sync</dt>
              <dd>
                {diagnosticsState !== 'ready' ? (
                  diagnosticsPlaceholder
                ) : lastSuccessfulSyncAt && formattedLastSync ? (
                  <time dateTime={lastSuccessfulSyncAt}>{formattedLastSync}</time>
                ) : (
                  'Never'
                )}
              </dd>
            </div>
            <div>
              <dt>Cached assignments</dt>
              <dd>
                {diagnosticsState === 'ready'
                  ? diagnostics?.cachedAssignmentCount ?? 0
                  : diagnosticsPlaceholder}
              </dd>
            </div>
            <div>
              <dt>Scheduled reminder alarms</dt>
              <dd>
                {diagnosticsState === 'ready'
                  ? diagnostics?.scheduledReminderAlarmCount ?? 'Unavailable'
                  : diagnosticsPlaceholder}
              </dd>
            </div>
            <div>
              <dt>Latest partial-sync warning</dt>
              <dd>
                {diagnosticsState === 'ready'
                  ? diagnostics?.latestPartialSyncWarning ?? 'None stored'
                  : diagnosticsPlaceholder}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            className="secondary-button"
            onClick={() => void refreshDiagnostics()}
            disabled={diagnosticsState === 'loading' || isAnyActionBusy}
            aria-label="Refresh extension diagnostics"
          >
            {diagnosticsState === 'loading' ? 'Refreshing...' : 'Refresh diagnostics'}
          </button>
        </section>

        <section
          className="reminder-settings-section"
          aria-labelledby="stored-data-title"
        >
          <div className="section-heading">
            <p className="eyebrow">Privacy controls</p>
            <h2 id="stored-data-title">Stored data</h2>
            <p className="muted-copy">
              Clear cached assignment data or remove the Canvas URL and API token saved by this extension.
            </p>
          </div>

          <div className="settings-actions privacy-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleClearCache}
              disabled={isAnyActionBusy}
            >
              Clear cached assignments
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={handleClearCredentials}
              disabled={isAnyActionBusy}
            >
              Clear saved Canvas credentials
            </button>
          </div>

          {dataStatus.message && (
            <p
              className={`status-message status-${dataStatus.state}`}
              role={dataStatus.state === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {dataStatus.message}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

function resolveCanvasToken(
  normalizedCanvasUrl: string,
  replacementToken: string,
  savedSettings: CanvasSettings | null,
): string | null {
  const replacement = replacementToken.trim();
  if (replacement) {
    return replacement;
  }

  return savedSettings?.canvasUrl === normalizedCanvasUrl
    ? savedSettings.canvasToken
    : null;
}

function configuredConnectionStatus(canvasUrl: string): ConnectionStatus {
  return {
    state: 'configured',
    message: `Credentials are configured for ${formatCanvasHost(canvasUrl)}. Test the connection to verify them.`,
  };
}

function notConfiguredConnectionStatus(): ConnectionStatus {
  return {
    state: 'not-configured',
    message: 'Not configured. Add a Canvas URL and API token below.',
  };
}

function connectionStatusTone(state: ConnectionState): 'connected' | 'error' | 'idle' {
  if (state === 'connected') {
    return 'connected';
  }
  if (state === 'error') {
    return 'error';
  }
  return 'idle';
}

function formatCanvasHost(canvasUrl: string): string {
  try {
    return new URL(canvasUrl).hostname;
  } catch {
    return 'the configured Canvas site';
  }
}

function formatReminderWindowLabels(windows: readonly ReminderWindowMinutes[]): string {
  return REMINDER_WINDOW_OPTIONS.filter(({ minutes }) => windows.includes(minutes))
    .map(({ label }) => label)
    .join(', ');
}

function formatDiagnosticTime(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function confirmAction(message: string): boolean {
  try {
    return window.confirm(message);
  } catch {
    return false;
  }
}

function cloneReminderSettings(settings: ReminderSettings): ReminderSettings {
  return {
    enabled: settings.enabled,
    windows: [...settings.windows],
  };
}

function cloneDefaultReminderSettings(): ReminderSettings {
  return cloneReminderSettings(DEFAULT_REMINDER_SETTINGS);
}
