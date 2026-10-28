import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

async function waitForClose(closed, milliseconds) {
  let timer;
  try {
    return await Promise.race([
      closed.then(() => true),
      new Promise(resolve => { timer = setTimeout(() => resolve(false), milliseconds); })
    ]);
  } finally { clearTimeout(timer); }
}

// Own only this run's browser and profile. Never remove other Temp profiles.
export async function withBrowserTestResources(server, name, test) {
  let profile, browser, browserClosed, cleanupPromise;
  let passed = false;
  let interrupted = false;
  let finishStartup;
  const startupFinished = new Promise(resolve => { finishStartup = resolve; });

  const cleanup = () => cleanupPromise ??= (async () => {
    const errors = [];
    let browserStopped = !browser?.pid;
    if (browser?.pid) {
      try {
        if (browser.exitCode === null && browser.signalCode === null) {
          // Shutdown does not depend on the test's CDP request queue.
          browser.stdio[3].write(JSON.stringify({ id: 2147483647, method: 'Browser.close' }) + '\0', () => {});
          if (!await waitForClose(browserClosed, 5000)) {
            if (process.platform === 'win32') {
              await new Promise((resolve, reject) => {
                const killer = spawn('taskkill', ['/PID', String(browser.pid), '/T', '/F'], { windowsHide: true });
                killer.once('error', reject);
                killer.once('exit', code => code === 0 || browser.exitCode !== null || browser.signalCode !== null
                  ? resolve() : reject(new Error(`taskkill exited with ${code}`)));
              });
            } else {
              browser.kill('SIGKILL');
            }
          }
        }
        if (!await waitForClose(browserClosed, 10000)) {
          throw new Error('Chrome did not terminate; profile retained');
        }
        browserStopped = true;
      } catch (error) { errors.push(error); }
    }
    server.closeAllConnections();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    if (profile) {
      let screenshotsSaved = true;
      if (!passed || interrupted) {
        try {
          const screenshots = (await readdir(profile)).filter(file => file.endsWith('.png'));
          if (screenshots.length) {
            const results = path.resolve('test-results', path.basename(profile) + '-' + name);
            await mkdir(results, { recursive: true });
            for (const file of screenshots) await copyFile(path.join(profile, file), path.join(results, file));
            console.error(`Failed-test screenshots: ${results}`);
          }
        } catch (error) { screenshotsSaved = false; errors.push(error); }
      }
      // Do not delete a profile if browser shutdown could not be confirmed.
      if (screenshotsSaved && browserStopped) {
        try {
          await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
          console.log(`Temporary browser profile removed: ${profile}`);
        } catch (error) { errors.push(error); }
      }
    }
    if (errors.length) {
      console.error(`Browser test cleanup failed (${profile ?? 'no profile'}):`, ...errors);
      throw new AggregateError(errors, 'Browser test cleanup failed');
    }
  })();

  const onInterrupt = () => {
    interrupted = true;
    startupFinished.then(cleanup).then(() => process.exit(130), () => process.exit(1));
  };
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onInterrupt);
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    profile = await mkdtemp(path.join(tmpdir(), 'letterarchive-browser-'));
    const executable = process.env.LETTERARCHIVE_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-pipe', 'about:blank'], {
      windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe']
    });
    browserClosed = new Promise(resolve => browser.once('close', resolve));
    // Consume shutdown/startup pipe errors; spawn errors are propagated below.
    browser.stdio[3].on('error', () => {});
    browser.stderr.resume();
    await new Promise((resolve, reject) => {
      browser.once('spawn', resolve);
      browser.once('error', reject);
    });
    finishStartup();
    if (interrupted) return;
    await test({ browser, profile });
    passed = true;
  } finally {
    finishStartup();
    try { await cleanup(); }
    finally {
      process.off('SIGINT', onInterrupt);
      process.off('SIGTERM', onInterrupt);
    }
  }
}
