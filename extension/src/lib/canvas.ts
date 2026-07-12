import type {
  AssignmentSyncResult,
  CanvasAssignment,
  CanvasCourse,
  CanvasSettings,
  NormalizedAssignment,
} from '../types';
import { getSafeHttpsUrl } from './urls.js';

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
  courseAssignments: (courseId: CanvasCourse['id']) =>
    `/api/v1/courses/${encodeURIComponent(String(courseId))}/assignments`,
} as const;

export const DEFAULT_COURSE_PARAMS = {
  enrollment_state: 'active',
  per_page: 100,
} as const;

export const DEFAULT_ASSIGNMENT_PARAMS = {
  per_page: 100,
} as const;

export type CanvasQueryParams = Record<string, boolean | number | string>;
export type CanvasLinkRelations = Record<string, string>;

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

  if (!url.hostname || url.hostname.includes('*') || url.username || url.password) {
    throw new CanvasConnectionError('invalid-url', 'Enter a valid Canvas URL.');
  }

  return url.origin;
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

export function parseCanvasLinkHeader(linkHeader: string | null): CanvasLinkRelations {
  if (!linkHeader?.trim()) {
    return {};
  }

  const relations: CanvasLinkRelations = {};
  const linkPattern = /<([^>]+)>((?:\s*;\s*[^,]*)*)/g;

  for (const match of linkHeader.matchAll(linkPattern)) {
    const href = match[1]?.trim();
    const parameters = match[2] ?? '';
    const relationMatch = parameters.match(/(?:^|;)\s*rel\s*=\s*(?:"([^"]+)"|([^;,\s]+))/i);
    const relationValue = (relationMatch?.[1] ?? relationMatch?.[2])?.trim();

    if (!href || !relationValue) {
      continue;
    }

    for (const relation of relationValue.split(/\s+/)) {
      if (relation) {
        relations[relation.toLowerCase()] = href;
      }
    }
  }

  return relations;
}

