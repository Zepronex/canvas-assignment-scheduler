import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReminderAlarmName,
  buildReminderSchedule,
  getReminderNotificationUrl,
  parseReminderAlarmName,
  reconcileReminderAlarms,
} from '../.test-build/lib/reminders.js';
import { applyReminderAlarmReconciliation } from '../.test-build/lib/reminderRuntime.js';

const NOW = new Date('2026-07-12T10:00:00.000Z');

test('schedules eligible future deadlines, including later today', () => {
  const reminders = buildReminderSchedule(
    [assignment({ dueAt: '2026-07-12T14:00:00.000Z' })],
    reminderSettings([120, 30]),
    NOW,
  );

  assert.deepEqual(
    reminders.map(({ windowMinutes, scheduledTime }) => [windowMinutes, scheduledTime]),
    [
      [120, Date.parse('2026-07-12T12:00:00.000Z')],
      [30, Date.parse('2026-07-12T13:30:00.000Z')],
    ],
  );
});

test('excludes overdue, no-date, and unpublished assignments', () => {
  const reminders = buildReminderSchedule(
    [
      assignment({ id: 1, dueAt: '2026-07-12T09:59:59.000Z' }),
      assignment({ id: 2, dueAt: null }),
      assignment({ id: 3, workflowState: 'unpublished' }),
    ],
    reminderSettings([30]),
    NOW,
  );

  assert.deepEqual(reminders, []);
});

test('supports multiple windows while ignoring windows whose send time has passed', () => {
  const reminders = buildReminderSchedule(
    [assignment({ dueAt: '2026-07-14T10:00:00.000Z' })],
    reminderSettings([10080, 1440, 120, 30]),
    NOW,
  );

  assert.deepEqual(
    reminders.map(({ windowMinutes }) => windowMinutes),
    [1440, 120, 30],
  );
});

test('disabled reminders produce no schedule', () => {
  const reminders = buildReminderSchedule(
    [assignment()],
    { enabled: false, windows: [30] },
    NOW,
  );

  assert.deepEqual(reminders, []);
});

test('alarm identifiers are deterministic and due-date-versioned', () => {
  const identity = {
    courseId: 42,
    assignmentId: 7,
    windowMinutes: 30,
    dueAtTimestamp: Date.parse('2026-07-20T10:00:00.000Z'),
  };
  const alarmName = buildReminderAlarmName(identity);

  assert.equal(
    alarmName,
    'canvas-deadline:reminder:v1:42:7:30:1784541600000',
  );
  assert.deepEqual(parseReminderAlarmName(alarmName), identity);
  assert.equal(parseReminderAlarmName('unrelated-alarm'), null);
});

test('duplicate assignments and windows create one alarm per deterministic identifier', () => {
  const repeatedAssignment = assignment();
  const reminders = buildReminderSchedule(
    [repeatedAssignment, repeatedAssignment],
    reminderSettings([30, 30]),
    NOW,
  );

  assert.equal(reminders.length, 1);
});

test('delivered reminder identifiers are never scheduled again', () => {
  const initial = buildReminderSchedule([assignment()], reminderSettings([30]), NOW);
  const rebuilt = buildReminderSchedule(
    [assignment()],
    reminderSettings([30]),
    NOW,
    new Set([initial[0].alarmName]),
  );

  assert.deepEqual(rebuilt, []);
});

test('reconciliation prevents duplicate alarms and clears stale due-date alarms', () => {
  const oldSchedule = buildReminderSchedule(
    [assignment({ dueAt: '2026-07-20T10:00:00.000Z' })],
    reminderSettings([30]),
    NOW,
  );
  const newSchedule = buildReminderSchedule(
    [assignment({ dueAt: '2026-07-21T10:00:00.000Z' })],
    reminderSettings([30]),
    NOW,
  );
  const reconciliation = reconcileReminderAlarms(
    [oldSchedule[0].alarmName, newSchedule[0].alarmName, 'some-other-feature'],
    newSchedule,
  );

  assert.deepEqual(reconciliation.alarmsToCreate, []);
  assert.deepEqual(reconciliation.alarmNamesToClear, [oldSchedule[0].alarmName]);
});

test('partial sync results schedule valid assignments from successful courses', () => {
  const partialSyncCache = {
    assignments: [assignment({ courseId: 10 }), assignment({ id: 8, courseId: 20 })],
    failedCourseCount: 1,
  };
  const reminders = buildReminderSchedule(
    partialSyncCache.assignments,
    reminderSettings([30]),
    NOW,
  );

  assert.deepEqual(
    reminders.map(({ courseId, assignmentId }) => [courseId, assignmentId]),
    [
      [10, 7],
      [20, 8],
    ],
  );
});

test('alarm API reconciliation clears stale alarms before creating missing alarms', async () => {
  const schedule = buildReminderSchedule([assignment()], reminderSettings([30]), NOW);
  const calls = [];

  await applyReminderAlarmReconciliation(
    {
      alarmNamesToClear: ['stale-alarm'],
      alarmsToCreate: schedule,
    },
    {
      async clear(alarmName) {
        calls.push(['clear', alarmName]);
      },
      create(alarmName, scheduledTime) {
        calls.push(['create', alarmName, scheduledTime]);
      },
    },
  );

  assert.deepEqual(calls, [
    ['clear', 'stale-alarm'],
    ['create', schedule[0].alarmName, schedule[0].scheduledTime],
  ]);
});

test('notification click routing accepts only stored HTTPS assignment URLs', () => {
  const notificationId = 'canvas-deadline:reminder:v1:42:7:30:1784541600000';
  assert.equal(
    getReminderNotificationUrl(
      {
        [notificationId]: {
          deliveredAt: NOW.getTime(),
          assignmentUrl: 'https://canvas.example.edu/courses/42/assignments/7',
        },
      },
      notificationId,
    ),
    'https://canvas.example.edu/courses/42/assignments/7',
  );
  assert.equal(
    getReminderNotificationUrl(
      {
        [notificationId]: {
          deliveredAt: NOW.getTime(),
          assignmentUrl: 'javascript:alert(1)',
        },
      },
      notificationId,
    ),
    null,
  );
});

function reminderSettings(windows) {
  return { enabled: true, windows };
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
