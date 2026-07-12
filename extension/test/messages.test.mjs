import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ASSIGNMENTS_UPDATED_MESSAGE,
  notifyAssignmentsUpdated,
} from '../.test-build/lib/messages.js';

test('assignment update messaging is optional when Chrome APIs are unavailable', async () => {
  await withChrome(undefined, async () => {
    await assert.doesNotReject(notifyAssignmentsUpdated());
  });

  await withChrome({ runtime: {} }, async () => {
    await assert.doesNotReject(notifyAssignmentsUpdated());
  });
});

test('assignment update messaging sends only the expected non-sensitive payload', async () => {
  let receivedMessage;

  await withChrome(
    {
      runtime: {
        lastError: undefined,
        sendMessage(message, callback) {
          receivedMessage = message;
          callback();
        },
      },
    },
    () => notifyAssignmentsUpdated(),
  );

  assert.deepEqual(receivedMessage, { type: ASSIGNMENTS_UPDATED_MESSAGE });
  assert.deepEqual(Object.keys(receivedMessage), ['type']);
});

test('assignment update messaging consumes callback lastError without rejecting', async () => {
  let lastErrorReadCount = 0;
  const runtime = {
    get lastError() {
      lastErrorReadCount += 1;
      return { message: 'Internal messaging detail that must remain private.' };
    },
    sendMessage(_message, callback) {
      callback();
    },
  };

  await withChrome({ runtime }, async () => {
    await assert.doesNotReject(notifyAssignmentsUpdated());
  });

  assert.equal(lastErrorReadCount, 1);
});

test('assignment update messaging absorbs rejected Promise-style sends', async () => {
  let receivedMessage;

  await withChrome(
    {
      runtime: {
        lastError: undefined,
        sendMessage(message) {
          receivedMessage = message;
          return Promise.reject(new Error('Internal Promise rejection detail.'));
        },
      },
    },
    async () => {
      await assert.doesNotReject(notifyAssignmentsUpdated());
    },
  );

  assert.deepEqual(receivedMessage, { type: ASSIGNMENTS_UPDATED_MESSAGE });
});

test('assignment update messaging absorbs synchronous send failures', async () => {
  await withChrome(
    {
      runtime: {
        lastError: undefined,
        sendMessage() {
          throw new Error('Internal synchronous failure detail.');
        },
      },
    },
    async () => {
      await assert.doesNotReject(notifyAssignmentsUpdated());
    },
  );
});

async function withChrome(value, callback) {
  const originalChrome = Object.getOwnPropertyDescriptor(globalThis, 'chrome');

  try {
    if (value === undefined) {
      delete globalThis.chrome;
    } else {
      Object.defineProperty(globalThis, 'chrome', {
        configurable: true,
        writable: true,
        value,
      });
    }

    return await callback();
  } finally {
    if (originalChrome) {
      Object.defineProperty(globalThis, 'chrome', originalChrome);
    } else {
      delete globalThis.chrome;
    }
  }
}
