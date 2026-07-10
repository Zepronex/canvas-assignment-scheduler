import type { CanvasSettings, Course } from '../types';

export const CANVAS_API_PATHS = {
  self: '/api/v1/users/self',
  courses: '/api/v1/courses',
  courseAssignments: (courseId: Course['id']) => `/api/v1/courses/${courseId}/assignments`,
} as const;

export const DEFAULT_COURSE_PARAMS = {
  enrollment_state: 'active',
  per_page: 100,
} as const;

export const DEFAULT_ASSIGNMENT_PARAMS = {
  per_page: 100,
  order_by: 'due_at',
} as const;

export type CanvasQueryParams = Record<string, boolean | number | string>;

export function normalizeCanvasUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) {
    return '';
  }

  const urlWithProtocol = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;

  try {
    return new URL(urlWithProtocol).origin;
  } catch {
    return '';
  }
}

export function hasCanvasSettings(settings: Partial<CanvasSettings>): settings is CanvasSettings {
  return Boolean(settings.canvasUrl?.trim() && settings.canvasToken?.trim());
}

export function buildCanvasApiUrl(
  canvasUrl: string,
  apiPath: string,
  params: CanvasQueryParams = {},
): string {
  const normalizedCanvasUrl = normalizeCanvasUrl(canvasUrl);
  if (!normalizedCanvasUrl) {
    throw new Error('Canvas URL is required.');
  }

  const url = new URL(apiPath, `${normalizedCanvasUrl}/`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export function buildCanvasHeaders(canvasToken: string): HeadersInit {
  const token = canvasToken.trim();
  if (!token) {
    throw new Error('Canvas API token is required.');
  }

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function buildCanvasRequest(settings: CanvasSettings, apiPath: string, params?: CanvasQueryParams): Request {
  return new Request(buildCanvasApiUrl(settings.canvasUrl, apiPath, params), {
    headers: buildCanvasHeaders(settings.canvasToken),
  });
}
