import type { CanvasSettings, Course } from '../types';

export interface CanvasConnectionProfile {
  id: number;
  name: string;
  email?: string;
}

export type CanvasConnectionErrorCode =
  | 'invalid-url'
  | 'missing-token'
  | 'network'
  | 'unauthorized'
  | 'missing-permissions'
  | 'unexpected-response';

export class CanvasConnectionError extends Error {
  readonly code: CanvasConnectionErrorCode;
  readonly status?: number;

  constructor(code: CanvasConnectionErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'CanvasConnectionError';
    this.code = code;
    this.status = status;
  }
}

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

export function normalizeCanvasBaseUrl(input: string): string {
  const trimmedUrl = input.trim();
  if (!trimmedUrl) {
    throw new CanvasConnectionError('invalid-url', 'Enter a Canvas URL.');
  }

  const urlWithProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  let url: URL;
  try {
    url = new URL(urlWithProtocol);
  } catch {
    throw new CanvasConnectionError('invalid-url', 'Enter a valid Canvas URL.');
  }

  if (url.protocol !== 'https:') {
    throw new CanvasConnectionError('invalid-url', 'Canvas URL must start with https://.');
  }

  if (!url.hostname || url.username || url.password) {
    throw new CanvasConnectionError('invalid-url', 'Enter a valid Canvas URL.');
  }

  return url.origin;
}

export function normalizeCanvasUrl(rawUrl: string): string {
  try {
    return normalizeCanvasBaseUrl(rawUrl);
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
  const normalizedCanvasUrl = normalizeCanvasBaseUrl(canvasUrl);

  const url = new URL(apiPath, `${normalizedCanvasUrl}/`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export function buildCanvasHeaders(canvasToken: string): HeadersInit {
  const token = canvasToken.trim();
  if (!token) {
    throw new CanvasConnectionError('missing-token', 'Enter a Canvas API token.');
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

export async function validateCanvasConnection(
  settings: CanvasSettings,
  fetchImpl: typeof fetch = fetch,
): Promise<CanvasConnectionProfile> {
  const requestUrl = buildCanvasApiUrl(settings.canvasUrl, CANVAS_API_PATHS.self);
  const headers = buildCanvasHeaders(settings.canvasToken);

  let response: Response;
  try {
    response = await fetchImpl(requestUrl, {
      method: 'GET',
      headers,
    });
  } catch {
    throw new CanvasConnectionError(
      'network',
      'Unable to reach Canvas. Check the URL and your network connection.',
    );
  }

  if (response.status === 401) {
    throw new CanvasConnectionError(
      'unauthorized',
      'Canvas rejected the API token. Check that it was copied correctly.',
      response.status,
    );
  }

  if (response.status === 403) {
    throw new CanvasConnectionError(
      'missing-permissions',
      'Canvas denied access. Create a token that can read your Canvas account.',
      response.status,
    );
  }

  if (!response.ok) {
    throw new CanvasConnectionError(
      'unexpected-response',
      `Canvas returned an unexpected response (HTTP ${response.status}). Check that the URL points to your Canvas site.`,
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CanvasConnectionError('unexpected-response', 'Canvas returned a response that could not be read.');
  }

  return parseCanvasSelf(payload);
}

function parseCanvasSelf(payload: unknown): CanvasConnectionProfile {
  if (!isRecord(payload) || typeof payload.id !== 'number' || typeof payload.name !== 'string') {
    throw new CanvasConnectionError('unexpected-response', 'Canvas returned an unexpected user profile.');
  }

  const name = payload.name.trim();
  if (!name) {
    throw new CanvasConnectionError('unexpected-response', 'Canvas returned an unexpected user profile.');
  }

  return {
    id: payload.id,
    name,
    ...(typeof payload.email === 'string' && payload.email.trim() ? { email: payload.email.trim() } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
