import { normalizeCanvasBaseUrl } from './canvas';

export class CanvasHostPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanvasHostPermissionError';
  }
}

export async function ensureCanvasHostPermission(canvasUrl: string): Promise<void> {
  const permission = buildCanvasHostPermission(canvasUrl);

  if (await hasPermission(permission)) {
    return;
  }

  const granted = await requestPermission(permission);
  if (!granted) {
    throw new CanvasHostPermissionError(
      'Allow this extension to contact your Canvas site, then try again.',
    );
  }
}

function buildCanvasHostPermission(canvasUrl: string): chrome.permissions.Permissions {
  const origin = normalizeCanvasBaseUrl(canvasUrl);

  // Host access stays optional: Chrome prompts for only the Canvas origin entered here.
  return {
    origins: [`${origin}/*`],
  };
}

function getChromePermissions(): typeof chrome.permissions {
  if (typeof chrome === 'undefined' || !chrome.permissions) {
    throw new CanvasHostPermissionError(
      'Open these settings from the installed Chrome extension before testing the connection.',
    );
  }

  return chrome.permissions;
}

function hasPermission(permission: chrome.permissions.Permissions): Promise<boolean> {
  const permissions = getChromePermissions();

  return new Promise((resolve, reject) => {
    permissions.contains(permission, (hasHostPermission) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new CanvasHostPermissionError('Chrome could not check access to this Canvas site.'));
        return;
      }

      resolve(hasHostPermission);
    });
  });
}

function requestPermission(permission: chrome.permissions.Permissions): Promise<boolean> {
  const permissions = getChromePermissions();

  return new Promise((resolve, reject) => {
    permissions.request(permission, (granted) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new CanvasHostPermissionError('Chrome could not request access to this Canvas site.'));
        return;
      }

      resolve(granted);
    });
  });
}
