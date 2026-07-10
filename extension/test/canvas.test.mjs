import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CanvasConnectionError,
  normalizeCanvasBaseUrl,
  normalizeCanvasUrl,
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

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json',
    },
    status: 200,
    ...init,
  });
}

function assertCanvasError(callback, code) {
  assert.throws(callback, isCanvasError(code));
}

function isCanvasError(code) {
  return (error) => error instanceof CanvasConnectionError && error.code === code;
}
