import assert from 'node:assert/strict';
import test from 'node:test';

import { getSafeHttpsUrl, isSafeHttpsUrl } from '../.test-build/lib/urls.js';

test('accepts normalized HTTPS links without embedded credentials', () => {
  assert.equal(
    getSafeHttpsUrl('https://canvas.example.edu/courses/42/assignments/7'),
    'https://canvas.example.edu/courses/42/assignments/7',
  );
  assert.equal(isSafeHttpsUrl('https://calendar.google.com/calendar/render'), true);
});

test('rejects unsafe, credential-bearing, and malformed external links', () => {
  for (const value of [
    'http://canvas.example.edu/assignment/7',
    'javascript:alert(1)',
    'data:text/html,unsafe',
    'https://user:password@canvas.example.edu/assignment/7',
    'https://*.example.edu/assignment/7',
    'https://*',
    'not a URL',
  ]) {
    assert.equal(getSafeHttpsUrl(value), null);
    assert.equal(isSafeHttpsUrl(value), false);
  }
});
