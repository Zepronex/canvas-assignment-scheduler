export const ASSIGNMENTS_UPDATED_MESSAGE = 'canvas-deadline:assignments-updated';

export async function notifyAssignmentsUpdated(): Promise<void> {
  try {
    if (
      typeof chrome === 'undefined' ||
      !chrome.runtime ||
      typeof chrome.runtime.sendMessage !== 'function'
    ) {
      return;
    }

    const sendResult = chrome.runtime.sendMessage(
      { type: ASSIGNMENTS_UPDATED_MESSAGE },
      () => {
        try {
          void chrome.runtime.lastError;
        } catch {
          // The assignment cache is already saved, so messaging must remain best effort.
        }
      },
    ) as unknown;

    if (isPromiseLike(sendResult)) {
      await sendResult;
    }
  } catch {
    // A stopped or unavailable service worker must not turn a successful sync into an error.
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return Boolean(
    value &&
      (typeof value === 'object' || typeof value === 'function') &&
      typeof (value as PromiseLike<unknown>).then === 'function',
  );
}
