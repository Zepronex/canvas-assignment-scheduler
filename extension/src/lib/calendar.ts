import type { Assignment } from '../types';

const GOOGLE_CALENDAR_TEMPLATE_URL = 'https://calendar.google.com/calendar/render';
const DEFAULT_EVENT_DURATION_MINUTES = 60;

export interface GoogleCalendarEventOptions {
  durationMinutes?: number;
}

export function buildGoogleCalendarEventUrl(
  assignment: Assignment,
  options: GoogleCalendarEventOptions = {},
): string | null {
  if (!assignment.due_at) {
    return null;
  }

  const startDate = new Date(assignment.due_at);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const durationMinutes = options.durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const details = [
    `Assignment: ${assignment.name}`,
    `Course: ${assignment.course_name}`,
    `Points: ${assignment.points_possible ?? 'N/A'}`,
    `Canvas Link: ${assignment.html_url}`,
  ].join('\n');

  const url = new URL(GOOGLE_CALENDAR_TEMPLATE_URL);
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', `${assignment.name} - ${assignment.course_name}`);
  url.searchParams.set('dates', `${formatGoogleCalendarDate(startDate)}/${formatGoogleCalendarDate(endDate)}`);
  url.searchParams.set('details', details);

  return url.toString();
}

export function formatGoogleCalendarDate(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d{3}/g, '');
}
