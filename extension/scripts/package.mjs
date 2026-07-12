#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(scriptDirectory, '..');
const distDirectory = join(extensionRoot, 'dist');
const releaseDirectory = join(extensionRoot, 'release');

const requiredFiles = new Set([
  'assets',
  'background.js',
  'icon16.png',
  'icon32.png',
  'icon48.png',
  'icon128.png',
  'manifest.json',
  'options.html',
  'popup.html',
]);

const textExtensions = new Set(['.css', '.html', '.js', '.json']);
const developmentMarkers = [
  /sourceMappingURL=/i,
  /\/\@vite\/client/i,
  /react-refresh/i,
  /localhost:5173/i,
];

let temporaryDirectory;
let temporaryZipPath;

try {
  await packageExtension();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Packaging failed: ${message}`);
  process.exitCode = 1;
} finally {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
  if (temporaryZipPath) {
    await rm(temporaryZipPath, { force: true });
  }
}

async function packageExtension() {
  const [packageJson, sourceManifest] = await Promise.all([
    readJson(join(extensionRoot, 'package.json')),
    readJson(join(extensionRoot, 'public', 'manifest.json')),
  ]);

  const version = validateVersionMetadata(packageJson, sourceManifest);
  run('pnpm', ['run', 'build'], extensionRoot);

  const distManifest = await readJson(join(distDirectory, 'manifest.json'));
  if (distManifest.version !== version) {
    throw new Error('Built manifest version does not match the package version.');
  }

  const distribution = await inspectDistribution(distDirectory);
  await validateDistribution(distDirectory, distribution);

  temporaryDirectory = await mkdtemp(join(tmpdir(), 'canvas-deadline-copilot-'));
  const stagingDirectory = join(temporaryDirectory, 'extension');
  await cp(distDirectory, stagingDirectory, {
    errorOnExist: true,
    force: false,
    recursive: true,
  });

  const stagedDistribution = await inspectDistribution(stagingDirectory);
  await validateDistribution(stagingDirectory, stagedDistribution);
  assertEqualLists(
    distribution.files,
    stagedDistribution.files,
    'Staged package files differ from the validated build output.',
  );

  await mkdir(releaseDirectory, { recursive: true });
  const zipFilename = `canvas-deadline-copilot-${version}.zip`;
  const finalZipPath = join(releaseDirectory, zipFilename);
  temporaryZipPath = join(releaseDirectory, `.${zipFilename}.${process.pid}.zip`);

  run('zip', ['-X', '-q', '-r', temporaryZipPath, '.'], stagingDirectory);
  const archiveFiles = listArchiveFiles(temporaryZipPath);
  assertEqualLists(
    stagedDistribution.files,
    archiveFiles,
    'ZIP contents differ from the validated staging directory.',
  );

  await rm(finalZipPath, { force: true });
  await rename(temporaryZipPath, finalZipPath);
  temporaryZipPath = undefined;

  console.log(`Created ${finalZipPath}`);
  console.log(`Packaged ${archiveFiles.length} extension files.`);
}

function validateVersionMetadata(packageJson, manifest) {
  const packageVersion = packageJson.version;
  const manifestVersion = manifest.version;

  if (
    typeof packageVersion !== 'string' ||
    !/^\d+(?:\.\d+){1,3}$/.test(packageVersion)
  ) {
    throw new Error('package.json contains an invalid Chrome extension version.');
  }
  if (manifestVersion !== packageVersion) {
    throw new Error('package.json and public/manifest.json versions must match.');
  }

  return packageVersion;
}

async function inspectDistribution(rootDirectory) {
  const files = [];
  const directories = [];

  async function visit(relativeDirectory = '') {
    const absoluteDirectory = relativeDirectory
      ? join(rootDirectory, relativeDirectory)
      : rootDirectory;
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;

      if (entry.isSymbolicLink()) {
        throw new Error(`Symlinks are not allowed in the release: ${relativePath}`);
      }
      if (entry.isDirectory()) {
        directories.push(relativePath);
        await visit(relativePath);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(`Unsupported release entry: ${relativePath}`);
      }

      files.push(relativePath);
    }
  }

  await visit();
  return {
    directories: directories.sort(),
    files: files.sort(),
  };
}

async function validateDistribution(rootDirectory, distribution) {
  if (distribution.directories.length !== 1 || distribution.directories[0] !== 'assets') {
    throw new Error('The release may contain only the generated assets directory.');
  }

  const topLevelEntries = new Set(
    distribution.files.map((file) => (file.includes('/') ? file.split('/')[0] : file)),
  );
  topLevelEntries.add('assets');

  for (const requiredFile of requiredFiles) {
    if (!topLevelEntries.has(requiredFile)) {
      throw new Error(`Required release entry is missing: ${requiredFile}`);
    }
  }

  for (const entry of topLevelEntries) {
    if (!requiredFiles.has(entry)) {
      throw new Error(`Unexpected top-level release entry: ${entry}`);
    }
  }

  for (const file of distribution.files) {
    const isAllowedTopLevelFile = requiredFiles.has(file) && file !== 'assets';
    const isAllowedAsset = /^assets\/[A-Za-z0-9._-]+\.(?:css|js)$/.test(file);
    if (!isAllowedTopLevelFile && !isAllowedAsset) {
      throw new Error(`Unexpected release file: ${file}`);
    }

    const extension = file.slice(file.lastIndexOf('.')).toLowerCase();
    if (!textExtensions.has(extension)) {
      continue;
    }

    const contents = await readFile(join(rootDirectory, file), 'utf8');
    if (contents.includes(extensionRoot)) {
      throw new Error(`Workspace path found in release file: ${file}`);
    }
    for (const marker of developmentMarkers) {
      if (marker.test(contents)) {
        throw new Error(`Development marker found in release file: ${file}`);
      }
    }
  }

  if (!distribution.files.some((file) => file.startsWith('assets/') && file.endsWith('.js'))) {
    throw new Error('The release does not contain a generated JavaScript asset.');
  }
  if (!distribution.files.some((file) => file.startsWith('assets/') && file.endsWith('.css'))) {
    throw new Error('The release does not contain a generated CSS asset.');
  }
}

function listArchiveFiles(zipPath) {
  return run('unzip', ['-Z1', zipPath], extensionRoot, true)
    .split(/\r?\n/)
    .map((entry) => entry.replace(/^\.\//, ''))
    .filter((entry) => entry && !entry.endsWith('/'))
    .sort();
}

function assertEqualLists(expected, actual, message) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(message);
  }
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new Error(`Unable to read valid JSON from ${path}.`);
  }
}

function run(command, args, cwd, captureOutput = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error) {
    throw new Error(`Unable to run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const details = captureOutput && result.stderr ? ` ${result.stderr.trim()}` : '';
    throw new Error(`${command} exited with status ${result.status}.${details}`);
  }

  return captureOutput ? result.stdout : '';
}
