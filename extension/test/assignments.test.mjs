import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterAndSortAssignments,
  getAssignmentStatus,
  getAssignmentStatusCounts,
} from '../.test-build/lib/assignments.js';

const NOW = new Date(2026, 6, 11, 12, 0, 0);

test('classifies overdue, today, upcoming, and missing due dates', () => {
  const overdue = assignment({ dueAt: localIso(2026, 6, 10, 23, 59) });
  const todayEarlier = assignment({ dueAt: localIso(2026, 6, 11, 8, 0) });
  const todayLater = assignment({ dueAt: localIso(2026, 6, 11, 20, 0) });
  const upcoming = assignment({ dueAt: localIso(2026, 6, 12, 0, 0) });
  const noDate = assignment({ dueAt: null });

  assert.equal(getAssignmentStatus(overdue, NOW), 'overdue');
  assert.equal(getAssignmentStatus(todayEarlier, NOW), 'today');
  assert.equal(getAssignmentStatus(todayLater, NOW), 'today');
  assert.equal(getAssignmentStatus(upcoming, NOW), 'upcoming');
  assert.equal(getAssignmentStatus(noDate, NOW), 'no-date');
});

test('uses local calendar-day boundaries and excludes unpublished assignments', () => {
  const startOfToday = assignment({ dueAt: localIso(2026, 6, 11, 0, 0) });
  const endOfToday = assignment({ dueAt: localIso(2026, 6, 11, 23, 59, 59) });
  const priorDay = assignment({ dueAt: localIso(2026, 6, 10, 23, 59, 59) });
  const nextDay = assignment({ dueAt: localIso(2026, 6, 12, 0, 0) });
  const unpublished = assignment({ workflowState: 'unpublished' });

  assert.equal(getAssignmentStatus(startOfToday, NOW), 'today');
  assert.equal(getAssignmentStatus(endOfToday, NOW), 'today');
  assert.equal(getAssignmentStatus(priorDay, NOW), 'overdue');
  assert.equal(getAssignmentStatus(nextDay, NOW), 'upcoming');
  assert.equal(getAssignmentStatus(unpublished, NOW), null);
});

test('uses the local calendar date across daylight-saving transitions', () => {
  const originalTimezone = process.env.TZ;

  try {
    process.env.TZ = 'America/New_York';
    assert.equal(
      new Intl.DateTimeFormat().resolvedOptions().timeZone,
      'America/New_York',
    );

    const springNow = new Date('2026-03-08T05:30:00.000Z');
    assert.equal(
      getAssignmentStatus(
        assignment({ dueAt: '2026-03-08T07:30:00.000Z' }),
        springNow,
      ),
      'today',
    );
    assert.equal(
      getAssignmentStatus(
        assignment({ dueAt: '2026-03-08T04:59:59.000Z' }),
        springNow,
      ),
      'overdue',
    );
    assert.equal(
      getAssignmentStatus(
        assignment({ dueAt: '2026-03-09T04:00:00.000Z' }),
        springNow,
      ),
      'upcoming',
    );

    const fallNow = new Date('2026-11-01T04:30:00.000Z');
    assert.equal(
      getAssignmentStatus(
        assignment({ dueAt: '2026-11-01T06:30:00.000Z' }),
        fallNow,
      ),
      'today',
    );
    assert.equal(
      getAssignmentStatus(
        assignment({ dueAt: '2026-11-02T05:00:00.000Z' }),
        fallNow,
      ),
      'upcoming',
    );
  } finally {
    if (originalTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimezone;
    }
  }
});

test('filters assignment names case-insensitively without matching course names', () => {
  const assignments = [
    assignment({ id: 1, name: 'Research Essay', courseName: 'History' }),
    assignment({ id: 2, name: 'Lab report', courseName: 'Research Methods' }),
  ];

  assert.deepEqual(
    filterAndSortAssignments(assignments, { searchQuery: '  ESSAY ', now: NOW }).map(({ id }) => id),
    [1],
  );
  assert.deepEqual(
    filterAndSortAssignments(assignments, { searchQuery: 'methods', now: NOW }),
    [],
  );
});

test('filters assignments by course', () => {
  const assignments = [
    assignment({ id: 1, courseId: 10 }),
    assignment({ id: 2, courseId: 20 }),
  ];

  assert.deepEqual(
    filterAndSortAssignments(assignments, { selectedCourseId: 20, now: NOW }).map(({ id }) => id),
    [2],
  );
});

test('filters assignments by each status and reports status counts', () => {
  const assignments = [
    assignment({ id: 1, dueAt: localIso(2026, 6, 10, 23, 59) }),
    assignment({ id: 2, dueAt: localIso(2026, 6, 11, 9, 0) }),
    assignment({ id: 3, dueAt: localIso(2026, 6, 12, 0, 0) }),
    assignment({ id: 4, dueAt: null }),
    assignment({ id: 5, workflowState: 'unpublished' }),
  ];

  for (const [status, expectedId] of [
    ['overdue', 1],
    ['today', 2],
    ['upcoming', 3],
    ['no-date', 4],
  ]) {
    assert.deepEqual(
      filterAndSortAssignments(assignments, { statusFilter: status, now: NOW }).map(({ id }) => id),
      [expectedId],
    );
  }

  assert.deepEqual(getAssignmentStatusCounts(assignments, NOW), {
    all: 4,
    overdue: 1,
    today: 1,
    upcoming: 1,
    'no-date': 1,
  });
});

test('filterAndSortAssignments sorts chronologically without mutating input', () => {
  const assignments = [
    assignment({ id: 1, name: 'No due date', dueAt: null }),
    assignment({ id: 2, name: 'Later instant', dueAt: '2026-01-01T23:00:00Z' }),
    assignment({ id: 3, name: 'Earlier instant', dueAt: '2026-01-02T00:30:00+02:00' }),
  ];

  const sorted = filterAndSortAssignments(assignments, { now: NOW });

  assert.deepEqual(
    sorted.map(({ id }) => id),
    [3, 2, 1],
  );
  assert.deepEqual(
    assignments.map(({ id }) => id),
    [1, 2, 3],
  );
});

test('filterAndSortAssignments puts missing and invalid dates last', () => {
  const sorted = filterAndSortAssignments(
    [
      assignment({ id: 1, name: 'Zulu', dueAt: null }),
      assignment({ id: 2, name: 'Alpha', dueAt: 'not-a-date' }),
      assignment({ id: 3, name: 'Dated', dueAt: '2026-01-01T00:00:00Z' }),
    ],
    { now: NOW },
  );

  assert.deepEqual(
    sorted.map(({ id }) => id),
    [3, 2, 1],
  );
});

function assignment(overrides = {}) {
  return {
    id: 1,
    courseId: 42,
    courseName: 'Algorithms',
    name: 'Problem set',
    dueAt: '2026-07-12T14:00:00Z',
    htmlUrl: 'https://canvas.example.edu/courses/42/assignments/7',
    pointsPossible: 10,
    workflowState: 'published',
    updatedAt: '2026-07-10T08:00:00Z',
    ...overrides,
  };
}

function localIso(year, month, day, hour, minute, second = 0) {
  return new Date(year, month, day, hour, minute, second).toISOString();
}
