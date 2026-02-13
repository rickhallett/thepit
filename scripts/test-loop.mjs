import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MODE = process.env.TEST_MODE || 'fast';
const COMMAND =
  MODE === 'full' ? ['pnpm', ['run', 'test:ci']] : ['pnpm', ['run', 'test:unit']];

const WATCH_DIRS = ['app', 'components', 'lib', 'db', 'tests', 'scripts'];

let running = false;
let queued = false;

const run = () => {
  if (running) {
    queued = true;
    return;
  }
  running = true;
  const [cmd, args] = COMMAND;
  const child = spawn(cmd, args, { stdio: 'inherit', shell: false });
  child.on('close', () => {
    running = false;
    if (queued) {
      queued = false;
      run();
    }
  });
};

const schedule = (() => {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(run, 200);
  };
})();

console.log(`Test loop started (${MODE}). Watching: ${WATCH_DIRS.join(', ')}`);
run();

WATCH_DIRS.forEach((dir) => {
  const target = path.join(ROOT, dir);
  watch(target, { recursive: true }, () => schedule());
});
