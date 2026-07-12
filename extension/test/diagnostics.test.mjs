import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildExtensionDiagnostics,
  formatPartialSyncWarning,
  getExtensionDiagnostics,
} from '../.test-build/lib/diagnostics.js';

const REMINDER_NAME = 'canvas-deadline:reminder:v1:42:7:30:1784541600000';

test('builds concise diagnostics from validated cache and reminder alarms', () => {
  const diagnostics = buildExtensionDiagnostics(
    assignmentSyncResult({ failedCourseCount: 1 }),
    [REMINDER_NAME, 'unrelated-alarm', 'canvas-deadline:reminder:v1:malformed'],
  );

  assert.deepEqual(diagnostics, {
    lastSuccessfulSyncAt: '2026-07-10T08:30:00.000Z',
    cachedAssignmentCount: 1,
    scheduledReminderAlarmCount: 1,
    latestPartialSyncWarning:
      '1 course could not be synced. Assignments from successful courses were kept.',
  });
  assert.equal(JSON.stringify(diagnostics).includes('canvasToken'), false);
});

test('uses safe empty and unavailable diagnostics fallbacks', () => {
  assert.deepEqual(buildExtensionDiagnostics(null, null), {
    lastSuccessfulSyncAt: null,
    cachedAssignmentCount: 0,
    scheduledReminderAlarmCount: null,
    latestPartialSyncWarning: null,
  });
  assert.equal(formatPartialSyncWarning(0), null);
  assert.equal(formatPartialSyncWarning(Number.NaN), null);
  assert.equal(
    formatPartialSyncWarning(2),
    '2 courses could not be synced. Assignments from successful courses were kept.',
  );
});

test('reads diagnostics with mocked Chrome APIs and tolerates alarm failures', async () => {
  installChromeApis(assignmentSyncResult(), [REMINDER_NAME]);
  assert.deepEqual(await getExtensionDiagnostics(), {
    lastSuccessfulSyncAt: '2026-07-10T08:30:00.000Z',
    cachedAssignmentCount: 1,
    scheduledReminderAlarmCount: 1,
    latestPartialSyncWarning: null,
  });

  installChromeApis(assignmentSyncResult(), [], { message: 'private browser failure' });
  const diagnostics = await getExtensionDiagnostics();
  assert.equal(diagnostics.cachedAssignmentCount, 1);
  assert.equal(diagnostics.scheduledReminderAlarmCount, null);
  assert.equal(JSON.stringify(diagnostics).includes('private browser failure'), false);
});

function installChromeApis(cache, alarms, alarmsError) {
  globalThis.chrome = {
    runtime: { lastError: undefined },
    storage: {
      local: {
        get(key, callback) {
          callback({ [key]: key === 'assignmentCache' ? cache : undefined });
        },
        set(_items, callback) {
          callback();
        },
        remove(_key, callback) {
          callback();
        },
      },
    },
    alarms: {
      getAll(callback) {
        globalThis.chrome.runtime.lastError = alarmsError;
        try {
          callback(alarms.map((name) => ({ name, scheduledTime: Date.now() + 60_000 })));
        } finally {
          globalThis.chrome.runtime.lastError = undefined;
        }
      },
    },
  };
}

function assignmentSyncResult(overrides = {}) {
  return {
    courses: [{ id: 42, name: 'Algorithms' }],
    assignments: [
      {
        id: 7,
        courseId: 42,
        courseName: 'Algorithms',
        name: 'Problem set',
        dueAt: '2026-07-20T10:00:00.000Z',
        htmlUrl: 'https://canvas.example.edu/courses/42/assignments/7',
        pointsPossible: 10,
        workflowState: 'published',
        updatedAt: '2026-07-10T08:00:00.000Z',
      },
    ],
    lastSyncedAt: '2026-07-10T08:30:00.000Z',
    ...overrides,
  };
}
