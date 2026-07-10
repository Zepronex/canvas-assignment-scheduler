import type {
  AssignmentNotes,
  AssignmentSyncResult,
  CanvasCourse,
  CanvasSettings,
  NormalizedAssignment,
} from '../types';

export const STORAGE_KEYS = {
  settings: 'settings',
  assignmentCache: 'assignmentCache',
  assignmentNotes: 'assignmentNotes',
} as const;

interface LocalStorageSchema {
  [STORAGE_KEYS.settings]: CanvasSettings;
  [STORAGE_KEYS.assignmentCache]: AssignmentSyncResult;
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
  const normalizedSettings = {
    canvasUrl: settings.canvasUrl.trim(),
    canvasToken: settings.canvasToken.trim(),
  };
  const storedSettings = await getStoredValue<CanvasSettings>(STORAGE_KEYS.settings);

  if (
    !storedSettings ||
    storedSettings.canvasUrl !== normalizedSettings.canvasUrl ||
    storedSettings.canvasToken !== normalizedSettings.canvasToken
  ) {
    await clearAssignmentCache();
  }

  await setStoredValue(STORAGE_KEYS.settings, normalizedSettings);
}

export async function clearSettings(): Promise<void> {
  await removeStoredValue(STORAGE_KEYS.settings);
}

export async function getAssignmentNotes(): Promise<AssignmentNotes> {
  const notes = await getStoredValue<AssignmentNotes>(STORAGE_KEYS.assignmentNotes);
  return isStringRecord(notes) ? notes : {};
}

export async function saveAssignmentNote(
  assignmentId: NormalizedAssignment['id'],
  note: string,
): Promise<void> {
  const notes = await getAssignmentNotes();
  const nextNotes = {
    ...notes,
    [assignmentId]: note,
  };

  await setStoredValue(STORAGE_KEYS.assignmentNotes, nextNotes);
}

export async function deleteAssignmentNote(
  assignmentId: NormalizedAssignment['id'],
): Promise<void> {
  const notes = await getAssignmentNotes();
  const nextNotes = { ...notes };
  delete nextNotes[assignmentId];

  await setStoredValue(STORAGE_KEYS.assignmentNotes, nextNotes);
}

export async function getAssignmentCache(): Promise<AssignmentSyncResult | null> {
  const cache = await getStoredValue<unknown>(STORAGE_KEYS.assignmentCache);
  return isAssignmentSyncResult(cache) ? cache : null;
}

export async function saveAssignmentCache(result: AssignmentSyncResult): Promise<void> {
  await setStoredValue(STORAGE_KEYS.assignmentCache, result);
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

function isAssignmentSyncResult(value: unknown): value is AssignmentSyncResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.courses) ||
    !Array.isArray(value.assignments) ||
    !isTimestamp(value.lastSyncedAt)
  ) {
    return false;
  }

  return value.courses.every(isCanvasCourse) && value.assignments.every(isNormalizedAssignment);
}

function isCanvasCourse(value: unknown): value is CanvasCourse {
  if (!isRecord(value) || !isPositiveInteger(value.id) || !isNonEmptyString(value.name)) {
    return false;
  }

  return (
    (value.course_code === undefined ||
      value.course_code === null ||
      typeof value.course_code === 'string') &&
    (value.workflow_state === undefined || typeof value.workflow_state === 'string') &&
    (value.access_restricted_by_date === undefined ||
      typeof value.access_restricted_by_date === 'boolean')
  );
}

function isNormalizedAssignment(value: unknown): value is NormalizedAssignment {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isPositiveInteger(value.id) &&
    isPositiveInteger(value.courseId) &&
    isNonEmptyString(value.courseName) &&
    isNonEmptyString(value.name) &&
    (value.dueAt === null || isTimestamp(value.dueAt)) &&
    isNonEmptyString(value.htmlUrl) &&
    (value.pointsPossible === null ||
      (typeof value.pointsPossible === 'number' && Number.isFinite(value.pointsPossible))) &&
    isNonEmptyString(value.workflowState) &&
    isTimestamp(value.updatedAt)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}
