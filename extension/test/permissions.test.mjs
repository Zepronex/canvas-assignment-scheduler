import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CanvasHostPermissionError,
  ensureCanvasHostPermission,
  revokeCanvasHostPermission,
} from '../.test-build/lib/permissions.js';

test('requests and removes only the normalized Canvas origin', async () => {
  const calls = installPermissionsMock();

  await ensureCanvasHostPermission('https://canvas.example.edu/some/path');
  await revokeCanvasHostPermission('https://canvas.example.edu/some/path');

  assert.deepEqual(calls, [
    ['request', { origins: ['https://canvas.example.edu/*'] }],
    ['remove', { origins: ['https://canvas.example.edu/*'] }],
  ]);
});

test('maps denied and failed host permission operations to fixed messages', async () => {
  installPermissionsMock({ granted: false });
  await assert.rejects(
    ensureCanvasHostPermission('https://canvas.example.edu'),
    (error) =>
      error instanceof CanvasHostPermissionError &&
      error.message === 'Allow this extension to contact your Canvas site, then try again.',
  );

  installPermissionsMock({ lastError: { message: 'sensitive sentinel' } });
  await assert.rejects(
    ensureCanvasHostPermission('https://canvas.example.edu'),
    (error) =>
      error instanceof CanvasHostPermissionError &&
      error.message === 'Chrome could not request access to this Canvas site.' &&
      !error.message.includes('sensitive sentinel'),
  );
});

function installPermissionsMock({ granted = true, lastError } = {}) {
  const calls = [];
  globalThis.chrome = {
    runtime: { lastError: undefined },
    permissions: {
      request(permission, callback) {
        calls.push(['request', permission]);
        invoke(callback, granted);
      },
      remove(permission, callback) {
        calls.push(['remove', permission]);
        invoke(callback, true);
      },
    },
  };

  return calls;

  function invoke(callback, value) {
    globalThis.chrome.runtime.lastError = lastError;
    try {
      callback(value);
    } finally {
      globalThis.chrome.runtime.lastError = undefined;
    }
  }
}
