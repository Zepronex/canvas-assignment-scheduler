export function validateManifestReferences(manifest, distributionFiles) {
  if (!isRecord(manifest) || manifest.manifest_version !== 3) {
    throw new Error('The release manifest must use Manifest V3.');
  }

  const action = requireRecord(manifest.action, 'action');
  const background = requireRecord(manifest.background, 'background');
  if (background.type !== 'module') {
    throw new Error('The background service worker must be declared as a module.');
  }

  const references = [
    ['action.default_popup', action.default_popup],
    ['background.service_worker', background.service_worker],
    ['options_page', manifest.options_page],
    ...collectIconReferences(action.default_icon, 'action.default_icon'),
    ...collectIconReferences(manifest.icons, 'icons'),
  ];
  const packagedFiles = new Set(distributionFiles);

  for (const [field, file] of references) {
    if (typeof file !== 'string' || !file || !packagedFiles.has(file)) {
      throw new Error(`Manifest field ${field} does not reference a packaged file.`);
    }
  }
}

function collectIconReferences(value, field) {
  const icons = requireRecord(value, field);
  const entries = Object.entries(icons);
  if (entries.length === 0) {
    throw new Error(`Manifest field ${field} must declare at least one icon.`);
  }

  return entries.map(([size, file]) => [`${field}.${size}`, file]);
}

function requireRecord(value, field) {
  if (!isRecord(value)) {
    throw new Error(`Manifest field ${field} must be an object.`);
  }

  return value;
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
