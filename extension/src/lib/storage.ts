import type { Assignment, AssignmentCache, AssignmentNotes, CanvasSettings, Course, UserInfo } from '../types';

export const CACHE_TTL_MS = 30 * 60 * 1000;

export const STORAGE_KEYS = {
  settings: 'settings',
  assignmentCache: 'assignmentCache',
  assignmentNotes: 'assignmentNotes',
} as const;

interface LocalStorageSchema {
  [STORAGE_KEYS.settings]: CanvasSettings;
  [STORAGE_KEYS.assignmentCache]: AssignmentCache;
  [STORAGE_KEYS.assignmentNotes]: AssignmentNotes;
}

export async function getSettings(): Promise<CanvasSettings> {
  return (
    (await getStoredValue<CanvasSettings>(STORAGE_KEYS.settings)) ?? {
      canvasUrl: '',
      canvasToken: '',
    }
  );
}

export async function saveSettings(settings: CanvasSettings): Promise<void> {
  await setStoredValue(STORAGE_KEYS.settings, {
    canvasUrl: settings.canvasUrl.trim(),
    canvasToken: settings.canvasToken.trim(),
  });
}

export async function clearSettings(): Promise<void> {
  await removeStoredValue(STORAGE_KEYS.settings);
}

export async function getAssignmentNotes(): Promise<AssignmentNotes> {
  const notes = await getStoredValue<AssignmentNotes>(STORAGE_KEYS.assignmentNotes);
  return isStringRecord(notes) ? notes : {};
}

export async function saveAssignmentNote(assignmentId: Assignment['id'], note: string): Promise<void> {
  const notes = await getAssignmentNotes();
  const nextNotes = {
    ...notes,
    [assignmentId]: note,
  };

  await setStoredValue(STORAGE_KEYS.assignmentNotes, nextNotes);
}

export async function deleteAssignmentNote(assignmentId: Assignment['id']): Promise<void> {
  const notes = await getAssignmentNotes();
  const nextNotes = { ...notes };
  delete nextNotes[assignmentId];

  await setStoredValue(STORAGE_KEYS.assignmentNotes, nextNotes);
}

export async function getAssignmentCache(now = Date.now()): Promise<AssignmentCache | null> {
  const cache = await getStoredValue<AssignmentCache>(STORAGE_KEYS.assignmentCache);
  if (!cache || now - cache.savedAt >= CACHE_TTL_MS) {
    return null;
  }

  return cache;
}

export async function saveAssignmentCache(cache: {
  user: UserInfo | null;
  courses: Course[];
  assignments: Assignment[];
}): Promise<void> {
  await setStoredValue(STORAGE_KEYS.assignmentCache, {
    ...cache,
    savedAt: Date.now(),
  });
}

export async function clearAssignmentCache(): Promise<void> {
  await removeStoredValue(STORAGE_KEYS.assignmentCache);
}

async function getStoredValue<T>(key: keyof LocalStorageSchema): Promise<T | undefined> {
  const storage = getChromeStorage();

  return new Promise<T | undefined>((resolve, reject) => {
    storage.get(key, (items) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(items[key] as T | undefined);
    });
  });
}

async function setStoredValue<K extends keyof LocalStorageSchema>(
  key: K,
  value: LocalStorageSchema[K],
): Promise<void> {
  const storage = getChromeStorage();

  return new Promise<void>((resolve, reject) => {
    storage.set({ [key]: value }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}

async function removeStoredValue(key: keyof LocalStorageSchema): Promise<void> {
  const storage = getChromeStorage();

  return new Promise<void>((resolve, reject) => {
    storage.remove(key, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}

function getChromeStorage(): chrome.storage.StorageArea {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    throw new Error('Chrome local storage is unavailable.');
  }

  return chrome.storage.local;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((item) => typeof item === 'string');
}
