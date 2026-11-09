// Reporter tùy chỉnh: gom kết quả từng test thành một file JSON (dùng để điền TC-01.xlsx / báo cáo).
import { basename } from 'node:path';

function messageOf(err) {
  if (!err) return undefined;
  const e = err.cause ?? err;
  return String(e.message ?? e).replace(/\r/g, '').trim().slice(0, 1500);
}

export default async function* jsonReporter(source) {
  const tests = [];
  for await (const ev of source) {
    if (ev.type !== 'test:pass' && ev.type !== 'test:fail') continue;
    const d = ev.data;
    if (d.details?.type === 'suite') continue;
    tests.push({
      name: d.name,
      file: d.file ? basename(d.file) : null,
      status: ev.type === 'test:pass' ? 'pass' : 'fail',
      ms: Math.round(d.details?.duration_ms ?? 0),
      message: ev.type === 'test:fail' ? messageOf(d.details?.error) : undefined,
    });
  }
  yield JSON.stringify({ generatedAt: new Date().toISOString(), node: process.version, tests }, null, 2) + '\n';
}
