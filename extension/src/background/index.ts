import { ASSIGNMENTS_UPDATED_MESSAGE } from '../lib/messages';
import { applyReminderAlarmReconciliation } from '../lib/reminderRuntime';
import {
  buildReminderSchedule,
  findAssignmentForReminder,
  formatReminderTimeRemaining,
  getReminderNotificationUrl,
  parseReminderAlarmName,
  reconcileReminderAlarms,
  REMINDER_ALARM_PREFIX,
} from '../lib/reminders';
import {
  getAssignmentCache,
  getReminderDeliveryHistory,
  getReminderSettings,
  markReminderDelivered,
  STORAGE_KEYS,
} from '../lib/storage';

let rebuildQueue = Promise.resolve();
let alarmQueue = Promise.resolve();

chrome.runtime.onInstalled.addListener(() => requestReminderRebuild());
chrome.runtime.onStartup.addListener(() => requestReminderRebuild());

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isAssignmentsUpdatedMessage(message)) {
    requestReminderRebuild();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === 'local' &&
    (STORAGE_KEYS.assignmentCache in changes || STORAGE_KEYS.reminderSettings in changes)
  ) {
    requestReminderRebuild();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(REMINDER_ALARM_PREFIX)) {
    return;
  }

  alarmQueue = alarmQueue
    .catch(() => undefined)
    .then(() => handleReminderAlarm(alarm.name))
    .catch(() => undefined);
});

chrome.notifications.onClicked.addListener((notificationId) => {
  void openReminderNotification(notificationId);
});

function requestReminderRebuild(): void {
  rebuildQueue = rebuildQueue
    .catch(() => undefined)
    .then(() => rebuildReminderAlarms())
    .catch(() => undefined);
}

async function rebuildReminderAlarms(): Promise<void> {
  const [cache, settings, history, existingAlarms] = await Promise.all([
    getAssignmentCache(),
    getReminderSettings(),
    getReminderDeliveryHistory(),
    getAllAlarms(),
  ]);
  const desiredReminders = buildReminderSchedule(
    cache?.assignments ?? [],
    settings,
    new Date(),
    new Set(Object.keys(history)),
  );
  const reconciliation = reconcileReminderAlarms(
    existingAlarms.map(({ name }) => name),
    desiredReminders,
  );

  await applyReminderAlarmReconciliation(reconciliation, {
    clear: clearAlarm,
    create(alarmName, scheduledTime) {
      chrome.alarms.create(alarmName, { when: scheduledTime });
    },
  });
}

async function handleReminderAlarm(alarmName: string): Promise<void> {
  const identity = parseReminderAlarmName(alarmName);
  if (!identity) {
    return;
  }

  const [cache, settings, history] = await Promise.all([
    getAssignmentCache(),
    getReminderSettings(),
    getReminderDeliveryHistory(),
  ]);
  if (
    !cache ||
    !settings.enabled ||
    !settings.windows.includes(identity.windowMinutes) ||
    history[alarmName] ||
    identity.dueAtTimestamp <= Date.now()
  ) {
    return;
  }

  const assignment = findAssignmentForReminder(cache.assignments, identity);
  if (!assignment) {
    return;
  }

  const assignmentUrl = getSafeHttpsUrl(assignment.htmlUrl);
  await markReminderDelivered(alarmName, assignmentUrl);
  await createNotification(alarmName, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon128.png'),
    title: assignment.name,
    message: `${assignment.courseName} · Due ${formatDueAt(identity.dueAtTimestamp)}`,
    contextMessage: `Canvas deadline · ${formatReminderTimeRemaining(identity.windowMinutes)} reminder`,
    priority: 1,
  });
}

async function openReminderNotification(notificationId: string): Promise<void> {
  if (!notificationId.startsWith(REMINDER_ALARM_PREFIX)) {
    return;
  }

  const history = await getReminderDeliveryHistory();
  const assignmentUrl = getReminderNotificationUrl(history, notificationId);
  if (assignmentUrl) {
    await chrome.tabs.create({ url: assignmentUrl });
  }
  await clearNotification(notificationId);
}

function getAllAlarms(): Promise<chrome.alarms.Alarm[]> {
  return new Promise((resolve) => chrome.alarms.getAll(resolve));
}

function clearAlarm(alarmName: string): Promise<void> {
  return new Promise((resolve) => chrome.alarms.clear(alarmName, () => resolve()));
}

function createNotification(
  notificationId: string,
  options: chrome.notifications.NotificationOptions<true>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.notifications.create(notificationId, options, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error('Unable to create the deadline notification.'));
        return;
      }
      resolve();
    });
  });
}

function clearNotification(notificationId: string): Promise<void> {
  return new Promise((resolve) => chrome.notifications.clear(notificationId, () => resolve()));
}

function formatDueAt(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function getSafeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function isAssignmentsUpdatedMessage(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'type' in value &&
      value.type === ASSIGNMENTS_UPDATED_MESSAGE,
  );
}
