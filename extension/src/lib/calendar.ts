import type { NormalizedAssignment } from '../types';

const GOOGLE_CALENDAR_TEMPLATE_URL = 'https://calendar.google.com/calendar/render';
const DEFAULT_EVENT_DURATION_MINUTES = 60;

export interface GoogleCalendarEventOptions {
  durationMinutes?: number;
}

export function buildGoogleCalendarEventUrl(
  assignment: NormalizedAssignment,
  options: GoogleCalendarEventOptions = {},
): string | null {
  if (!assignment.dueAt) {
    return null;
  }

  const startDate = new Date(assignment.dueAt);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const durationMinutes = options.durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const details = [
    `Assignment: ${assignment.name}`,
    `Course: ${assignment.courseName}`,
    `Points: ${assignment.pointsPossible ?? 'N/A'}`,
    `Canvas Link: ${assignment.htmlUrl}`,
  ].join('\n');

  const url = new URL(GOOGLE_CALENDAR_TEMPLATE_URL);
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', `${assignment.name} - ${assignment.courseName}`);
  url.searchParams.set('dates', `${formatGoogleCalendarDate(startDate)}/${formatGoogleCalendarDate(endDate)}`);
  url.searchParams.set('details', details);

  return url.toString();
}

export function formatGoogleCalendarDate(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d{3}/g, '');
}
