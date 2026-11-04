import { register } from 'node:module';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 5)) {
  console.error(`\n[TEST] Cần Node.js >= 22.5 (có module node:sqlite). Máy bạn đang dùng ${process.version}.\n` +
    '       Tải bản LTS mới tại https://nodejs.org rồi chạy lại.\n');
  process.exit(1);
}

register('./hooks.mjs', import.meta.url);

// Route handler tự console.error khi gặp lỗi -> tắt cho gọn. Bật lại bằng: TEST_VERBOSE=1
if (!process.env.TEST_VERBOSE) console.error = () => {};
