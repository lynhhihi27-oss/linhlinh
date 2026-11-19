export const TABS = [
  { id: 'notifications', label: 'Thông báo', icon: 'Bell' },
  { id: 'leaderboard', label: 'Xếp hạng', icon: 'Trophy' },
  { id: 'tasks', label: 'Nhiệm vụ', icon: 'CalendarDays' },
  { id: 'support', label: 'Hỗ trợ', icon: 'LifeBuoy' },
  { id: 'reports', label: 'Báo cáo', icon: 'BarChart3' }
];

export const PERIODS = [
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'all', label: 'Toàn thời gian' }
];

export const CATEGORY_LABELS = {
  EARN_XU: 'Lỗi nhận Xu',
  REDEMPTION: 'Lỗi đổi quà',
  ACCOUNT: 'Lỗi tài khoản',
  AD: 'Lỗi quảng cáo',
  OTHER: 'Vấn đề khác'
};

export const STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Từ chối'
};
