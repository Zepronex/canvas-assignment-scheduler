import { FormEvent, useEffect, useState } from 'react';
import { normalizeCanvasBaseUrl, validateCanvasConnection } from '../lib/canvas';
import { ensureCanvasHostPermission } from '../lib/permissions';
import { REMINDER_WINDOW_OPTIONS } from '../lib/reminders';
import {
  getReminderSettings,
  getSettings,
  saveReminderSettings,
  saveSettings,
} from '../lib/storage';
import type { CanvasSettings, ReminderSettings, ReminderWindowMinutes } from '../types';

type SaveStatus =
  | { state: 'idle'; message: '' }
  | { state: 'saving'; message: 'Saving settings...' }
  | { state: 'testing'; message: 'Testing connection...' }
  | { state: 'saved'; message: 'Settings saved locally.' }
  | { state: 'connected'; message: string }
  | { state: 'error'; message: string };

const EMPTY_STATUS: SaveStatus = { state: 'idle', message: '' };

type ReminderSaveStatus =
  | { state: 'idle'; message: '' }
  | { state: 'saving'; message: 'Saving reminder settings...' }
  | { state: 'saved'; message: 'Reminder settings saved.' }
  | { state: 'error'; message: string };

const EMPTY_REMINDER_STATUS: ReminderSaveStatus = { state: 'idle', message: '' };

export function OptionsPage() {
  const [settings, setSettings] = useState<CanvasSettings>({
    canvasUrl: '',
    canvasToken: '',
  });
  const [status, setStatus] = useState<SaveStatus>(EMPTY_STATUS);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    enabled: false,
    windows: [],
  });
  const [reminderStatus, setReminderStatus] =
    useState<ReminderSaveStatus>(EMPTY_REMINDER_STATUS);
  const isSaving = status.state === 'saving';
  const isTesting = status.state === 'testing';
  const isBusy = isSaving || isTesting;

  useEffect(() => {
    let isMounted = true;

    Promise.all([getSettings(), getReminderSettings()])
      .then(([storedSettings, storedReminderSettings]) => {
        if (isMounted) {
          setSettings(storedSettings);
          setReminderSettings(storedReminderSettings);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setStatus({
            state: 'error',
            message: error instanceof Error ? error.message : 'Unable to load settings.',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let canvasUrl: string;

    try {
      canvasUrl = normalizeCanvasBaseUrl(settings.canvasUrl);
    } catch (error) {
      setStatus({
        state: 'error',
        message: getErrorMessage(error, 'Enter a valid Canvas URL.'),
      });
      return;
    }

    const canvasToken = settings.canvasToken.trim();
    if (!canvasToken) {
      setStatus({ state: 'error', message: 'Enter a Canvas API token.' });
      return;
    }

    setStatus({ state: 'saving', message: 'Saving settings...' });

    try {
      await saveSettings({ canvasUrl, canvasToken });
      setSettings({ canvasUrl, canvasToken });
      setStatus({ state: 'saved', message: 'Settings saved locally.' });
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Unable to save settings.',
      });
    }
  };

  const handleTestConnection = async () => {
    let canvasUrl: string;

    try {
      canvasUrl = normalizeCanvasBaseUrl(settings.canvasUrl);
    } catch (error) {
      setStatus({
        state: 'error',
        message: getErrorMessage(error, 'Enter a valid Canvas URL.'),
      });
      return;
    }

    const canvasToken = settings.canvasToken.trim();
    if (!canvasToken) {
      setStatus({ state: 'error', message: 'Enter a Canvas API token.' });
      return;
    }

    setStatus({ state: 'testing', message: 'Testing connection...' });

    try {
      await ensureCanvasHostPermission(canvasUrl);
      const user = await validateCanvasConnection({ canvasUrl, canvasToken });

      setSettings({ canvasUrl, canvasToken });
      setStatus({ state: 'connected', message: `Connected as ${user.name}` });
    } catch (error) {
      setStatus({
        state: 'error',
        message: getErrorMessage(error, 'Unable to test the Canvas connection.'),
      });
    }
  };

  const handleReminderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReminderStatus({ state: 'saving', message: 'Saving reminder settings...' });

    try {
      await saveReminderSettings(reminderSettings);
      setReminderStatus({ state: 'saved', message: 'Reminder settings saved.' });
    } catch (error) {
      setReminderStatus({
        state: 'error',
        message: getErrorMessage(error, 'Unable to save reminder settings.'),
      });
    }
  };

  const toggleReminderWindow = (windowMinutes: ReminderWindowMinutes) => {
    setReminderStatus(EMPTY_REMINDER_STATUS);
    setReminderSettings((current) => ({
      ...current,
      windows: current.windows.includes(windowMinutes)
        ? current.windows.filter((window) => window !== windowMinutes)
        : [...current.windows, windowMinutes],
    }));
  };

  return (
    <main className="options-shell">
      <section className="settings-panel">
        <div className="settings-heading">
          <p className="eyebrow">Settings</p>
          <h1>Canvas Deadline Copilot</h1>
          <p className="muted-copy">
            Credentials stay in Chrome local extension storage and are used only for direct Canvas API requests.
          </p>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          <label>
            <span>Canvas URL</span>
            <input
              type="text"
              inputMode="url"
              value={settings.canvasUrl}
              onChange={(event) => setSettings((current) => ({ ...current, canvasUrl: event.target.value }))}
              placeholder="https://your-school.instructure.com"
              autoComplete="url"
              required
            />
          </label>

          <label>
            <span>Canvas API token</span>
            <input
              type="password"
              value={settings.canvasToken}
              onChange={(event) => setSettings((current) => ({ ...current, canvasToken: event.target.value }))}
              placeholder="Paste a Canvas access token"
              autoComplete="off"
              required
            />
          </label>

          <div className="settings-actions">
            <button type="submit" disabled={isBusy}>
              {isSaving ? 'Saving...' : 'Save settings'}
            </button>

            <button type="button" className="secondary-button" onClick={handleTestConnection} disabled={isBusy}>
              {isTesting ? 'Testing...' : 'Test connection'}
            </button>
          </div>
        </form>

        {status.message && (
          <p className={`status-message status-${status.state}`} role={status.state === 'error' ? 'alert' : 'status'}>
            {status.message}
          </p>
        )}

        <section className="reminder-settings-section" aria-labelledby="reminder-settings-title">
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
                  setReminderStatus(EMPTY_REMINDER_STATUS);
                  setReminderSettings((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }));
                }}
              />
              <span>
                <strong>Enable browser reminders</strong>
                <small>Notifications are off by default and run without keeping the popup open.</small>
              </span>
            </label>

            <fieldset className="reminder-window-fieldset">
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

            <button
              type="submit"
              disabled={reminderStatus.state === 'saving'}
            >
              {reminderStatus.state === 'saving' ? 'Saving...' : 'Save reminder settings'}
            </button>
          </form>

          {reminderStatus.message && (
            <p
              className={`status-message status-${reminderStatus.state}`}
              role={reminderStatus.state === 'error' ? 'alert' : 'status'}
            >
              {reminderStatus.message}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
