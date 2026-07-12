import type { ReminderAlarmReconciliation } from './reminders';

export interface ReminderAlarmApi {
  clear(alarmName: string): Promise<void>;
  create(alarmName: string, scheduledTime: number): void;
}

export async function applyReminderAlarmReconciliation(
  reconciliation: ReminderAlarmReconciliation,
  alarms: ReminderAlarmApi,
): Promise<void> {
  await Promise.all(
    reconciliation.alarmNamesToClear.map((alarmName) => alarms.clear(alarmName)),
  );

  for (const reminder of reconciliation.alarmsToCreate) {
    alarms.create(reminder.alarmName, reminder.scheduledTime);
  }
}
