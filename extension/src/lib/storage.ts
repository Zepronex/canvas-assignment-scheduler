import type {
  AssignmentNotes,
  AssignmentSyncResult,
  CanvasCourse,
  CanvasSettings,
  NormalizedAssignment,
  ReminderDeliveryHistory,
  ReminderSettings,
  ReminderWindowMinutes,
} from '../types';
import { DEFAULT_REMINDER_SETTINGS, isReminderWindow } from './reminders.js';
import { getSafeHttpsUrl, isSafeHttpsUrl } from './urls.js';

export const STORAGE_KEYS = {
  settings: 'settings',
  assignmentCache: 'assignmentCache',
  assignmentNotes: 'assignmentNotes',
  reminderSettings: 'reminderSettings',
  reminderDeliveryHistory: 'reminderDeliveryHistory',
} as const;

interface LocalStorageSchema {
  [STORAGE_KEYS.settings]: CanvasSettings;
  [STORAGE_KEYS.assignmentCache]: AssignmentSyncResult;
  [STORAGE_KEYS.assignmentNotes]: AssignmentNotes;
  [STORAGE_KEYS.reminderSettings]: ReminderSettings;
  [STORAGE_KEYS.reminderDeliveryHistory]: ReminderDeliveryHistory;
}

export async function getSettings(): Promise<CanvasSettings> {
  const stored = await getStoredValue<unknown>(STORAGE_KEYS.settings);
  if (stored === undefined) {
    return emptyCanvasSettings();
  }

  const settings = normalizeStoredCanvasSettings(stored);
  if (settings) {
    return settings;
  }

  await discardCorruptedValue(STORAGE_KEYS.settings);
  return emptyCanvasSettings();
}

export async function saveSettings(settings: CanvasSettings): Promise<void> {
  const normalizedSettings = normalizeStoredCanvasSettings(settings);
  if (!normalizedSettings || !normalizedSettings.canvasUrl || !normalizedSettings.canvasToken) {
    throw new Error('Enter a valid HTTPS Canvas URL and API token.');
  }

  const storedSettings = normalizeStoredCanvasSettings(
    await getStoredValue<unknown>(STORAGE_KEYS.settings),
  );

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
  const notes = await getStoredValue<unknown>(STORAGE_KEYS.assignmentNotes);
  if (notes === undefined || isStringRecord(notes)) {
    return notes ?? {};
  }

  await discardCorruptedValue(STORAGE_KEYS.assignmentNotes);
  return {};
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
  if (cache === undefined) {
    return null;
  }
  if (isAssignmentSyncResult(cache)) {
    return cache;
  }

  await discardCorruptedValue(STORAGE_KEYS.assignmentCache);
  return null;
}

export async function saveAssignmentCache(result: AssignmentSyncResult): Promise<void> {
  if (!isAssignmentSyncResult(result)) {
    throw new Error('The assignment cache could not be saved because its data is invalid.');
  }

  await setStoredValue(STORAGE_KEYS.assignmentCache, result);
}

export async function clearAssignmentCache(): Promise<void> {
  await removeStoredValue(STORAGE_KEYS.assignmentCache);
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const stored = await getStoredValue<unknown>(STORAGE_KEYS.reminderSettings);
  if (stored === undefined) {
    return cloneDefaultReminderSettings();
  }
  if (!isRecord(stored) || typeof stored.enabled !== 'boolean' || !Array.isArray(stored.windows)) {
    await discardCorruptedValue(STORAGE_KEYS.reminderSettings);
    return cloneDefaultReminderSettings();
  }

  const windows = stored.windows.filter(
    (window): window is ReminderWindowMinutes =>
      typeof window === 'number' && isReminderWindow(window),
  );
  if (windows.length !== stored.windows.length || (stored.enabled && windows.length === 0)) {
    await discardCorruptedValue(STORAGE_KEYS.reminderSettings);
    return cloneDefaultReminderSettings();
  }

  return {
    enabled: stored.enabled,
    windows: [...new Set(windows)],
  };
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  const windows = [...new Set(settings.windows)].filter(isReminderWindow);
  if (settings.enabled && windows.length === 0) {
    throw new Error('Select at least one reminder window before enabling reminders.');
  }

  await setStoredValue(STORAGE_KEYS.reminderSettings, {
    enabled: settings.enabled,
    windows,
  });
}

