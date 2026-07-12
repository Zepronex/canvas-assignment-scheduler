export const ASSIGNMENTS_UPDATED_MESSAGE = 'canvas-deadline:assignments-updated';

export interface AssignmentsUpdatedMessage {
  type: typeof ASSIGNMENTS_UPDATED_MESSAGE;
}

export async function notifyAssignmentsUpdated(): Promise<void> {
  try {
    if (
      typeof chrome === 'undefined' ||
      !chrome.runtime ||
      typeof chrome.runtime.sendMessage !== 'function'
    ) {
      return;
    }

    const message: AssignmentsUpdatedMessage = { type: ASSIGNMENTS_UPDATED_MESSAGE };
    const sendResult = chrome.runtime.sendMessage(
      message,
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

export function isAssignmentsUpdatedMessage(
  value: unknown,
): value is AssignmentsUpdatedMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'type' in value &&
      value.type === ASSIGNMENTS_UPDATED_MESSAGE,
  );
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return Boolean(
    value &&
      (typeof value === 'object' || typeof value === 'function') &&
      typeof (value as PromiseLike<unknown>).then === 'function',
  );
}
