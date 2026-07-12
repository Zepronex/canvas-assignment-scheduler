import assert from 'node:assert/strict';
import test from 'node:test';

import {
  downloadICS,
  generateGoogleCalendarUrl,
  generateICS,
} from '../.test-build/lib/calendar.js';

test('generates a deterministic RFC 5545 calendar without mutating assignments', () => {
  const assignments = [
    assignment(),
    assignment({
      id: 8,
      courseId: 99,
      dueAt: '2026-07-13T09:15:00Z',
      updatedAt: '2026-07-11T12:45:00Z',
    }),
  ];
  const originalAssignments = structuredClone(assignments);

  const firstCalendar = generateICS(assignments);
  const secondCalendar = generateICS(assignments);
  const unfoldedCalendar = unfoldICS(firstCalendar);

  assert.equal(firstCalendar, secondCalendar);
  assert.deepEqual(assignments, originalAssignments);
  assert.equal(firstCalendar.endsWith('\r\n'), true);
  assert.equal(firstCalendar.replace(/\r\n/g, '').includes('\n'), false);
  assert.match(
    unfoldedCalendar,
    /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\nPRODID:-\/\/Canvas Deadline Copilot\/\/Calendar Export\/\/EN\r\n/,
  );
  assert.equal(countOccurrences(firstCalendar, 'BEGIN:VEVENT'), 2);
  assert.match(
    unfoldedCalendar,
    /UID:canvas-assignment-42-7@canvas-deadline-copilot\.invalid\r\n/,
  );
  assert.match(unfoldedCalendar, /DTSTAMP:20260710T080000Z\r\n/);
  assert.match(unfoldedCalendar, /DTSTART:20260712T140000Z\r\n/);
  assert.match(unfoldedCalendar, /DTEND:20260712T150000Z\r\n/);
  assert.match(unfoldedCalendar, /END:VEVENT\r\nEND:VCALENDAR\r\n$/);
});

test('escapes reserved text characters and multiline descriptions', () => {
  const calendar = unfoldICS(
    generateICS([
      assignment({
        name: 'Essay, part 1; draft\\copy\r\nsecond line',
        courseName: 'History, Europe; A',
        htmlUrl: 'https://canvas.example.edu/courses/42/assignments/7?view=full',
      }),
    ]),
  );

  assert.ok(
    calendar.includes(
      'SUMMARY:Essay\\, part 1\\; draft\\\\copy\\nsecond line - History\\, Europe\\; A\r\n',
    ),
  );
  assert.ok(
    calendar.includes(
      'DESCRIPTION:Assignment: Essay\\, part 1\\; draft\\\\copy\\nsecond line\\nCourse: History\\, Europe\\; A\\nPoints: 10\\nCanvas Link: https://canvas.example.edu/courses/42/assignments/7?view=full\r\n',
    ),
  );
});

test('converts offset timestamps to timezone-safe UTC calendar values', () => {
  const assignmentWithOffset = assignment({
    dueAt: '2026-01-02T00:30:00+02:00',
    updatedAt: '2026-01-01T20:00:00-02:00',
  });
  const calendar = unfoldICS(generateICS([assignmentWithOffset]));

  assert.match(calendar, /DTSTAMP:20260101T220000Z\r\n/);
  assert.match(calendar, /DTSTART:20260101T223000Z\r\n/);
  assert.match(calendar, /DTEND:20260101T233000Z\r\n/);

  const googleUrl = new URL(generateGoogleCalendarUrl(assignmentWithOffset));
  assert.equal(googleUrl.searchParams.get('dates'), '20260101T223000Z/20260101T233000Z');
});

test('generates an encoded Google Calendar template URL', () => {
  const googleUrl = generateGoogleCalendarUrl(
    assignment({
      name: 'Read & respond: “Hej”',
      courseName: 'Language, Culture',
      pointsPossible: 0,
    }),
  );

  assert.notEqual(googleUrl, null);
  const url = new URL(googleUrl);
  assert.equal(url.origin, 'https://calendar.google.com');
  assert.equal(url.pathname, '/calendar/render');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), 'Read & respond: “Hej” - Language, Culture');
  assert.equal(url.searchParams.get('dates'), '20260712T140000Z/20260712T150000Z');
  assert.equal(
    url.searchParams.get('details'),
    [
      'Assignment: Read & respond: “Hej”',
      'Course: Language, Culture',
      'Points: 0',
      'Canvas Link: https://canvas.example.edu/courses/42/assignments/7',
    ].join('\n'),
  );
});

test('skips assignments without valid due dates', () => {
  const noDate = assignment({ dueAt: null });
  const invalidDate = assignment({ id: 8, dueAt: 'not-a-date' });
  const calendar = generateICS([noDate, invalidDate]);

  assert.equal(countOccurrences(calendar, 'BEGIN:VEVENT'), 0);
  assert.equal(generateGoogleCalendarUrl(noDate), null);
  assert.equal(generateGoogleCalendarUrl(invalidDate), null);
  assert.equal(downloadICS([noDate, invalidDate]), false);
});

test('folds long Unicode content lines at 75 UTF-8 octets', () => {
  const longName = 'Deadline 🚀 '.repeat(12).trimEnd();
  const calendar = generateICS([assignment({ name: longName })]);
  const physicalLines = calendar.slice(0, -2).split('\r\n');

  for (const line of physicalLines) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `line exceeds 75 octets: ${line}`);
  }

  assert.ok(unfoldICS(calendar).includes(`SUMMARY:${longName} - Algorithms\r\n`));
});

function assignment(overrides = {}) {
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
    ...overrides,
  };
}

function unfoldICS(calendar) {
  return calendar.replace(/\r\n[ \t]/g, '');
}

function countOccurrences(value, searchValue) {
  return value.split(searchValue).length - 1;
}
