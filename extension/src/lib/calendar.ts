import type { NormalizedAssignment } from '../types';

const GOOGLE_CALENDAR_TEMPLATE_URL = 'https://calendar.google.com/calendar/render';
const DEFAULT_EVENT_DURATION_MINUTES = 60;
const DEFAULT_ICS_FILENAME = 'canvas-assignments.ics';
const PROD_ID = '-//Canvas Deadline Copilot//Calendar Export//EN';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_PATTERN =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:\d{2})?$/i;

export interface GoogleCalendarEventOptions {
  durationMinutes?: number;
}

/**
 * Creates a deterministic RFC 5545 calendar containing every assignment with
 * a valid due date. Input order is retained so exports match the popup order.
 */
export function generateICS(assignments: readonly NormalizedAssignment[]): string {
  const contentLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PROD_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const assignment of assignments) {
    const dueDate = parseDate(assignment.dueAt);
    if (!dueDate) {
      continue;
    }

    const endDate = addMinutes(dueDate, DEFAULT_EVENT_DURATION_MINUTES);
    const updatedDate = parseDate(assignment.updatedAt) ?? dueDate;
    const description = buildEventDescription(assignment);
    const safeUrl = sanitizeUriProperty(assignment.htmlUrl);

    contentLines.push(
      'BEGIN:VEVENT',
      `UID:${buildEventUid(assignment)}`,
      `DTSTAMP:${formatCalendarDate(updatedDate)}`,
      `DTSTART:${formatCalendarDate(dueDate)}`,
      `DTEND:${formatCalendarDate(endDate)}`,
      `SUMMARY:${escapeICSText(buildEventTitle(assignment))}`,
      `DESCRIPTION:${escapeICSText(description)}`,
    );

    if (safeUrl) {
      contentLines.push(`URL:${safeUrl}`);
    }

    contentLines.push('END:VEVENT');
  }

  contentLines.push('END:VCALENDAR');

  return `${contentLines.map(foldContentLine).join('\r\n')}\r\n`;
}

/**
 * Downloads a generated calendar without requiring the Chrome downloads
 * permission. Returns false when none of the assignments can form an event.
 */
export function downloadICS(
  assignments: readonly NormalizedAssignment[],
  filename = DEFAULT_ICS_FILENAME,
): boolean {
  if (!assignments.some((assignment) => parseDate(assignment.dueAt) !== null)) {
    return false;
  }

  const objectUrl = URL.createObjectURL(
    new Blob([generateICS(assignments)], { type: 'text/calendar;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = sanitizeFilename(filename);
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  return true;
}

/** Creates a pre-filled Google Calendar event for a dated assignment. */
export function generateGoogleCalendarUrl(assignment: NormalizedAssignment): string | null {
  return buildGoogleCalendarEventUrl(assignment);
}

/**
 * Backwards-compatible variant that also permits a custom event duration.
 */
export function buildGoogleCalendarEventUrl(
  assignment: NormalizedAssignment,
  options: GoogleCalendarEventOptions = {},
): string | null {
  const startDate = parseDate(assignment.dueAt);
  if (!startDate) {
    return null;
  }

  const durationMinutes = options.durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES;
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return null;
  }

  const endDate = addMinutes(startDate, durationMinutes);
  const url = new URL(GOOGLE_CALENDAR_TEMPLATE_URL);
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', buildEventTitle(assignment));
  url.searchParams.set(
    'dates',
    `${formatGoogleCalendarDate(startDate)}/${formatGoogleCalendarDate(endDate)}`,
  );
  url.searchParams.set('details', buildEventDescription(assignment));

  return url.toString();
}

export function formatGoogleCalendarDate(date: Date): string {
  return formatCalendarDate(date);
}

function buildEventTitle(assignment: NormalizedAssignment): string {
  return `${assignment.name} - ${assignment.courseName}`;
}

function buildEventDescription(assignment: NormalizedAssignment): string {
  return [
    `Assignment: ${assignment.name}`,
    `Course: ${assignment.courseName}`,
    `Points: ${assignment.pointsPossible ?? 'N/A'}`,
    `Canvas Link: ${assignment.htmlUrl}`,
  ].join('\n');
}

function buildEventUid(assignment: NormalizedAssignment): string {
  let sourceDomain = 'canvas-deadline-copilot.invalid';

  try {
    const hostname = new URL(assignment.htmlUrl).hostname.toLowerCase();
    const safeHostname = hostname.replace(/[^a-z0-9.-]/g, '-');
    if (safeHostname) {
      sourceDomain = safeHostname;
    }
  } catch {
    // Keep the deterministic fallback for malformed legacy cache entries.
  }

  return `canvas-assignment-${assignment.courseId}-${assignment.id}@${sourceDomain}`;
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  let normalizedValue: string;

  if (ISO_DATE_PATTERN.test(trimmedValue)) {
    normalizedValue = `${trimmedValue}T00:00:00Z`;
  } else {
    const match = ISO_DATE_TIME_PATTERN.exec(trimmedValue);
    if (!match) {
      return null;
    }

    normalizedValue = `${match[1]}${match[2] ?? 'Z'}`;
  }

  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatCalendarDate(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d{3}/g, '');
}

function escapeICSText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function sanitizeUriProperty(value: string): string {
  return value.replace(/\r\n|\r|\n/g, '').trim();
}

function sanitizeFilename(value: string): string {
  const filename = value.trim().replace(/[\\/:*?"<>|\r\n]/g, '-');
  return filename || DEFAULT_ICS_FILENAME;
}

/** RFC 5545 content lines are limited to 75 UTF-8 octets. */
function foldContentLine(line: string): string {
  const encoder = new TextEncoder();
  const foldedLines: string[] = [];
  let currentLine = '';
  let currentBytes = 0;
  let contentLimit = 75;

  for (const character of line) {
    const characterBytes = encoder.encode(character).length;

    if (currentBytes + characterBytes > contentLimit) {
      foldedLines.push(currentLine);
      currentLine = character;
      currentBytes = characterBytes;
      contentLimit = 74;
      continue;
    }

    currentLine += character;
    currentBytes += characterBytes;
  }

  foldedLines.push(currentLine);
  return foldedLines.join('\r\n ');
}
