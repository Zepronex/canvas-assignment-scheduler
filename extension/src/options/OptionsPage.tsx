import { FormEvent, useEffect, useState } from 'react';
import { normalizeCanvasBaseUrl, validateCanvasConnection } from '../lib/canvas';
import { ensureCanvasHostPermission } from '../lib/permissions';
import { getSettings, saveSettings } from '../lib/storage';
import type { CanvasSettings } from '../types';

type SaveStatus =
  | { state: 'idle'; message: '' }
  | { state: 'saving'; message: 'Saving settings...' }
  | { state: 'testing'; message: 'Testing connection...' }
  | { state: 'saved'; message: 'Settings saved locally.' }
  | { state: 'connected'; message: string }
  | { state: 'error'; message: string };

const EMPTY_STATUS: SaveStatus = { state: 'idle', message: '' };

export function OptionsPage() {
  const [settings, setSettings] = useState<CanvasSettings>({
    canvasUrl: '',
    canvasToken: '',
  });
  const [status, setStatus] = useState<SaveStatus>(EMPTY_STATUS);
  const isSaving = status.state === 'saving';
  const isTesting = status.state === 'testing';
  const isBusy = isSaving || isTesting;

  useEffect(() => {
    let isMounted = true;

    getSettings()
      .then((storedSettings) => {
        if (isMounted) {
          setSettings(storedSettings);
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
      </section>
    </main>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
