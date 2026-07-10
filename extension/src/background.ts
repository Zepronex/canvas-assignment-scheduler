const DEADLINE_SYNC_ALARM = 'deadline-sync';

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(DEADLINE_SYNC_ALARM, {
    periodInMinutes: 60,
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== DEADLINE_SYNC_ALARM) {
    return;
  }

  // Assignment fetching and notification scheduling will be wired in a later migration step.
});

export {};
