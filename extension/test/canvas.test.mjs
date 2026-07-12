import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CanvasConnectionError,
  fetchCanvasAssignmentsForCourse,
  fetchCanvasCourses,
  fetchPaginatedCanvasGet,
  normalizeCanvasBaseUrl,
  normalizeCanvasAssignment,
  normalizeCanvasUrl,
  parseCanvasLinkHeader,
  syncCanvasAssignments,
  validateCanvasConnection,
} from '../.test-build/lib/canvas.js';

test('normalizeCanvasBaseUrl trims paths and adds https', () => {
  assert.equal(
    normalizeCanvasBaseUrl(' canvas.example.edu/courses/123?ignored=true '),
    'https://canvas.example.edu',
  );
});

test('normalizeCanvasBaseUrl rejects invalid or unsafe URLs', () => {
  assertCanvasError(() => normalizeCanvasBaseUrl(''), 'invalid-url');
  assertCanvasError(() => normalizeCanvasBaseUrl('http://canvas.example.edu'), 'invalid-url');
  assertCanvasError(() => normalizeCanvasBaseUrl('https://token:secret@canvas.example.edu'), 'invalid-url');
});

test('normalizeCanvasUrl keeps the legacy empty-string fallback', () => {
  assert.equal(normalizeCanvasUrl('not a valid host name'), '');
});

test('validateCanvasConnection returns the Canvas self profile', async () => {
  const profile = await validateCanvasConnection(
    {
      canvasUrl: 'https://canvas.example.edu/accounts',
      canvasToken: ' token-value ',
    },
    async (url, init) => {
      assert.equal(url, 'https://canvas.example.edu/api/v1/users/self');
      assert.equal(init.method, 'GET');
      assert.equal(init.headers.Authorization, 'Bearer token-value');

      return jsonResponse({ id: 42, name: 'Ada Lovelace', email: 'ada@example.edu' });
    },
  );

  assert.deepEqual(profile, {
    id: 42,
    name: 'Ada Lovelace',
    email: 'ada@example.edu',
  });
});

test('validateCanvasConnection rejects missing tokens before fetch', async () => {
  await assert.rejects(
    validateCanvasConnection(
      {
        canvasUrl: 'https://canvas.example.edu',
        canvasToken: ' ',
      },
      async () => {
        throw new Error('fetch should not run');
      },
    ),
    isCanvasError('missing-token'),
  );
});

test('validateCanvasConnection maps network failures', async () => {
  await assert.rejects(
    validateCanvasConnection(
      {
        canvasUrl: 'https://canvas.example.edu',
        canvasToken: 'token-value',
      },
      async () => {
        throw new TypeError('failed to fetch');
      },
    ),
    isCanvasError('network'),
  );
});

test('validateCanvasConnection maps Canvas authentication and permission failures', async () => {
  await assert.rejects(
    validateCanvasConnection(
      {
        canvasUrl: 'https://canvas.example.edu',
        canvasToken: 'bad-token',
      },
      async () => new Response('', { status: 401 }),
    ),
    isCanvasError('unauthorized'),
  );

  await assert.rejects(
    validateCanvasConnection(
      {
        canvasUrl: 'https://canvas.example.edu',
        canvasToken: 'limited-token',
      },
      async () => new Response('', { status: 403 }),
    ),
    isCanvasError('missing-permissions'),
  );
});

test('validateCanvasConnection maps malformed Canvas responses', async () => {
  await assert.rejects(
    validateCanvasConnection(
      {
        canvasUrl: 'https://canvas.example.edu',
        canvasToken: 'token-value',
      },
      async () => jsonResponse({ id: 42, display_name: 'Missing name' }),
    ),
    isCanvasError('unexpected-response'),
  );
});

test('parseCanvasLinkHeader extracts Canvas pagination relations', () => {
  const links = parseCanvasLinkHeader(
    '<https://canvas.example.edu/api/v1/courses?search=a,b&page=1>; rel="current", ' +
      '<https://canvas.example.edu/api/v1/courses?page=2>; rel="next", ' +
      '<https://canvas.example.edu/api/v1/courses?page=4>; rel="last"',
  );

  assert.deepEqual(links, {
    current: 'https://canvas.example.edu/api/v1/courses?search=a,b&page=1',
    next: 'https://canvas.example.edu/api/v1/courses?page=2',
    last: 'https://canvas.example.edu/api/v1/courses?page=4',
  });
  assert.deepEqual(parseCanvasLinkHeader(null), {});
});

