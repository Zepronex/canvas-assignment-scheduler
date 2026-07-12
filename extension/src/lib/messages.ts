export const ASSIGNMENTS_UPDATED_MESSAGE = 'canvas-deadline:assignments-updated';

export async function notifyAssignmentsUpdated(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return;
  }

  await new Promise<void>((resolve) => {
    chrome.runtime.sendMessage({ type: ASSIGNMENTS_UPDATED_MESSAGE }, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
}
