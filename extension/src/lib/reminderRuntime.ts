import type {
  NormalizedAssignment,
  ReminderSettings,
} from '../types';
import {
  buildReminderSchedule,
  reconcileReminderAlarms,
  type ReminderAlarmReconciliation,
} from './reminders.js';

export interface ReminderAlarmSummary {
  name: string;
}

export interface ReminderAlarmApi {
  getAll(): Promise<readonly ReminderAlarmSummary[]>;
  clear(alarmName: string): Promise<void>;
  create(alarmName: string, scheduledTime: number): Promise<void>;
}

export interface ReminderAlarmRebuildDependencies {
  getAssignments(): Promise<readonly NormalizedAssignment[]>;
  getSettings(): Promise<ReminderSettings>;
  getDeliveredAlarmNames(): Promise<ReadonlySet<string>>;
  alarms: ReminderAlarmApi;
  now?: () => Date;
}

export class ReminderAlarmReconciliationError extends Error {
  readonly clearFailureCount: number;
  readonly createFailureCount: number;

  constructor(clearFailureCount: number, createFailureCount: number) {
    super('Unable to fully restore browser reminders.');
    this.name = 'ReminderAlarmReconciliationError';
    this.clearFailureCount = clearFailureCount;
    this.createFailureCount = createFailureCount;
  }
}

export async function rebuildReminderAlarmSchedule(
  dependencies: ReminderAlarmRebuildDependencies,
): Promise<ReminderAlarmReconciliation> {
  const [assignments, settings, deliveredAlarmNames, existingAlarms] = await Promise.all([
    dependencies.getAssignments(),
    dependencies.getSettings(),
    dependencies.getDeliveredAlarmNames(),
    dependencies.alarms.getAll(),
  ]);
  const desiredReminders = buildReminderSchedule(
    assignments,
    settings,
    dependencies.now?.() ?? new Date(),
    deliveredAlarmNames,
  );
  const reconciliation = reconcileReminderAlarms(
    existingAlarms.map(({ name }) => name),
    desiredReminders,
  );

  await applyReminderAlarmReconciliation(reconciliation, dependencies.alarms);
  return reconciliation;
}

export async function applyReminderAlarmReconciliation(
  reconciliation: ReminderAlarmReconciliation,
  alarms: ReminderAlarmApi,
): Promise<void> {
  const clearResults = await Promise.allSettled(
    reconciliation.alarmNamesToClear.map((alarmName) =>
      Promise.resolve().then(() => alarms.clear(alarmName)),
    ),
  );
  const createResults = await Promise.allSettled(
    reconciliation.alarmsToCreate.map((reminder) =>
      Promise.resolve().then(() =>
        alarms.create(reminder.alarmName, reminder.scheduledTime),
      ),
    ),
  );
  const clearFailureCount = countRejected(clearResults);
  const createFailureCount = countRejected(createResults);

  if (clearFailureCount || createFailureCount) {
    throw new ReminderAlarmReconciliationError(clearFailureCount, createFailureCount);
  }
}

export async function createNotificationThenRecordDelivery(
  createNotification: () => Promise<void>,
  recordDelivery: () => Promise<void>,
): Promise<void> {
  await createNotification();
  await recordDelivery();
}

export async function openNotificationAndAlwaysCleanup(
  resolveUrl: () => Promise<string | null>,
  openUrl: (url: string) => Promise<void>,
  cleanup: () => Promise<void>,
): Promise<void> {
  try {
    const url = await resolveUrl();
    if (url) {
      await openUrl(url);
    }
  } catch {
    // A click must never leave an unhandled service-worker rejection.
  } finally {
    try {
      await cleanup();
    } catch {
      // Notification cleanup is best effort after the user clicks it.
    }
  }
}

function countRejected(results: readonly PromiseSettledResult<unknown>[]): number {
  return results.filter(({ status }) => status === 'rejected').length;
}