export async function fetchPaginatedCanvasGet<T = unknown>(
  settings: CanvasSettings,
  apiPath: string,
  params: CanvasQueryParams = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T[]> {
  const canvasOrigin = normalizeCanvasBaseUrl(settings.canvasUrl);
  const headers = buildCanvasHeaders(settings.canvasToken);
  const items: T[] = [];
  const visitedUrls = new Set<string>();
  let pageUrl: string | null = buildCanvasApiUrl(canvasOrigin, apiPath, params);

  while (pageUrl) {
    assertCanvasOrigin(pageUrl, canvasOrigin);

    if (visitedUrls.has(pageUrl)) {
      throw new CanvasConnectionError(
        'unexpected-response',
        'Canvas returned a repeated pagination link and the sync was stopped.',
      );
    }
    visitedUrls.add(pageUrl);

    const { payload, response } = await fetchCanvasJson(pageUrl, headers, fetchImpl);
    if (!Array.isArray(payload)) {
      throw new CanvasConnectionError(
        'unexpected-response',
        'Canvas returned an unexpected paginated response.',
      );
    }

    items.push(...(payload as T[]));

    const nextPage = parseCanvasLinkHeader(response.headers.get('Link')).next;
    pageUrl = nextPage ? resolveCanvasPageUrl(nextPage, pageUrl, canvasOrigin) : null;
  }

  return items;
}

export async function fetchCanvasCourses(
  settings: CanvasSettings,
  fetchImpl: typeof fetch = fetch,
): Promise<CanvasCourse[]> {
  const courses = await fetchPaginatedCanvasGet<unknown>(
    settings,
    CANVAS_API_PATHS.courses,
    DEFAULT_COURSE_PARAMS,
    fetchImpl,
  );

  return courses.map(parseCanvasCourse);
}

export async function fetchCanvasAssignmentsForCourse(
  settings: CanvasSettings,
  courseId: CanvasCourse['id'],
  fetchImpl: typeof fetch = fetch,
): Promise<CanvasAssignment[]> {
  if (!isCanvasId(courseId)) {
    throw new CanvasConnectionError('unexpected-response', 'Canvas course ID is invalid.');
  }

  const assignments = await fetchPaginatedCanvasGet<unknown>(
    settings,
    CANVAS_API_PATHS.courseAssignments(courseId),
    DEFAULT_ASSIGNMENT_PARAMS,
    fetchImpl,
  );

  const canvasOrigin = normalizeCanvasBaseUrl(settings.canvasUrl);
  return assignments.map((assignment) =>
    parseCanvasAssignment(assignment, canvasOrigin, courseId),
  );
}

export function normalizeCanvasAssignment(
  assignment: CanvasAssignment,
  course: CanvasCourse,
): NormalizedAssignment {
  return {
    id: assignment.id,
    courseId: course.id,
    courseName: course.name,
    name: assignment.name,
    dueAt: assignment.due_at,
    htmlUrl: assignment.html_url,
    pointsPossible: assignment.points_possible,
    workflowState: assignment.workflow_state,
    updatedAt: assignment.updated_at,
  };
}

export async function syncCanvasAssignments(
  settings: CanvasSettings,
  fetchImpl: typeof fetch = fetch,
): Promise<AssignmentSyncResult> {
  const courses = await fetchCanvasCourses(settings, fetchImpl);
  const syncableCourses = courses.filter((course) => !course.access_restricted_by_date);
  const assignments: NormalizedAssignment[] = [];
  const courseResults = await Promise.allSettled(
    syncableCourses.map(async (course) => {
      const courseAssignments = await fetchCanvasAssignmentsForCourse(
        settings,
        course.id,
        fetchImpl,
      );

      return courseAssignments.map((assignment) => normalizeCanvasAssignment(assignment, course));
    }),
  );
  let failedCourseCount = 0;

  for (const result of courseResults) {
    if (result.status === 'fulfilled') {
      assignments.push(...result.value);
    } else {
      failedCourseCount += 1;
    }
  }

  if (syncableCourses.length > 0 && failedCourseCount === syncableCourses.length) {
    throw new CanvasConnectionError(
      'unexpected-response',
      'Canvas assignments could not be loaded from any active course.',
    );
  }

  return {
    courses,
    assignments,
    lastSyncedAt: new Date().toISOString(),
    failedCourseCount,
  };
}

export async function validateCanvasConnection(
  settings: CanvasSettings,
  fetchImpl: typeof fetch = fetch,
): Promise<CanvasConnectionProfile> {
  const requestUrl = buildCanvasApiUrl(settings.canvasUrl, CANVAS_API_PATHS.self);
  const headers = buildCanvasHeaders(settings.canvasToken);
  const { payload } = await fetchCanvasJson(requestUrl, headers, fetchImpl);

  return parseCanvasSelf(payload);
}

async function fetchCanvasJson(
  requestUrl: string,
  headers: HeadersInit,
  fetchImpl: typeof fetch,
): Promise<{ payload: unknown; response: Response }> {
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

  if (response.url) {
    assertCanvasOrigin(response.url, new URL(requestUrl).origin);
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
      'Canvas denied access. Make sure the token can read courses and assignments.',
      response.status,
    );
  }

  if (response.status === 404) {
    throw new CanvasConnectionError(
      'unexpected-response',
      'Canvas could not find the requested API endpoint. Check the Canvas URL.',
      response.status,
    );
  }

  if (!response.ok) {
    throw new CanvasConnectionError(
      'unexpected-response',
      `Canvas returned an unexpected response (HTTP ${response.status}). Try again later.`,
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CanvasConnectionError(
      'unexpected-response',
      'Canvas returned a response that could not be read.',
    );
  }

  return { payload, response };
}

function resolveCanvasPageUrl(nextPage: string, currentPage: string, canvasOrigin: string): string {
  let resolvedUrl: string;
  try {
    resolvedUrl = new URL(nextPage, currentPage).toString();
  } catch {
    throw new CanvasConnectionError(
      'unexpected-response',
      'Canvas returned an invalid pagination link.',
    );
  }

  assertCanvasOrigin(resolvedUrl, canvasOrigin);
  return resolvedUrl;
}

function assertCanvasOrigin(requestUrl: string, canvasOrigin: string): void {
  let requestUrlObject: URL;
  try {
    requestUrlObject = new URL(requestUrl);
  } catch {
    throw new CanvasConnectionError('unexpected-response', 'Canvas returned an invalid API URL.');
  }

  if (
    requestUrlObject.protocol !== 'https:' ||
    requestUrlObject.username ||
    requestUrlObject.password ||
    requestUrlObject.origin !== canvasOrigin
  ) {
    throw new CanvasConnectionError(
      'unexpected-response',
      'Canvas returned a pagination link for a different site, so the sync was stopped.',
    );
  }
}

function parseCanvasSelf(payload: unknown): CanvasConnectionProfile {
  if (!isRecord(payload) || !isCanvasId(payload.id) || typeof payload.name !== 'string') {
    throw malformedResponse('user profile');
  }

  const name = payload.name.trim();
  if (!name) {
    throw malformedResponse('user profile');
  }

  return {
    id: payload.id,
    name,
    ...(typeof payload.email === 'string' && payload.email.trim()
      ? { email: payload.email.trim() }
      : {}),
  };
}

function parseCanvasCourse(payload: unknown): CanvasCourse {
  if (!isRecord(payload) || !isCanvasId(payload.id) || typeof payload.name !== 'string') {
    throw malformedResponse('course');
  }

  const name = payload.name.trim();
  if (!name) {
    throw malformedResponse('course');
  }

  if (
    payload.course_code !== undefined &&
    payload.course_code !== null &&
    typeof payload.course_code !== 'string'
  ) {
    throw malformedResponse('course');
  }

  if (payload.workflow_state !== undefined && typeof payload.workflow_state !== 'string') {
    throw malformedResponse('course');
  }

  if (
    payload.access_restricted_by_date !== undefined &&
    typeof payload.access_restricted_by_date !== 'boolean'
  ) {
    throw malformedResponse('course');
  }

  return {
    id: payload.id,
    name,
    ...(payload.course_code !== undefined
      ? { course_code: payload.course_code === null ? null : payload.course_code.trim() }
      : {}),
    ...(typeof payload.workflow_state === 'string'
      ? { workflow_state: payload.workflow_state.trim() }
      : {}),
    ...(typeof payload.access_restricted_by_date === 'boolean'
      ? { access_restricted_by_date: payload.access_restricted_by_date }
      : {}),
  };
}

function parseCanvasAssignment(
  payload: unknown,
  canvasOrigin: string,
  requestedCourseId: CanvasCourse['id'],
): CanvasAssignment {
  if (
    !isRecord(payload) ||
    !isCanvasId(payload.id) ||
    !isCanvasId(payload.course_id) ||
    typeof payload.name !== 'string' ||
    typeof payload.html_url !== 'string' ||
    typeof payload.workflow_state !== 'string' ||
    typeof payload.updated_at !== 'string'
  ) {
    throw malformedResponse('assignment');
  }

  const name = payload.name.trim();
  const htmlUrl = getSafeHttpsUrl(payload.html_url.trim());
  const workflowState = payload.workflow_state.trim();
  const updatedAt = payload.updated_at.trim();
  const dueAt = payload.due_at;
  const pointsPossible = payload.points_possible;

  if (
    !name ||
    payload.course_id !== requestedCourseId ||
    !htmlUrl ||
    new URL(htmlUrl).origin !== canvasOrigin ||
    !workflowState ||
    !isTimestamp(updatedAt) ||
    (dueAt !== null && (typeof dueAt !== 'string' || !isTimestamp(dueAt))) ||
    (pointsPossible !== null &&
      (typeof pointsPossible !== 'number' || !Number.isFinite(pointsPossible)))
  ) {
    throw malformedResponse('assignment');
  }

  return {
    id: payload.id,
    name,
    course_id: payload.course_id,
    due_at: dueAt,
    html_url: htmlUrl,
    points_possible: pointsPossible,
    workflow_state: workflowState,
    updated_at: updatedAt,
  };
}

function malformedResponse(subject: string): CanvasConnectionError {
  return new CanvasConnectionError(
    'unexpected-response',
    `Canvas returned an unexpected ${subject}.`,
  );
}

function isCanvasId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isTimestamp(value: string): boolean {
  return (
    value.trim().length > 0 &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
