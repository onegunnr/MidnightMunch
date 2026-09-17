import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';

const ROOT = process.cwd();
const TESTS_DIR = path.join(ROOT, 'tests');
const OUT_DIR = path.join(ROOT, '.test-dist');

async function findTestFiles(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findTestFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

async function run() {
  const start = performance.now();
  console.log('\n🧪 Running Midnight Munch Test Suite...\n');

  const testFiles = await findTestFiles(TESTS_DIR);
  if (testFiles.length === 0) {
    console.log('No .test.ts files found in tests/');
    process.exit(0);
  }

  // Ensure clean output directory
  await fs.promises.rm(OUT_DIR, { recursive: true, force: true });
  await fs.promises.mkdir(OUT_DIR, { recursive: true });

  try {
    // Compile all test files using esbuild
    const entryPoints = {};
    for (const file of testFiles) {
      const rel = path.relative(TESTS_DIR, file).replace(/\.ts$/, '');
      entryPoints[rel] = file;
    }

    await build({
      entryPoints,
      outdir: OUT_DIR,
      platform: 'node',
      format: 'esm',
      bundle: true,
      sourcemap: 'inline',
      packages: 'external',
      target: 'node20',
    });

    const compiledFiles = (await fs.promises.readdir(OUT_DIR, { recursive: true }))
      .filter((f) => f.endsWith('.js') || f.endsWith('.mjs'))
      .map((f) => path.join(OUT_DIR, f));

    // Execute with Node's native test runner
    const child = spawn(process.execPath, ['--test', ...compiledFiles], {
      stdio: 'inherit',
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'test' },
    });

    child.on('close', async (code) => {
      // Clean up test cache
      await fs.promises.rm(OUT_DIR, { recursive: true, force: true });
      const elapsed = ((performance.now() - start) / 1000).toFixed(2);
      if (code === 0) {
        console.log(`\n✅ All Midnight Munch test suites passed in ${elapsed}s!\n`);
      } else {
        console.error(`\n❌ Test suite failed with exit code ${code} (${elapsed}s)\n`);
      }
      process.exit(code ?? 1);
    });
  } catch (err) {
    await fs.promises.rm(OUT_DIR, { recursive: true, force: true });
    console.error('Build error during test compilation:', err);
    process.exit(1);
  }
}

run();
