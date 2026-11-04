// Loader hooks: khi chạy test, thay các module phụ thuộc bên ngoài bằng bản giả lập.
// Không sửa một dòng nào trong mã nguồn của ứng dụng.
const here = new URL('.', import.meta.url);
const MAP = {
  '@/lib/db': new URL('./fake-db.mjs', here).href,        // mysql2  -> SQLite trong bộ nhớ
  '@/lib/auth': new URL('../../lib/auth.js', here).href,
  'next/server': new URL('./next-server-stub.mjs', here).href, // NextResponse tối giản
};

export async function resolve(specifier, context, nextResolve) {
  if (MAP[specifier]) return { url: MAP[specifier], shortCircuit: true };
  return nextResolve(specifier, context);
}
