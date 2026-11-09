// Chạy toàn bộ test:   node tests/run.mjs            (hoặc: npm test)
//   --json                       ghi thêm kết quả từng test ra tests/results.json
//   --test-name-pattern=TC-013   chỉ chạy các test có tên khớp (truyền thẳng cho node --test)
//   TEST_VERBOSE=1               hiện log lỗi của route handler
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 5)) {
  console.error(`\n[TEST] Cần Node.js >= 22.5 (có module node:sqlite). Máy bạn đang dùng ${process.version}.\n` +
    '       Tải bản LTS mới tại https://nodejs.org rồi chạy lại.\n');
  process.exit(1);
}
// node:sqlite chỉ bật sẵn từ Node 22.13 / 23.4; bản cũ hơn cần cờ này (truyền cho cả các tiến trình con)
const needsSqliteFlag = (major === 22 && minor < 13) || (major === 23 && minor < 4);
const env = { ...process.env };
if (needsSqliteFlag) env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --experimental-sqlite`.trim();

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const passthrough = args.filter(a => a !== '--json');

const files = readdirSync(here).filter(f => f.endsWith('.test.mjs')).sort().map(f => join(here, f));
const nodeArgs = [
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
  '--import', pathToFileURL(join(here, 'setup', 'register.mjs')).href,
  '--test', '--test-reporter=spec', '--test-reporter-destination=stdout',
];
if (wantJson) {
  nodeArgs.push(
    `--test-reporter=${pathToFileURL(join(here, 'setup', 'json-reporter.mjs')).href}`,
    `--test-reporter-destination=${join(here, 'results.json')}`,
  );
}
nodeArgs.push(...passthrough, ...files);

const r = spawnSync(process.execPath, nodeArgs, { stdio: 'inherit', env });
process.exit(r.status ?? 1);
