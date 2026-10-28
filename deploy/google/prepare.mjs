import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(root,process.argv[2] || '.deploy/google-functions');
if (!output.startsWith(path.join(root,'.deploy')+path.sep)) throw new Error('Output must be a new directory under .deploy/.');
const run = (cwd, args) => {
  const result = spawnSync('npm', args, { cwd: path.join(root, cwd), stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Build failed in ${cwd}`);
};
run('contracts', ['run', 'build']);
run('backend', ['run', 'build', '--ignore-scripts']);
run('admin', ['run', 'build', '--ignore-scripts']);
// Require a clean output directory rather than risking broad recursive deletion.
await mkdir(path.dirname(output), { recursive: true });
await mkdir(output);
for (const [from, to] of [
  ['backend/dist', 'backend/dist'],
  ['admin/dist', 'admin/dist'], ['contracts/dist', 'contracts/dist'],
  ['contracts/package.json', 'contracts/package.json'],
]) await cp(path.join(root, from), path.join(output, to), { recursive: true });
// Carry only published CMS fallback data, never credentials or private uploads.
try {
  const entries = await readdir(path.join(root, 'backend/data'));
  for (const name of entries) {
    if (['content-web.json', 'content-mobile.json', 'content-images'].includes(name)) {
      await cp(path.join(root, 'backend/data', name), path.join(output, 'backend/data', name), { recursive: true });
    }
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
// Local file dependencies otherwise cause npm to resolve their development tools.
const contract = JSON.parse(await readFile(path.join(root, 'contracts/package.json'), 'utf8'));
const { devDependencies: _dev, scripts: _scripts, bin: _bin, ...runtimeContract } = contract;
await writeFile(path.join(output, 'contracts/package.json'), JSON.stringify(runtimeContract, null, 2));
const source = JSON.parse(await readFile(path.join(root, 'backend/package.json'), 'utf8'));
const { 'firebase-functions': _unusedFunctionsSdk,...runtimeDependencies } = source.dependencies;
const dependencies = {
  ...runtimeDependencies,
  prisma: source.devDependencies.prisma,
  '@askhub/puzzle-contracts': 'file:./contracts',
  '@google-cloud/functions-framework': '^4.0.0',
};
await mkdir(path.join(output, 'prisma'), { recursive: true });
await cp(path.join(root, 'backend/prisma/schema.prisma'), path.join(output, 'prisma/schema.prisma'));
await cp(path.join(root, 'backend/prisma/migrations'), path.join(output, 'prisma/migrations'), { recursive: true });
const generate = 'DATABASE_URL="${DATABASE_URL:-postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder}" DIRECT_URL="${DIRECT_URL:-postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder}" prisma generate';
await writeFile(path.join(output, 'package.json'), JSON.stringify({
  name: 'teen-adventures-functions', version: source.version, private: true, type: 'module',
  main: 'backend/dist/functions.js', engines: { node: '22' }, dependencies,
  overrides: { 'body-parser': '^1.20.6', qs: '^6.16.0', 'deepmerge-ts': '^8.0.0', cloudevents: { uuid: '^11.1.1' } },
  scripts: {
    postinstall: generate,
    'gcp-build': generate,
    'migrate:deploy': 'prisma migrate deploy',
    start: 'functions-framework --target=teenApi',
  },
}, null, 2));
await writeFile(path.join(output, '.gcloudignore'), '.git\nnode_modules\n.env\n.env.*\n*.log\n');
console.log(`Prepared allowlisted function source at ${output}`);
console.log('Next: npm install --package-lock-only inside that directory to pin cloud dependencies.');
