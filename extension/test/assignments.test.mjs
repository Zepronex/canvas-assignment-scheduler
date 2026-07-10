import assert from 'node:assert/strict';
import test from 'node:test';

import { sortAssignmentsByDueDate } from '../.test-build/lib/assignments.js';

test('sortAssignmentsByDueDate sorts chronologically without mutating input', () => {
  const assignments = [
    assignment({ id: 1, name: 'No due date', dueAt: null }),
    assignment({ id: 2, name: 'Later instant', dueAt: '2026-01-01T23:00:00Z' }),
    assignment({ id: 3, name: 'Earlier instant', dueAt: '2026-01-02T00:30:00+02:00' }),
  ];

  const sorted = sortAssignmentsByDueDate(assignments);

  assert.deepEqual(
    sorted.map(({ id }) => id),
    [3, 2, 1],
  );
  assert.deepEqual(
    assignments.map(({ id }) => id),
    [1, 2, 3],
  );
});

test('sortAssignmentsByDueDate puts missing and invalid dates last', () => {
  const sorted = sortAssignmentsByDueDate([
    assignment({ id: 1, name: 'Zulu', dueAt: null }),
    assignment({ id: 2, name: 'Alpha', dueAt: 'not-a-date' }),
    assignment({ id: 3, name: 'Dated', dueAt: '2026-01-01T00:00:00Z' }),
  ]);

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