test('fetchCanvasCourses follows pagination and uses the active course endpoint', async () => {
  const requestedUrls = [];

  const courses = await fetchCanvasCourses(
    canvasSettings(),
    async (url, init) => {
      requestedUrls.push(url);
      assert.equal(init.method, 'GET');
      assert.equal(init.headers.Authorization, 'Bearer token-value');

      if (requestedUrls.length === 1) {
        return jsonResponse(
          [{ id: 1, name: 'Algorithms', course_code: 'CS 301' }],
          {
            headers: {
              Link: '</api/v1/courses?enrollment_state=active&per_page=100&page=2>; rel="next"',
            },
          },
        );
      }

      return jsonResponse([{ id: 2, name: 'Databases', workflow_state: 'available' }]);
    },
  );

  assert.deepEqual(requestedUrls, [
    'https://canvas.example.edu/api/v1/courses?enrollment_state=active&per_page=100',
    'https://canvas.example.edu/api/v1/courses?enrollment_state=active&per_page=100&page=2',
  ]);
  assert.deepEqual(courses, [
    { id: 1, name: 'Algorithms', course_code: 'CS 301' },
    { id: 2, name: 'Databases', workflow_state: 'available' },
  ]);
});

test('fetchCanvasAssignmentsForCourse uses the course assignments endpoint', async () => {
  const assignments = await fetchCanvasAssignmentsForCourse(
    canvasSettings(),
    42,
    async (url) => {
      assert.equal(
        url,
        'https://canvas.example.edu/api/v1/courses/42/assignments?per_page=100',
      );
      return jsonResponse([canvasAssignment({ id: 9, course_id: 42 })]);
    },
  );

  assert.equal(assignments[0].id, 9);
  assert.equal(assignments[0].points_possible, 0);
});

test('fetchCanvasAssignmentsForCourse rejects unsafe or cross-origin assignment links', async () => {
  for (const html_url of [
    'javascript:alert(1)',
    'http://canvas.example.edu/courses/42/assignments/7',
    'https://user:password@canvas.example.edu/courses/42/assignments/7',
    'https://other.example.edu/courses/42/assignments/7',
  ]) {
    await assert.rejects(
      fetchCanvasAssignmentsForCourse(canvasSettings(), 42, async () =>
        jsonResponse([canvasAssignment({ html_url })]),
      ),
      isCanvasError('unexpected-response'),
    );
  }
});

test('fetchCanvasAssignmentsForCourse rejects timezone-less Canvas timestamps', async () => {
  await assert.rejects(
    fetchCanvasAssignmentsForCourse(canvasSettings(), 42, async () =>
      jsonResponse([canvasAssignment({ due_at: '2026-07-12T14:00:00' })]),
    ),
    isCanvasError('unexpected-response'),
  );
});

test('fetchPaginatedCanvasGet rejects malformed pages and cross-origin next links', async () => {
  await assert.rejects(
    fetchPaginatedCanvasGet(canvasSettings(), '/api/v1/courses', {}, async () =>
      jsonResponse({ courses: [] }),
    ),
    isCanvasError('unexpected-response'),
  );

  let requestCount = 0;
  await assert.rejects(
    fetchPaginatedCanvasGet(canvasSettings(), '/api/v1/courses', {}, async () => {
      requestCount += 1;
      return jsonResponse([], {
        headers: { Link: '<https://attacker.example/api/v1/courses?page=2>; rel="next"' },
      });
    }),
    isCanvasError('unexpected-response'),
  );
  assert.equal(requestCount, 1);

  await assert.rejects(
    fetchPaginatedCanvasGet(canvasSettings(), '/api/v1/courses', {}, async () =>
      jsonResponse([], {
        headers: {
          Link: '<https://user:password@canvas.example.edu/api/v1/courses?page=2>; rel="next"',
        },
      }),
    ),
    isCanvasError('unexpected-response'),
  );
});

