import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const device = process.argv[2] ?? 'emulator-5554';
if (!/^[a-zA-Z0-9_.:-]+$/.test(device)) {
  throw new Error('Expected a Flutter device ID.');
}

const args = ['--no-version-check', 'run', '--machine', '-d', device];
const options = { cwd: projectRoot, stdio: ['pipe', 'pipe', 'inherit'] };
const flutter = process.platform === 'win32'
  ? spawn(`flutter ${args.join(' ')}`, { ...options, shell: true })
  : spawn('flutter', args, options);

let appId;
let pending = false;
let timer;
let requestId = 0;
let activeRequest;

function reload() {
  if (!appId || !pending || timer || activeRequest !== undefined) return;
  pending = false;
  activeRequest = ++requestId;
  flutter.stdin.write(JSON.stringify([{
    id: activeRequest,
    method: 'app.restart',
    params: { appId, fullRestart: false, reason: 'save' },
  }]) + '\n');
}

const watcher = watch(new URL('../lib/', import.meta.url), { recursive: true }, (_, filename) => {
  if (!filename?.endsWith('.dart')) return;
  pending = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    reload();
  }, 350);
});

createInterface({ input: flutter.stdout }).on('line', (line) => {
  if (!line.startsWith('[{')) {
    console.log(line);
    return;
  }
  for (const message of JSON.parse(line)) {
    if (message.event === 'app.started') {
      appId = message.params.appId;
      console.log('Watching lib/ for Dart saves.');
      reload();
    }
    if (message.event === 'app.log') {
      console.log(message.params.log);
    }
    if (message.event === 'app.progress' && message.params.message) {
      console.log(message.params.message);
    }
    if ('id' in message && message.id === activeRequest) {
      console.log(message.error?.message ?? message.result?.message ?? 'Hot reload finished.');
      activeRequest = undefined;
      reload();
    }
  }
});

flutter.on('error', (error) => console.error(error.message));
flutter.on('close', (code) => {
  watcher.close();
  clearTimeout(timer);
  process.exitCode = code ?? 1;
});
