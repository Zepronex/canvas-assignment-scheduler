import { useEffect, useState } from 'react';
import { hasCanvasSettings } from '../lib/canvas';
import { getSettings } from '../lib/storage';

type SetupState = 'loading' | 'ready' | 'missing' | 'error';

export function Popup() {
  const [setupState, setSetupState] = useState<SetupState>('loading');

  useEffect(() => {
    let isMounted = true;

    getSettings()
      .then((settings) => {
        if (isMounted) {
          setSetupState(hasCanvasSettings(settings) ? 'ready' : 'missing');
        }
      })
      .catch(() => {
        if (isMounted) {
          setSetupState('error');
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

  const description =
    setupState === 'ready'
      ? 'Canvas connection settings are saved locally.'
      : 'Add your Canvas URL and API token before syncing deadlines.';

  return (
    <main className="popup-shell">
      <section className="popup-panel">
        <p className="eyebrow">Chrome extension</p>
        <h1>Canvas Deadline Copilot</h1>
        <p className="muted-copy">{setupState === 'loading' ? 'Checking settings...' : description}</p>

        {setupState === 'error' && (
          <p className="status-message status-error" role="alert">
            Unable to read extension storage.
          </p>
        )}

        <button type="button" onClick={openSettings}>
          Open settings
        </button>
      </section>
    </main>
  );
}