test('fetchCanvasCourses rejects malformed course items', async () => {
  await assert.rejects(
    fetchCanvasCourses(canvasSettings(), async () => jsonResponse([{ id: '1', name: null }])),
    isCanvasError('unexpected-response'),
  );
});

test('normalizeCanvasAssignment maps Canvas fields into the internal shape', () => {
  const normalized = normalizeCanvasAssignment(
    canvasAssignment({ course_id: 999, due_at: null, points_possible: 0 }),
    { id: 42, name: 'Algorithms' },
  );

  assert.deepEqual(normalized, {
    id: 7,
    courseId: 42,
    courseName: 'Algorithms',
    name: 'Problem set',
    dueAt: null,
    htmlUrl: 'https://canvas.example.edu/courses/42/assignments/7',
    pointsPossible: 0,
    workflowState: 'published',
    updatedAt: '2026-07-10T08:00:00Z',
  });
});

test('syncCanvasAssignments aggregates and normalizes assignments from active courses', async () => {
  const result = await syncCanvasAssignments(canvasSettings(), async (url) => {
    const parsedUrl = new URL(url);

    if (parsedUrl.pathname === '/api/v1/courses') {
      assert.equal(parsedUrl.searchParams.get('enrollment_state'), 'active');
      assert.equal(parsedUrl.searchParams.get('per_page'), '100');
      return jsonResponse([
        { id: 10, name: 'Algorithms' },
        { id: 20, name: 'Databases' },
        { id: 30, name: 'Future course', access_restricted_by_date: true },
      ]);
    }

    if (parsedUrl.pathname === '/api/v1/courses/10/assignments') {
      return jsonResponse([canvasAssignment({ course_id: 10 })]);
    }

    if (parsedUrl.pathname === '/api/v1/courses/20/assignments') {
      return jsonResponse([]);
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  assert.equal(result.courses.length, 3);
  assert.equal(result.assignments.length, 1);
  assert.equal(result.assignments[0].courseId, 10);
  assert.equal(result.assignments[0].courseName, 'Algorithms');
  assert.equal(result.failedCourseCount, 0);
  assert.equal(new Date(result.lastSyncedAt).toISOString(), result.lastSyncedAt);
});

test('syncCanvasAssignments keeps successful course results when another course fails', async () => {
  const result = await syncCanvasAssignments(canvasSettings(), async (url) => {
    const parsedUrl = new URL(url);

    if (parsedUrl.pathname === '/api/v1/courses') {
      return jsonResponse([
        { id: 10, name: 'Algorithms' },
        { id: 20, name: 'Databases' },
      ]);
    }

    if (parsedUrl.pathname === '/api/v1/courses/10/assignments') {
      return jsonResponse([canvasAssignment({ course_id: 10 })]);
    }

    if (parsedUrl.pathname === '/api/v1/courses/20/assignments') {
      return new Response('', { status: 503 });
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  assert.equal(result.failedCourseCount, 1);
  assert.deepEqual(
    result.assignments.map(({ courseId }) => courseId),
    [10],
  );
});

test('syncCanvasAssignments rejects when every syncable course fails', async () => {
  await assert.rejects(
    syncCanvasAssignments(canvasSettings(), async (url) => {
      const parsedUrl = new URL(url);

      if (parsedUrl.pathname === '/api/v1/courses') {
        return jsonResponse([
          { id: 10, name: 'Algorithms' },
          { id: 20, name: 'Databases' },
        ]);
      }

      return new Response('', { status: 503 });
    }),
    isCanvasError('unexpected-response'),
  );
});

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json',
    },
    status: 200,
    ...init,
  });
}

function canvasSettings() {
  return {
    canvasUrl: 'https://canvas.example.edu',
    canvasToken: 'token-value',
  };
}

function canvasAssignment(overrides = {}) {
  return {
    id: 7,
    course_id: 42,
    name: 'Problem set',
    due_at: '2026-07-12T14:00:00Z',
    html_url: 'https://canvas.example.edu/courses/42/assignments/7',
    points_possible: 0,
    workflow_state: 'published',
    updated_at: '2026-07-10T08:00:00Z',
    ...overrides,
  };
}

function assertCanvasError(callback, code) {
  assert.throws(callback, isCanvasError(code));
}

function isCanvasError(code) {
  return (error) => error instanceof CanvasConnectionError && error.code === code;
}
