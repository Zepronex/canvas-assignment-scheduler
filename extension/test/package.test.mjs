import assert from 'node:assert/strict';
import test from 'node:test';

import { validateManifestReferences } from '../scripts/package-validation.mjs';

const DISTRIBUTION_FILES = [
  'background.js',
  'icon16.png',
  'icon32.png',
  'manifest.json',
  'options.html',
  'popup.html',
];

test('accepts Manifest V3 entry points and icons present in the package', () => {
  assert.doesNotThrow(() =>
    validateManifestReferences(validManifest(), DISTRIBUTION_FILES),
  );
});

test('rejects invalid manifest versions, workers, entry points, and icons', () => {
  for (const manifest of [
    validManifest({ manifest_version: 2 }),
    validManifest({ background: { service_worker: 'background.js' } }),
    validManifest({ options_page: 'missing.html' }),
    validManifest({ icons: { 16: 'missing.png' } }),
  ]) {
    assert.throws(() => validateManifestReferences(manifest, DISTRIBUTION_FILES));
  }
});

function validManifest(overrides = {}) {
  return {
    manifest_version: 3,
    action: {
      default_popup: 'popup.html',
      default_icon: {
        16: 'icon16.png',
        32: 'icon32.png',
      },
    },
    background: {
      service_worker: 'background.js',
      type: 'module',
    },
    options_page: 'options.html',
    icons: {
      16: 'icon16.png',
      32: 'icon32.png',
    },
    ...overrides,
  };
}
