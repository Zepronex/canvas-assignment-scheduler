import type {
  NormalizedAssignment,
  ReminderDeliveryHistory,
  ReminderSettings,
  ReminderWindowMinutes,
} from '../types';
import { getSafeHttpsUrl } from './urls.js';

export const REMINDER_ALARM_PREFIX = 'canvas-deadline:reminder:v1:';

export const REMINDER_WINDOW_OPTIONS: ReadonlyArray<{
  minutes: ReminderWindowMinutes;
  label: string;
}> = [
  { minutes: 10080, label: '7 days' },
  { minutes: 1440, label: '24 hours' },
  { minutes: 120, label: '2 hours' },
  { minutes: 30, label: '30 minutes' },
];

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  windows: REMINDER_WINDOW_OPTIONS.map(({ minutes }) => minutes),
};

export interface ReminderAlarmIdentity {
  courseId: number;
  assignmentId: number;
  windowMinutes: ReminderWindowMinutes;
  dueAtTimestamp: number;
}

export interface ScheduledReminder extends ReminderAlarmIdentity {
  alarmName: string;
  scheduledTime: number;
  assignment: NormalizedAssignment;
}

export interface ReminderAlarmReconciliation {
  alarmsToCreate: ScheduledReminder[];
  alarmNamesToClear: string[];
}

export function buildReminderAlarmName(identity: ReminderAlarmIdentity): string {
  return `${REMINDER_ALARM_PREFIX}${[
    identity.courseId,
    identity.assignmentId,
    identity.windowMinutes,
    identity.dueAtTimestamp,
  ].join(':')}`;
}

export function parseReminderAlarmName(alarmName: string): ReminderAlarmIdentity | null {
  if (!alarmName.startsWith(REMINDER_ALARM_PREFIX)) {
    return null;
  }

  const parts = alarmName.slice(REMINDER_ALARM_PREFIX.length).split(':');
  if (parts.length !== 4) {
    return null;
  }

  const [courseId, assignmentId, windowMinutes, dueAtTimestamp] = parts.map(Number);
  if (
    !isPositiveSafeInteger(courseId) ||
    !isPositiveSafeInteger(assignmentId) ||
    !isReminderWindow(windowMinutes) ||
    !Number.isSafeInteger(dueAtTimestamp) ||
    dueAtTimestamp <= 0
  ) {
    return null;
  }

  return { courseId, assignmentId, windowMinutes, dueAtTimestamp };
}

export function buildReminderSchedule(
  assignments: readonly NormalizedAssignment[],
  settings: ReminderSettings,
  now: Date = new Date(),
  deliveredAlarmNames: ReadonlySet<string> = new Set(),
): ScheduledReminder[] {
  if (!settings.enabled) {
    return [];
  }

  const nowTimestamp = now.getTime();
  const reminders = new Map<string, ScheduledReminder>();
  const windows = [...new Set(settings.windows)].filter(isReminderWindow);

  for (const assignment of assignments) {
    if (assignment.workflowState.toLowerCase() !== 'published' || !assignment.dueAt) {
      continue;
    }

    const dueAtTimestamp = Date.parse(assignment.dueAt);
    if (Number.isNaN(dueAtTimestamp) || dueAtTimestamp <= nowTimestamp) {
      continue;
    }

    for (const windowMinutes of windows) {
      const scheduledTime = dueAtTimestamp - windowMinutes * 60_000;
      if (scheduledTime <= nowTimestamp) {
        continue;
      }

      const identity = {
        courseId: assignment.courseId,
        assignmentId: assignment.id,
        windowMinutes,
        dueAtTimestamp,
      };
      const alarmName = buildReminderAlarmName(identity);
      if (deliveredAlarmNames.has(alarmName)) {
        continue;
      }

      reminders.set(alarmName, {
        ...identity,
        alarmName,
        scheduledTime,
        assignment,
      });
    }
  }

  return [...reminders.values()].sort(
    (first, second) =>
      first.scheduledTime - second.scheduledTime ||
      first.alarmName.localeCompare(second.alarmName),
  );
}

export function reconcileReminderAlarms(
  existingAlarmNames: readonly string[],
  desiredReminders: readonly ScheduledReminder[],
): ReminderAlarmReconciliation {
  const existingReminderNames = new Set(
    existingAlarmNames.filter((alarmName) => alarmName.startsWith(REMINDER_ALARM_PREFIX)),
  );
  const desiredByName = new Map(
    desiredReminders.map((reminder) => [reminder.alarmName, reminder]),
  );

  return {
    alarmsToCreate: [...desiredByName.values()].filter(
      (reminder) => !existingReminderNames.has(reminder.alarmName),
    ),
    alarmNamesToClear: [...existingReminderNames].filter(
      (alarmName) => !desiredByName.has(alarmName),
    ),
  };
}

export function findAssignmentForReminder(
  assignments: readonly NormalizedAssignment[],
  identity: ReminderAlarmIdentity,
): NormalizedAssignment | null {
  return (
    assignments.find(
      (assignment) =>
        assignment.id === identity.assignmentId &&
        assignment.courseId === identity.courseId &&
        assignment.dueAt !== null &&
        Date.parse(assignment.dueAt) === identity.dueAtTimestamp &&
        assignment.workflowState.toLowerCase() === 'published',
    ) ?? null
  );
}

export function formatReminderTimeRemaining(windowMinutes: ReminderWindowMinutes): string {
  return REMINDER_WINDOW_OPTIONS.find(({ minutes }) => minutes === windowMinutes)?.label ?? '';
}

export function getReminderNotificationUrl(
  history: ReminderDeliveryHistory,
  notificationId: string,
): string | null {
  const assignmentUrl = history[notificationId]?.assignmentUrl;
  if (!assignmentUrl) {
    return null;
  }

  return getSafeHttpsUrl(assignmentUrl);
}

export function isReminderWindow(value: number): value is ReminderWindowMinutes {
  return REMINDER_WINDOW_OPTIONS.some(({ minutes }) => minutes === value);
}

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}
