import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createNotificationThenRecordDelivery,
  openNotificationAndAlwaysCleanup,
  rebuildReminderAlarmSchedule,
  ReminderAlarmReconciliationError,
} from '../.test-build/lib/reminderRuntime.js';
import {
  buildReminderAlarmName,
  buildReminderSchedule,
} from '../.test-build/lib/reminders.js';

const NOW = new Date('2026-07-12T10:00:00.000Z');

test('rebuild restores missing reminders, preserves existing reminders, and clears stale alarms', async () => {
  const assignments = [assignment(), assignment({ id: 8 })];
  const desired = buildReminderSchedule(assignments, reminderSettings(), NOW);
  const staleAlarmName = buildReminderAlarmName({
    courseId: 42,
    assignmentId: 99,
    windowMinutes: 30,
    dueAtTimestamp: Date.parse('2026-07-19T10:00:00.000Z'),
  });
  const unrelatedAlarmName = 'another-extension-feature';
  const existingAlarmNames = new Set([
    desired[0].alarmName,
    staleAlarmName,
    unrelatedAlarmName,
  ]);
  const calls = [];

  const reconciliation = await rebuildReminderAlarmSchedule({
    async getAssignments() {
      return assignments;
    },
    async getSettings() {
      return reminderSettings();
    },
    async getDeliveredAlarmNames() {
      return new Set();
    },
    alarms: alarmApi(existingAlarmNames, calls),
    now: () => NOW,
  });

  assert.deepEqual(reconciliation.alarmNamesToClear, [staleAlarmName]);
  assert.deepEqual(
    reconciliation.alarmsToCreate.map(({ alarmName }) => alarmName),
    [desired[1].alarmName],
  );
  assert.deepEqual(calls, [
    ['getAll'],
    ['clear', staleAlarmName],
    ['create', desired[1].alarmName, desired[1].scheduledTime],
  ]);
  assert.deepEqual(
    [...existingAlarmNames].sort(),
    [desired[0].alarmName, desired[1].alarmName, unrelatedAlarmName].sort(),
  );
});

test('failed clear and create operations do not block other work and retry on the next rebuild', async () => {
  const assignments = [assignment(), assignment({ id: 8 })];
  const desired = buildReminderSchedule(assignments, reminderSettings(), NOW);
  const staleAlarmName = buildReminderAlarmName({
    courseId: 42,
    assignmentId: 99,
    windowMinutes: 30,
    dueAtTimestamp: Date.parse('2026-07-19T10:00:00.000Z'),
  });
  const existingAlarmNames = new Set([staleAlarmName]);
  const calls = [];
  let failedClear = false;
  let failedCreate = false;
  const alarms = alarmApi(existingAlarmNames, calls, {
    clear(alarmName) {
      if (!failedClear && alarmName === staleAlarmName) {
        failedClear = true;
        throw new Error('sensitive low-level clear failure');
      }
    },
    create(alarmName) {
      if (!failedCreate && alarmName === desired[0].alarmName) {
        failedCreate = true;
        throw new Error('sensitive low-level create failure');
      }
    },
  });
  const dependencies = {
    async getAssignments() {
      return assignments;
    },
    async getSettings() {
      return reminderSettings();
    },
    async getDeliveredAlarmNames() {
      return new Set();
    },
    alarms,
    now: () => NOW,
  };

  await assert.rejects(
    rebuildReminderAlarmSchedule(dependencies),
    (error) => {
      assert.ok(error instanceof ReminderAlarmReconciliationError);
      assert.equal(error.clearFailureCount, 1);
      assert.equal(error.createFailureCount, 1);
      assert.equal(error.message, 'Unable to fully restore browser reminders.');
      return true;
    },
  );

  assert.equal(existingAlarmNames.has(staleAlarmName), true);
  assert.equal(existingAlarmNames.has(desired[0].alarmName), false);
  assert.equal(existingAlarmNames.has(desired[1].alarmName), true);

  calls.length = 0;
  await rebuildReminderAlarmSchedule(dependencies);

  assert.deepEqual(calls, [
    ['getAll'],
    ['clear', staleAlarmName],
    ['create', desired[0].alarmName, desired[0].scheduledTime],
  ]);
  assert.deepEqual(
    [...existingAlarmNames].sort(),
    desired.map(({ alarmName }) => alarmName).sort(),
  );
});

test('notification delivery is recorded only after notification creation succeeds', async () => {
  const calls = [];

  await createNotificationThenRecordDelivery(
    async () => calls.push('create'),
    async () => calls.push('record'),
  );
  assert.deepEqual(calls, ['create', 'record']);

  calls.length = 0;
  await assert.rejects(
    createNotificationThenRecordDelivery(
      async () => {
        calls.push('create');
        throw new Error('notification unavailable');
      },
      async () => calls.push('record'),
    ),
    /notification unavailable/,
  );
  assert.deepEqual(calls, ['create']);
});

test('notification click cleanup runs after open or lookup failure and cleanup errors are contained', async () => {
  const openFailureCalls = [];
  await assert.doesNotReject(
    openNotificationAndAlwaysCleanup(
      async () => {
        openFailureCalls.push('resolve');
        return 'https://canvas.example.edu/assignments/7';
      },
      async (url) => {
        openFailureCalls.push(['open', url]);
        throw new Error('tab unavailable');
      },
      async () => openFailureCalls.push('cleanup'),
    ),
  );
  assert.deepEqual(openFailureCalls, [
    'resolve',
    ['open', 'https://canvas.example.edu/assignments/7'],
    'cleanup',
  ]);

  const lookupFailureCalls = [];
  await assert.doesNotReject(
    openNotificationAndAlwaysCleanup(
      async () => {
        lookupFailureCalls.push('resolve');
        throw new Error('storage unavailable');
      },
      async () => lookupFailureCalls.push('open'),
      async () => {
        lookupFailureCalls.push('cleanup');
        throw new Error('notification already gone');
      },
    ),
  );
  assert.deepEqual(lookupFailureCalls, ['resolve', 'cleanup']);
});

function alarmApi(existingAlarmNames, calls, failures = {}) {
  return {
    async getAll() {
      calls.push(['getAll']);
      return [...existingAlarmNames].map((name) => ({ name }));
    },
    async clear(alarmName) {
      calls.push(['clear', alarmName]);
      failures.clear?.(alarmName);
      existingAlarmNames.delete(alarmName);
    },
    async create(alarmName, scheduledTime) {
      calls.push(['create', alarmName, scheduledTime]);
      failures.create?.(alarmName, scheduledTime);
      existingAlarmNames.add(alarmName);
    },
  };
}

function reminderSettings() {
  return { enabled: true, windows: [30] };
}

function assignment(overrides = {}) {
  return {
    id: 7,
    courseId: 42,
    courseName: 'Algorithms',
    name: 'Problem set',
    dueAt: '2026-07-20T10:00:00.000Z',
    htmlUrl: 'https://canvas.example.edu/courses/42/assignments/7',
    pointsPossible: 10,
    workflowState: 'published',
    updatedAt: '2026-07-10T08:00:00.000Z',
    ...overrides,
  };
}
