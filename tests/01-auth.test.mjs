// TC-001 → TC-007 (Tài khoản) + kiểm thử xác thực/đăng nhập.
// Mã test: TC-xxx = test case trong TC-01.xlsx | EXT = kiểm thử bổ sung | SEC = bảo mật | CT = hợp đồng API-01
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seedBase, call, one, countOf, login, routeExists, addUser, injectFault } from './helpers.mjs';

const YEAR = new Date().getFullYear();
const form = (o = {}) => ({
  email: 'moi@test.vn', phone: '0912345678', full_name: 'Người Dùng Mới', password: 'MatKhau@123',
  birth_year: 2005, gender: 'MALE', province: 'Hà Nội', ...o,
});
const register = body => call('auth/register', 'POST', { body });
const phoneOf = id => one('SELECT phone FROM users WHERE user_id = ?', id).phone;

describe('Tài khoản – đăng ký (TC-001…006)', () => {
  beforeEach(() => seedBase());

  it('TC-001 | đăng ký thành công: tạo tài khoản VIEWER, số dư 0 xu', async () => {
    const r = await register(form());
    assert.equal(r.status, 200, r.raw);
    assert.equal(r.body.success, true);
    const u = one('SELECT * FROM users WHERE email = ?', 'moi@test.vn');
    assert.ok(u, 'tài khoản chưa được tạo');
    assert.equal(u.system_role, 'VIEWER');
    assert.equal(u.xu_balance, 0);
    assert.equal(u.account_status, 'ACTIVE');
  });

  it('TC-002 | đăng ký trùng email: bị từ chối, báo thông tin đã được dùng, không tạo thêm tài khoản', async () => {
    const before = countOf('users');
    const r = await register(form({ email: 'long.tv@gmail.com' }));
    assert.equal(r.body.success, false);
    assert.ok(r.status >= 400 && r.status < 500, `phải là lỗi 4xx, nhận ${r.status}`);
    assert.match(r.body.message, /đã (được )?(dùng|đăng ký)/i);
    assert.equal(countOf('users'), before, 'vẫn tạo thêm tài khoản dù trùng email');
  });

  it('TC-003 | đăng ký trùng số điện thoại: bị từ chối, không tạo tài khoản', async () => {
    const before = countOf('users');
    const r = await register(form({ phone: phoneOf(5) }));
    assert.equal(r.body.success, false);
    assert.ok(r.status >= 400 && r.status < 500, `phải là lỗi 4xx, nhận ${r.status}`);
    assert.match(r.body.message, /đã (được )?(dùng|đăng ký)/i);
    assert.equal(countOf('users'), before);
  });

  it('TC-004 | dưới 16 tuổi (năm sinh 2015): bị từ chối, không tạo tài khoản', async () => {
    const r = await register(form({ birth_year: 2015 }));
    assert.equal(r.body.success, false);
    assert.equal(r.status, 400);
    assert.equal(countOf('users', 'email = ?', 'moi@test.vn'), 0);
  });

  it('TC-005 | OTP sai 3 lần buộc gửi OTP mới (cần endpoint xác thực OTP)', () => {
    assert.ok(routeExists('auth/verify-otp'),
      'Chưa có endpoint /auth/verify-otp: chức năng OTP khi đăng ký chưa được cài đặt (register tạo tài khoản ngay, không qua OTP)');
  });

  it('TC-006 | OTP hết hạn sau 5 phút (cần endpoint xác thực OTP)', () => {
    assert.ok(routeExists('auth/verify-otp'), 'Chưa có endpoint /auth/verify-otp nên không có OTP để hết hạn');
  });
});

