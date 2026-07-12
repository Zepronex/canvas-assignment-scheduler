import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearAssignmentCache,
  getAssignmentCache,
  getReminderDeliveryHistory,
  getReminderSettings,
  markReminderDelivered,
  saveReminderSettings,
  saveSettings,
  saveAssignmentCache,
  STORAGE_KEYS,
} from '../.test-build/lib/storage.js';

test('assignment cache saves, loads, and clears a sync result', async () => {
  const storedValues = installChromeStorage();
  const result = assignmentSyncResult();

  await saveAssignmentCache(result);
  assert.deepEqual(storedValues[STORAGE_KEYS.assignmentCache], result);
  assert.deepEqual(await getAssignmentCache(), result);

  await clearAssignmentCache();
  assert.equal(await getAssignmentCache(), null);
});

test('assignment cache remains available regardless of sync age', async () => {
  installChromeStorage({
    [STORAGE_KEYS.assignmentCache]: assignmentSyncResult({
      lastSyncedAt: '2020-01-01T00:00:00.000Z',
    }),
  });

  assert.equal((await getAssignmentCache())?.lastSyncedAt, '2020-01-01T00:00:00.000Z');
});

test('assignment cache ignores legacy and malformed values', async () => {
  const storedValues = installChromeStorage({
    [STORAGE_KEYS.assignmentCache]: {
      assignments: [],
      courses: [],
      savedAt: Date.now(),
      user: null,
    },
  });

  assert.equal(await getAssignmentCache(), null);

  storedValues[STORAGE_KEYS.assignmentCache] = assignmentSyncResult({
    assignments: [{ ...normalizedAssignment(), dueAt: 'not-a-date' }],
  });
  assert.equal(await getAssignmentCache(), null);
});

test('changing Canvas settings clears cache from the previous account', async () => {
  const storedValues = installChromeStorage({
    [STORAGE_KEYS.settings]: {
      canvasUrl: 'https://old-canvas.example.edu',
      canvasToken: 'old-token',
    },
    [STORAGE_KEYS.assignmentCache]: assignmentSyncResult(),
  });

  await saveSettings({
    canvasUrl: ' https://new-canvas.example.edu ',
    canvasToken: ' new-token ',
  });

  assert.equal(storedValues[STORAGE_KEYS.assignmentCache], undefined);
  assert.deepEqual(storedValues[STORAGE_KEYS.settings], {
    canvasUrl: 'https://new-canvas.example.edu',
    canvasToken: 'new-token',
  });
});

test('saving unchanged Canvas settings preserves the current cache', async () => {
  const result = assignmentSyncResult();
  const settings = {
    canvasUrl: 'https://canvas.example.edu',
    canvasToken: 'token-value',
  };
  const storedValues = installChromeStorage({
    [STORAGE_KEYS.settings]: settings,
    [STORAGE_KEYS.assignmentCache]: result,
  });

  await saveSettings(settings);

  assert.deepEqual(storedValues[STORAGE_KEYS.assignmentCache], result);
});

test('reminders default to disabled with all supported windows selected', async () => {
  installChromeStorage();

  assert.deepEqual(await getReminderSettings(), {
    enabled: false,
    windows: [10080, 1440, 120, 30],
  });
});

test('reminder settings are normalized and require a window when enabled', async () => {
  const storedValues = installChromeStorage();

  await saveReminderSettings({ enabled: true, windows: [1440, 30, 30] });
  assert.deepEqual(storedValues[STORAGE_KEYS.reminderSettings], {
    enabled: true,
    windows: [1440, 30],
  });
  await assert.rejects(
    saveReminderSettings({ enabled: true, windows: [] }),
    /Select at least one reminder window/,
  );
});

test('delivered reminder history stores notification click routes without credentials', async () => {
  const storedValues = installChromeStorage();

  await markReminderDelivered(
    'alarm-id',
    'https://canvas.example.edu/courses/42/assignments/7',
    1_750_000_000_000,
  );

  assert.deepEqual(await getReminderDeliveryHistory(), {
    'alarm-id': {
      deliveredAt: 1_750_000_000_000,
      assignmentUrl: 'https://canvas.example.edu/courses/42/assignments/7',
    },
  });
  assert.equal(JSON.stringify(storedValues).includes('token-value'), false);
});

function installChromeStorage(initialValues = {}) {
  const values = { ...initialValues };

  globalThis.chrome = {
    runtime: {
      lastError: undefined,
    },
    storage: {
      local: {
        get(key, callback) {
          callback({ [key]: values[key] });
        },
        set(items, callback) {
          Object.assign(values, items);
          callback();
        },
        remove(key, callback) {
          delete values[key];
          callback();
        },
      },
    },
  };

  return values;
}

function assignmentSyncResult(overrides = {}) {
  return {
    courses: [{ id: 42, name: 'Algorithms', course_code: 'CS 301' }],
    assignments: [normalizedAssignment()],
    lastSyncedAt: '2026-07-10T08:30:00.000Z',
    ...overrides,
  };
}

function normalizedAssignment() {
  return {
    id: 7,
    courseId: 42,
    courseName: 'Algorithms',
    name: 'Problem set',
    dueAt: '2026-07-12T14:00:00Z',
    htmlUrl: 'https://canvas.example.edu/courses/42/assignments/7',
    pointsPossible: 10,
    workflowState: 'published',
    updatedAt: '2026-07-10T08:00:00Z',
  };
}
