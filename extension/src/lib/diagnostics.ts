import type { AssignmentSyncResult } from '../types';
import { parseReminderAlarmName } from './reminders.js';
import { getAssignmentCache } from './storage.js';

export interface ExtensionDiagnostics {
  lastSuccessfulSyncAt: string | null;
  cachedAssignmentCount: number;
  scheduledReminderAlarmCount: number | null;
  latestPartialSyncWarning: string | null;
}

export function buildExtensionDiagnostics(
  cache: AssignmentSyncResult | null,
  alarmNames: readonly string[] | null,
): ExtensionDiagnostics {
  return {
    lastSuccessfulSyncAt: cache?.lastSyncedAt ?? null,
    cachedAssignmentCount: cache?.assignments.length ?? 0,
    scheduledReminderAlarmCount:
      alarmNames === null
        ? null
        : alarmNames.filter((alarmName) => parseReminderAlarmName(alarmName) !== null).length,
    latestPartialSyncWarning: formatPartialSyncWarning(cache?.failedCourseCount ?? 0),
  };
}

export async function getExtensionDiagnostics(): Promise<ExtensionDiagnostics> {
  const [cacheResult, alarmNamesResult] = await Promise.allSettled([
    getAssignmentCache(),
    getReminderAlarmNames(),
  ]);

  return buildExtensionDiagnostics(
    cacheResult.status === 'fulfilled' ? cacheResult.value : null,
    alarmNamesResult.status === 'fulfilled' ? alarmNamesResult.value : null,
  );
}

export function formatPartialSyncWarning(failedCourseCount: number): string | null {
  if (!Number.isSafeInteger(failedCourseCount) || failedCourseCount <= 0) {
    return null;
  }

  const courseLabel = failedCourseCount === 1 ? 'course' : 'courses';
  return `${failedCourseCount} ${courseLabel} could not be synced. Assignments from successful courses were kept.`;
}

function getReminderAlarmNames(): Promise<string[] | null> {
  if (typeof chrome === 'undefined' || !chrome.alarms?.getAll) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      chrome.alarms.getAll((alarms) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }

        resolve(alarms.map(({ name }) => name));
      });
    } catch {
      resolve(null);
    }
  });
}