describe('Tài khoản – đăng nhập (TC-007 và bảo mật xác thực)', () => {
  beforeEach(() => seedBase());

  it('TC-007 | đăng nhập tài khoản bị khóa: bị từ chối, báo tài khoản bị khóa, không trả dữ liệu người dùng', async () => {
    const r = await login('bot@gmail.com', '123456');
    assert.equal(r.body.success, false,
      `API trả success=${r.body.success} (HTTP ${r.status}) cho tài khoản LOCKED và còn trả cả dữ liệu người dùng; chỉ có thông báo nhắc khóa`);
    assert.match(r.body.message, /khóa/i);
    assert.equal(r.body.user, undefined, 'vẫn trả thông tin người dùng của tài khoản bị khóa');
  });

  it('SEC-01 | mật khẩu nhập lúc đăng ký phải là mật khẩu đăng nhập của tài khoản đó', async () => {
    const reg = await register(form({ password: 'MatKhau@123' }));
    assert.equal(reg.status, 200, reg.raw);
    const ok = await login('moi@test.vn', 'MatKhau@123');
    assert.equal(ok.status, 200,
      `Đăng nhập bằng đúng mật khẩu vừa đăng ký bị từ chối (HTTP ${ok.status}): register bỏ qua mật khẩu người dùng và luôn gán mật khẩu demo`);
  });

  it('SEC-02 | không đăng nhập được bằng mật khẩu demo "123456" vào tài khoản có mật khẩu khác', async () => {
    addUser({ email: 'khac@test.vn', phone: '0988888888', password_hash: '$2a$12$' + 'x'.repeat(53) });
    const r = await login('khac@test.vn', '123456');
    assert.equal(r.status, 401, `Đăng nhập thành công (HTTP ${r.status}) bằng "123456" vào tài khoản KHÔNG dùng mật khẩu này (cả ADMIN cũng vậy)`);
  });

  it('SEC-03 | không đăng nhập được bằng chính chuỗi băm của mật khẩu', async () => {
    const hash = '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ0123456';
    addUser({ email: 'hash@test.vn', phone: '0977777777', password_hash: hash });
    const r = await login('hash@test.vn', hash);
    assert.equal(r.status, 401, 'Mật khẩu đang được so sánh trực tiếp với chuỗi lưu trong CSDL (không dùng bcrypt.compare)');
  });

  it('SEC-04 | sai mật khẩu bị từ chối (401)', async () => {
    const r = await login('long.tv@gmail.com', 'sai-mat-khau');
    assert.equal(r.status, 401);
    assert.equal(r.body.success, false);
  });

  it('SEC-05 | thông báo lỗi đăng nhập không lộ mật khẩu và không cho dò tài khoản tồn tại', async () => {
    const wrong = await login('long.tv@gmail.com', 'sai-mat-khau');
    const unknown = await login('khong.ton.tai@x.vn', 'sai-mat-khau');
    assert.doesNotMatch(wrong.body.message, /123456/, `Thông báo lỗi tiết lộ mật khẩu: "${wrong.body.message}"`);
    assert.equal(wrong.body.message, unknown.body.message,
      'Thông báo khác nhau giữa "sai mật khẩu" và "tài khoản không tồn tại" -> kẻ tấn công dò được email/SĐT nào đã đăng ký');
  });

  it('SEC-06 | đăng nhập thành công trả JWT để xác thực các API sau (API-01)', async () => {
    const r = await login('long.tv@gmail.com', '123456');
    assert.equal(r.status, 200);
    const token = r.body.token || r.body.access_token || r.body.jwt || r.body.data?.token;
    assert.ok(token, 'Đăng nhập không phát hành token/JWT; AUTH_SECRET trong .env.local không được dùng ở đâu');
  });

  it('SEC-07 | chống SQL injection ở form đăng nhập', async () => {
    const r1 = await login("' OR '1'='1' -- ", 'x');
    const r2 = await login('long.tv@gmail.com', "' OR '1'='1");
    assert.equal(r1.status, 401);
    assert.equal(r2.status, 401);
  });

  it('SEC-08 | phản hồi đăng nhập không chứa password_hash', async () => {
    const r = await login('long.tv@gmail.com', '123456');
    assert.equal(r.status, 200);
    assert.equal('password_hash' in r.body.user, false);
    assert.doesNotMatch(r.raw, /\$2a\$/);
  });
});