export async function getReminderDeliveryHistory(): Promise<ReminderDeliveryHistory> {
  const stored = await getStoredValue<unknown>(STORAGE_KEYS.reminderDeliveryHistory);
  if (stored === undefined) {
    return {};
  }
  if (!isRecord(stored)) {
    await discardCorruptedValue(STORAGE_KEYS.reminderDeliveryHistory);
    return {};
  }

  const history: ReminderDeliveryHistory = {};
  let wasSanitized = false;
  for (const [alarmName, value] of Object.entries(stored)) {
    if (
      isRecord(value) &&
      typeof value.deliveredAt === 'number' &&
      Number.isFinite(value.deliveredAt) &&
      value.deliveredAt > 0 &&
      (value.assignmentUrl === null || typeof value.assignmentUrl === 'string')
    ) {
      const assignmentUrl =
        typeof value.assignmentUrl === 'string'
          ? getSafeHttpsUrl(value.assignmentUrl)
          : null;
      history[alarmName] = {
        deliveredAt: value.deliveredAt,
        assignmentUrl,
      };
      wasSanitized ||= assignmentUrl !== value.assignmentUrl;
    } else {
      wasSanitized = true;
    }
  }

  if (wasSanitized) {
    await replaceCorruptedValue(STORAGE_KEYS.reminderDeliveryHistory, history);
  }

  return history;
}

export async function markReminderDelivered(
  alarmName: string,
  assignmentUrl: string | null,
  deliveredAt: number = Date.now(),
): Promise<void> {
  const history = await getReminderDeliveryHistory();
  const recentEntries = Object.entries(history)
    .filter(([, record]) => record.deliveredAt >= deliveredAt - 90 * 24 * 60 * 60 * 1_000)
    .sort(([, first], [, second]) => second.deliveredAt - first.deliveredAt)
    .slice(0, 1_999);

  await setStoredValue(STORAGE_KEYS.reminderDeliveryHistory, {
    ...Object.fromEntries(recentEntries),
    [alarmName]: { deliveredAt, assignmentUrl },
  });
}

async function getStoredValue<T>(key: keyof LocalStorageSchema): Promise<T | undefined> {
  const storage = getChromeStorage();

  return new Promise<T | undefined>((resolve, reject) => {
    storage.get(key, (items) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error('Unable to read local extension storage.'));
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
        reject(new Error('Unable to save data to local extension storage.'));
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
        reject(new Error('Unable to clear data from local extension storage.'));
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

function cloneDefaultReminderSettings(): ReminderSettings {
  return {
    enabled: DEFAULT_REMINDER_SETTINGS.enabled,
    windows: [...DEFAULT_REMINDER_SETTINGS.windows],
  };
}

function emptyCanvasSettings(): CanvasSettings {
  return { canvasUrl: '', canvasToken: '' };
}

function normalizeStoredCanvasSettings(value: unknown): CanvasSettings | null {
  if (
    !isRecord(value) ||
    typeof value.canvasUrl !== 'string' ||
    typeof value.canvasToken !== 'string'
  ) {
    return null;
  }

  const canvasUrl = value.canvasUrl.trim();
  const canvasToken = value.canvasToken.trim();
  if (!canvasUrl && !canvasToken) {
    return emptyCanvasSettings();
  }
  if (!canvasUrl || !canvasToken) {
    return null;
  }

  const safeUrl = getSafeHttpsUrl(canvasUrl);
  if (!safeUrl) {
    return null;
  }

  return {
    canvasUrl: new URL(safeUrl).origin,
    canvasToken,
  };
}

async function discardCorruptedValue(key: keyof LocalStorageSchema): Promise<void> {
  try {
    await removeStoredValue(key);
  } catch {
    // The validated fallback remains safe even if Chrome cannot self-heal storage yet.
  }
}

async function replaceCorruptedValue<K extends keyof LocalStorageSchema>(
  key: K,
  value: LocalStorageSchema[K],
): Promise<void> {
  try {
    await setStoredValue(key, value);
  } catch {
    // Return sanitized data now and retry normalization the next time storage is read.
  }
}

function isAssignmentSyncResult(value: unknown): value is AssignmentSyncResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.courses) ||
    !Array.isArray(value.assignments) ||
    !isTimestamp(value.lastSyncedAt) ||
    (value.failedCourseCount !== undefined && !isNonNegativeInteger(value.failedCourseCount))
  ) {
    return false;
  }

  return (
    value.courses.every(isCanvasCourse) &&
    value.assignments.every(isNormalizedAssignment) &&
    (value.failedCourseCount === undefined || value.failedCourseCount <= value.courses.length)
  );
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
    isSafeHttpsUrl(value.htmlUrl) &&
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

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}
