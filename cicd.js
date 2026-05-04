import shell from 'shelljs';

const INTERVAL_MS = 30 * 1000;

function gitPull() {
  console.log(`[${new Date().toISOString()}] Running git pull...`);
  const result = shell.exec('git pull', { silent: false });
  if (result.code !== 0) {
    console.error('git pull failed with code', result.code);
  }
}

gitPull();
setInterval(gitPull, INTERVAL_MS);