describe('Đăng ký – kiểm tra dữ liệu đầu vào (EXT)', () => {
  beforeEach(() => seedBase());

  it('EXT-01 | thiếu trường bắt buộc (email/SĐT/họ tên/mật khẩu) bị từ chối 400', async () => {
    for (const field of ['email', 'phone', 'full_name', 'password']) {
      const body = form(); delete body[field];
      const r = await register(body);
      assert.equal(r.status, 400, `thiếu ${field} phải 400, nhận ${r.status}`);
    }
    assert.equal(countOf('users', 'email = ?', 'moi@test.vn'), 0);
  });

  it('EXT-02 | biên tuổi: 15 tuổi bị từ chối, 16 tuổi được chấp nhận', async () => {
    const r15 = await register(form({ email: 'a15@t.vn', phone: '0900000015', birth_year: YEAR - 15 }));
    const r16 = await register(form({ email: 'a16@t.vn', phone: '0900000016', birth_year: YEAR - 16 }));
    assert.equal(r15.status, 400, '15 tuổi phải bị từ chối');
    assert.equal(r16.status, 200, '16 tuổi phải được chấp nhận');
  });

  it('EXT-03 | không thể qua mặt kiểm tra tuổi bằng cách bỏ trống/gửi sai năm sinh', async () => {
    const bypass = [];
    let i = 0;
    for (const v of [undefined, '', 0, 'abc', null]) {
      i++;
      const body = form({ email: `by${i}@t.vn`, phone: `09000001${i}0`, birth_year: v });
      if (v === undefined) delete body.birth_year;
      const r = await register(body);
      if (r.status === 200) bypass.push(JSON.stringify(v) ?? 'không gửi');
    }
    assert.deepEqual(bypass, [], `Đăng ký thành công khi năm sinh = ${bypass.join(' | ')} (bỏ qua giới hạn 16 tuổi)`);
  });

  it('EXT-04 | email và số điện thoại sai định dạng bị từ chối', async () => {
    const accepted = [];
    for (const [email, phone] of [['khong-phai-email', '0912345670'], ['a@b', '0912345671'], ['ok@test.vn', 'abcdefghij'], ['ok2@test.vn', '12']]) {
      const r = await register(form({ email, phone }));
      if (r.status === 200) accepted.push(`${email} / ${phone}`);
    }
    assert.deepEqual(accepted, [], `API-01 yêu cầu kiểm tra dữ liệu đầu vào, nhưng các giá trị sau được chấp nhận: ${accepted.join(' ; ')}`);
  });

  it('EXT-05 | email có khoảng trắng thừa được cắt trước khi lưu (để đăng nhập lại được)', async () => {
    const reg = await register(form({ email: '  trim@test.vn  ' }));
    assert.equal(reg.status, 200, reg.raw);
    const r = await login('trim@test.vn', '123456');
    assert.equal(r.status, 200, `Không đăng nhập lại được bằng email đã nhập (HTTP ${r.status}): register lưu nguyên khoảng trắng còn login thì cắt`);
  });

  it('EXT-06 | mã giới thiệu: hợp lệ thì liên kết; mã sai hoặc người giới thiệu bị khóa thì bỏ qua', async () => {
    const ok = await register(form({ email: 'r1@t.vn', phone: '0911111111', referral_code: 'YX00000005' }));
    const bad = await register(form({ email: 'r2@t.vn', phone: '0911111112', referral_code: 'KHONGCO' }));
    const locked = await register(form({ email: 'r3@t.vn', phone: '0911111113', referral_code: 'YX00000010' }));
    const ref = id => one('SELECT referred_by AS r FROM users WHERE user_id = ?', id).r;
    assert.equal(ref(ok.body.user_id), 5);
    assert.equal(ref(bad.body.user_id), null);
    assert.equal(ref(locked.body.user_id), null);
  });

  it('EXT-07 | dữ liệu có ký tự SQL được lưu nguyên văn, không phá CSDL', async () => {
    const name = "Robert'); DROP TABLE users;--";
    const r = await register(form({ full_name: name }));
    assert.equal(r.status, 200, r.raw);
    assert.equal(one('SELECT full_name AS n FROM users WHERE email = ?', 'moi@test.vn').n, name);
    assert.ok(countOf('users') >= 10);
  });
});

describe('Hợp đồng API-01 – tài khoản (CT)', () => {
  beforeEach(() => seedBase());

  it('CT-01 | email/SĐT trùng trả 409 (API-01)', async () => {
    const e = await register(form({ email: 'long.tv@gmail.com' }));
    const p = await register(form({ phone: phoneOf(5) }));
    assert.equal(e.status, 409, `trùng email trả ${e.status}`);
    assert.equal(p.status, 409, `trùng SĐT trả ${p.status}`);
  });

  it('CT-02 | đăng nhập tài khoản bị khóa trả 403 (API-01)', async () => {
    const r = await login('bot@gmail.com', '123456');
    assert.equal(r.status, 403, `trả ${r.status}`);
  });

  it('CT-06 | body JSON sai định dạng trả 400, không phải 500 kèm lỗi nội bộ', async () => {
    const bad = [];
    for (const [rel, method] of [['auth/login', 'POST'], ['auth/register', 'POST'], ['views/start', 'POST'], ['views/complete', 'POST'], ['redeem', 'POST'], ['ads', 'POST']]) {
      const r = await call(rel, method, { body: '{khong phai json' });
      if (r.status !== 400) bad.push(`${method} /api/${rel} -> ${r.status} "${r.body?.message ?? ''}"`);
    }
    assert.deepEqual(bad, [], 'Các route sau không kiểm soát JSON lỗi:\n  ' + bad.join('\n  '));
  });
});

describe('Rò rỉ thông tin lỗi (SEC)', () => {
  beforeEach(() => seedBase());

  it('SEC-09 | lỗi CSDL không được trả nguyên văn cho client (API-01: không tiết lộ thông tin nhạy cảm)', async () => {
    injectFault(/FROM users/i, new Error("ER_NO_SUCH_TABLE: Table 'youtube_xu.users' doesn't exist"), 99);
    const r = await login('long.tv@gmail.com', '123456');
    assert.equal(r.status, 500);
    assert.doesNotMatch(r.raw, /ER_|youtube_xu|Table/i, `Phản hồi lộ chi tiết nội bộ: ${r.raw}`);
  });
});
