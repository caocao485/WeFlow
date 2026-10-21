// Exercise the actual bundled worker entry, without mocking Electron or config.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'weflow-report-regression-'));

async function reply(entry, config) {
  const worker = new Worker(entry, { workerData: config, stdout: true, stderr: true });
  worker.stdout.resume(); worker.stderr.resume();
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Report worker did not reply')), 5000);
      worker.on('error', error => { clearTimeout(timer); reject(error); });
      worker.on('message', message => {
        if (!/:(result|error)$/.test(message.type || '')) return;
        clearTimeout(timer); resolve(message);
      });
    });
  } finally { await worker.terminate(); }
}

(async () => {
  for (const name of ['annualReportWorker', 'dualReportWorker']) {
    const entry = path.join(output, name + '.cjs');
    esbuild.buildSync({ entryPoints: [path.join(root, 'electron', name + '.ts')], outfile: entry,
      bundle: true, platform: 'node', format: 'cjs', external: ['electron', 'koffi'], logLevel: 'warning' });
    for (const [values, expected] of [
      [{}, '未配置账号ID'],
      [{ myAccountId: 'synthetic-self' }, '未配置数据库路径'],
      [{ myAccountId: 'synthetic-self', dbPath: output }, '未配置解密密钥'],
    ]) {
      const result = await reply(entry, { year: 2025, friendUsername: 'synthetic-friend',
        dbPath: '', decryptKey: '', myAccountId: '', userDataPath: output, ...values });
      assert.equal(result.type, name.replace('Worker', ':result'));
      assert.equal(result.data.success, false);
      assert.equal(result.data.error, expected);
    }
  }
  console.log(JSON.stringify({ success: true, checks: 6 }));
})().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => fs.rmSync(output, { recursive: true, force: true }));
