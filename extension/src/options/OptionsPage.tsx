import { FormEvent, useEffect, useState } from 'react';
import { normalizeCanvasUrl } from '../lib/canvas';
import { getSettings, saveSettings } from '../lib/storage';
import type { CanvasSettings } from '../types';

type SaveStatus =
  | { state: 'idle'; message: '' }
  | { state: 'saving'; message: 'Saving settings...' }
  | { state: 'saved'; message: 'Settings saved locally.' }
  | { state: 'error'; message: string };

const EMPTY_STATUS: SaveStatus = { state: 'idle', message: '' };

export function OptionsPage() {
  const [settings, setSettings] = useState<CanvasSettings>({
    canvasUrl: '',
    canvasToken: '',
  });
  const [status, setStatus] = useState<SaveStatus>(EMPTY_STATUS);

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
    const canvasUrl = normalizeCanvasUrl(settings.canvasUrl);
    const canvasToken = settings.canvasToken.trim();

    if (!canvasUrl || !canvasToken) {
      setStatus({
        state: 'error',
        message: 'Enter both a Canvas URL and API token.',
      });
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
              type="url"
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

          <button type="submit" disabled={status.state === 'saving'}>
            {status.state === 'saving' ? 'Saving...' : 'Save settings'}
          </button>
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
