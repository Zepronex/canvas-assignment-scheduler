import { isAssignmentsUpdatedMessage } from '../lib/messages';
import {
  createNotificationThenRecordDelivery,
  openNotificationAndAlwaysCleanup,
  rebuildReminderAlarmSchedule,
  type ReminderAlarmApi,
} from '../lib/reminderRuntime';
import {
  findAssignmentForReminder,
  formatReminderTimeRemaining,
  getReminderNotificationUrl,
  parseReminderAlarmName,
  REMINDER_ALARM_PREFIX,
} from '../lib/reminders';
import {
  getAssignmentCache,
  getReminderDeliveryHistory,
  getReminderSettings,
  markReminderDelivered,
  STORAGE_KEYS,
} from '../lib/storage';
import { getSafeHttpsUrl } from '../lib/urls';

let rebuildQueue = Promise.resolve();
let alarmQueue = Promise.resolve();
const reminderAlarmApi: ReminderAlarmApi = {
  getAll: getAllAlarms,
  clear: clearAlarm,
  create: createAlarm,
};

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
  void openReminderNotification(notificationId).catch(() => undefined);
});

// Alarm persistence is not guaranteed across every Chrome version or update.
// Reconcile whenever the service worker is loaded, in addition to lifecycle events.
requestReminderRebuild();

function requestReminderRebuild(): void {
  rebuildQueue = rebuildQueue
    .catch(() => undefined)
    .then(() => rebuildReminderAlarms())
    .catch(() => undefined);
}

async function rebuildReminderAlarms(): Promise<void> {
  await rebuildReminderAlarmSchedule({
    async getAssignments() {
      return (await getAssignmentCache())?.assignments ?? [];
    },
    getSettings: getReminderSettings,
    async getDeliveredAlarmNames() {
      const history = await getReminderDeliveryHistory();
      return new Set(Object.keys(history));
    },
    alarms: reminderAlarmApi,
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
  await createNotificationThenRecordDelivery(
    () =>
      createNotification(alarmName, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon128.png'),
        title: assignment.name,
        message: `${assignment.courseName} · Due ${formatDueAt(identity.dueAtTimestamp)}`,
        contextMessage: `Canvas deadline · ${formatReminderTimeRemaining(identity.windowMinutes)} reminder`,
        priority: 1,
      }),
    () => markReminderDelivered(alarmName, assignmentUrl),
  );
}

async function openReminderNotification(notificationId: string): Promise<void> {
  if (!notificationId.startsWith(REMINDER_ALARM_PREFIX)) {
    return;
  }

  await openNotificationAndAlwaysCleanup(
    async () => {
      const history = await getReminderDeliveryHistory();
      return getReminderNotificationUrl(history, notificationId);
    },
    openTab,
    () => clearNotification(notificationId),
  );
}

function getAllAlarms(): Promise<chrome.alarms.Alarm[]> {
  return new Promise((resolve, reject) => {
    try {
      chrome.alarms.getAll((alarms) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Unable to read scheduled browser reminders.'));
          return;
        }

        resolve(Array.isArray(alarms) ? alarms : []);
      });
    } catch {
      reject(new Error('Unable to read scheduled browser reminders.'));
    }
  });
}

function clearAlarm(alarmName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.alarms.clear(alarmName, () => {
        if (chrome.runtime.lastError) {
          reject(new Error('Unable to remove a stale browser reminder.'));
          return;
        }

        resolve();
      });
    } catch {
      reject(new Error('Unable to remove a stale browser reminder.'));
    }
  });
}

function createAlarm(alarmName: string, scheduledTime: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.alarms.create(alarmName, { when: scheduledTime }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error('Unable to schedule a browser reminder.'));
          return;
        }

        resolve();
      });
    } catch {
      reject(new Error('Unable to schedule a browser reminder.'));
    }
  });
}

function createNotification(
  notificationId: string,
  options: chrome.notifications.NotificationOptions<true>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.notifications.create(notificationId, options, () => {
        if (chrome.runtime.lastError) {
          reject(new Error('Unable to create the deadline notification.'));
          return;
        }
        resolve();
      });
    } catch {
      reject(new Error('Unable to create the deadline notification.'));
    }
  });
}

function openTab(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.create({ url }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error('Unable to open the Canvas assignment.'));
          return;
        }

        resolve();
      });
    } catch {
      reject(new Error('Unable to open the Canvas assignment.'));
    }
  });
}

function clearNotification(notificationId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.notifications.clear(notificationId, () => {
        if (chrome.runtime.lastError) {
          reject(new Error('Unable to clear the deadline notification.'));
          return;
        }

        resolve();
      });
    } catch {
      reject(new Error('Unable to clear the deadline notification.'));
    }
  });
}

function formatDueAt(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}
