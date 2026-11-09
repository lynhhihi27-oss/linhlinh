'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, BarChart3, CalendarDays, Check, ChevronLeft, LifeBuoy, RefreshCw, Send, Sparkles, Trophy } from 'lucide-react';

const TABS = [
  { id: 'notifications', label: 'Thông báo', icon: Bell },
  { id: 'leaderboard', label: 'Xếp hạng', icon: Trophy },
  { id: 'tasks', label: 'Nhiệm vụ', icon: CalendarDays },
  { id: 'support', label: 'Hỗ trợ', icon: LifeBuoy },
  { id: 'reports', label: 'Báo cáo', icon: BarChart3 }
];
const PERIODS = [
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'all', label: 'Toàn thời gian' }
];
const CATEGORY_LABELS = {
  EARN_XU: 'Lỗi nhận Xu',
  REDEMPTION: 'Lỗi đổi quà',
  ACCOUNT: 'Lỗi tài khoản',
  AD: 'Lỗi quảng cáo',
  OTHER: 'Vấn đề khác'
};
const STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Từ chối'
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Yêu cầu không thành công.');
  return data;
}

function Metric({ label, value, tone = 'gold' }) {
  return (
    <div className={`feature-metric feature-metric-${tone}`}>
      <span>{label}</span>
      <strong>{Number(value || 0).toLocaleString('vi-VN')}</strong>
    </div>
  );
}

function Empty({ children }) {
  return <div className="feature-empty">{children}</div>;
}

function DownloadCsv({ rows, filename }) {
  const download = () => {
    if (!rows.length) return;
    const columns = Object.keys(rows[0]);
    const csv = [
      columns.join(','),
      ...rows.map(row => columns.map(column => `"${String(row[column] ?? '').replaceAll('"', '""')}"`).join(','))
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <button className="btn btn-secondary btn-sm" onClick={download} disabled={!rows.length}>Xuất CSV</button>;
}

export default function FeaturesPage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('notifications');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [data, setData] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketIdSearch, setTicketIdSearch] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [reply, setReply] = useState('');

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (TABS.some(item => item.id === tab)) setActiveTab(tab);
    api('/api/auth/me')
      .then(result => setUser(result.user))
      .catch(loadError => { setUser(null); setError(loadError.message); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user || !['notifications', 'leaderboard', 'tasks', 'support', 'reports'].includes(activeTab)) {
      setData(null);
      return undefined;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        let result;
        if (activeTab === 'notifications') {
          result = await api('/api/notifications?limit=30');
        } else if (activeTab === 'leaderboard') {
          const suffix = `?period=${period}`;
          const [leaders, mine] = await Promise.all([
            api(`/api/leaderboard${suffix}`),
            user.system_role === 'VIEWER' ? api(`/api/leaderboard/me${suffix}`) : Promise.resolve(null)
          ]);
          result = { ...leaders, me: mine?.me || null };
        } else if (activeTab === 'tasks') {
          result = await api('/api/daily-tasks');
        } else if (activeTab === 'support') {
          const params = new URLSearchParams();
          if (ticketStatus) params.set('status', ticketStatus);
          if (ticketIdSearch.trim()) params.set('id', ticketIdSearch.trim());
          result = await api(`/api/support${params.size ? `?${params}` : ''}`);
        } else {
          const suffix = `?period=${period}`;
          const path = user.system_role === 'ADMIN' ? '/api/reports/admin' : '/api/reports/advertiser';
          const [report, campaigns] = await Promise.all([
            api(`${path}${suffix}`),
            user.system_role === 'ADVERTISER' ? api(`/api/reports/campaigns${suffix}`) : Promise.resolve(null)
          ]);
          result = { ...report, campaigns: campaigns?.campaigns || [] };
        }
        if (active) setData(result);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [activeTab, period, refreshKey, ticketIdSearch, ticketStatus, user]);

  const visibleTabs = useMemo(() => TABS.filter(tab => (
    tab.id !== 'tasks' || user?.system_role === 'VIEWER'
  ) && (
    tab.id !== 'reports' || ['ADMIN', 'ADVERTISER'].includes(user?.system_role)
  )), [user]);

  const perform = async (path, method, body, successMessage) => {
    setError('');
    setMessage('');
    try {
      const result = await api(path, { method, body });
      setMessage(successMessage || result.message || 'Đã cập nhật thành công.');
      setRefreshKey(value => value + 1);
      return result;
    } catch (actionError) {
      setError(actionError.message);
      return null;
    }
  };

  const openTicket = async id => {
    setError('');
    try {
      const ticket = await api(`/api/support/${id}`);
      setSelectedTicket(ticket);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  const loadOlderNotifications = async () => {
    if (!data?.next_cursor) return;
    try {
      const older = await api(`/api/notifications?limit=30&before=${encodeURIComponent(data.next_cursor)}`);
      setData(current => ({
        ...current,
        notifications: [...current.notifications, ...older.notifications],
        has_more: older.has_more,
        next_cursor: older.next_cursor
      }));
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  const handleTicketSubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const result = await perform('/api/support', 'POST', values, 'Đã gửi yêu cầu hỗ trợ.');
    if (result) form.reset();
  };

  const submitReply = async event => {
    event.preventDefault();
    if (!selectedTicket || !reply.trim()) return;
    const result = await perform(`/api/support/${selectedTicket.ticket.TicketID}/reply`, 'POST', { message: reply });
    if (result) {
      setReply('');
      await openTicket(selectedTicket.ticket.TicketID);
    }
  };

  const updateTicketStatus = async (id, status) => {
    if (['RESOLVED', 'REJECTED'].includes(status) &&
      !window.confirm(`Xác nhận chuyển yêu cầu #${id} sang trạng thái "${STATUS_LABELS[status]}"?`)) return;
    const result = await perform(`/api/support/${id}/status`, 'PATCH', { status });
    if (result) await openTicket(id);
  };

  const leaderboard = data?.users || [];
  const maxDailyViews = Math.max(1, ...(data?.chart || []).map(day => Number(day.total || 0)));
  const maxXu = Math.max(1, ...(data?.chart || []).map(day => Number(day.xu_issued || 0)));

  return (
    <div className="features-page">
      <header className="features-header">
        <div className="container features-header-inner">
          <a className="features-back" href="/" aria-label="Trở về trang chủ"><ChevronLeft size={18} /> YouTube <b>Xu</b></a>
          <span className="features-user">{user?.full_name || 'Trung tâm tiện ích'}</span>
        </div>
      </header>
      <main className="container features-main">
        <div className="features-heading">
          <div>
            <p className="hero-eyebrow"><Sparkles size={14} /> TRUNG TÂM TIỆN ÍCH</p>
            <h1>Thông tin tài khoản & hỗ trợ</h1>
            <p>Thông báo, nhiệm vụ, xếp hạng và báo cáo theo quyền truy cập của bạn.</p>
          </div>
          {user && (
            <a className="btn btn-secondary btn-sm" href="/"><ChevronLeft size={15} /> Về trang chính</a>
          )}
        </div>

        {!loading && !user ? (
          <section className="glass-panel feature-empty feature-login">
            <h2>Cần đăng nhập để sử dụng tiện ích</h2>
            <p>Đăng nhập từ trang chính để xem thông báo, nhiệm vụ và gửi yêu cầu hỗ trợ.</p>
            {error && <div className="feature-alert error" role="alert">{error}</div>}
            <a className="btn btn-primary" href="/">Đăng nhập</a>
          </section>
        ) : user && (
          <>
            <nav className="feature-tabs" aria-label="Các chức năng">
              {visibleTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    className={`feature-tab${activeTab === tab.id ? ' active' : ''}`}
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setData(null); setMessage(''); setError(''); }}
                  >
                    <Icon size={16} /> {tab.label}
                    {tab.id === 'notifications' && data?.unread_count > 0 && <span className="feature-count">{data.unread_count}</span>}
                  </button>
                );
              })}
            </nav>
            {(error || message) && (
              <div className={`feature-alert ${error ? 'error' : 'success'}`} role={error ? 'alert' : 'status'}>
                {error || message}
              </div>
            )}
            <section className="glass-panel feature-content">
              <div className="feature-section-heading">
                <h2>{TABS.find(tab => tab.id === activeTab)?.label}</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => setRefreshKey(value => value + 1)} disabled={loading}>
                  <RefreshCw size={14} /> Làm mới
                </button>
              </div>
              {loading ? <div className="feature-loading" role="status">Đang tải dữ liệu...</div> : (
                <>
                  {activeTab === 'notifications' && (
                    <div className="feature-stack">
                      {(data?.notifications || []).length === 0 ? <Empty>Bạn chưa có thông báo nào.</Empty> : (
                        <>
                          <div className="feature-actions">
                            <span>{data.unread_count} thông báo chưa đọc</span>
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={!data.unread_count}
                              onClick={() => perform('/api/notifications/read-all', 'PATCH', {}, 'Đã đánh dấu tất cả thông báo đã đọc.')}
                            >
                              <Check size={14} /> Đánh dấu tất cả đã đọc
                            </button>
                          </div>
                          {(data.notifications || []).map(notification => (
                            <article className={`feature-notification${notification.IsRead ? '' : ' unread'}`} key={notification.NotificationID}>
                              <div><Bell size={17} /><div><strong>{notification.Title}</strong><p>{notification.Message}</p><small>{new Date(notification.CreatedAt).toLocaleString('vi-VN')}</small></div></div>
                              {!notification.IsRead && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  aria-label={`Đánh dấu đã đọc: ${notification.Title}`}
                                  onClick={() => perform(`/api/notifications/${notification.NotificationID}`, 'PATCH', {}, 'Đã đánh dấu thông báo đã đọc.')}
                                >Đã đọc</button>
                              )}
                            </article>
                          ))}
                          {data.has_more && (
                            <button className="btn btn-secondary btn-sm feature-load-more" onClick={loadOlderNotifications}>
                              Xem thêm thông báo cũ
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'leaderboard' && (
                    <div className="feature-stack">
                      <div className="feature-actions">
                        <p>Chỉ tính Xu dương từ giao dịch hợp lệ; không tính hoàn Xu hoặc Xu bị thu hồi.</p>
                        <select className="form-select" value={period} onChange={event => setPeriod(event.target.value)} aria-label="Lọc bảng xếp hạng theo thời gian">
                          {PERIODS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                      {data?.me && <div className="feature-me-rank">Thứ hạng của bạn: <strong>#{data.me.rank}</strong> · {Number(data.me.total_earned).toLocaleString('vi-VN')} Xu</div>}
                      {leaderboard.length === 0 ? <Empty>Chưa có dữ liệu xếp hạng trong khoảng thời gian này.</Empty> : (
                        <div className="feature-table-wrap"><table className="feature-table">
                          <thead><tr><th>Hạng</th><th>Người dùng</th><th>Tổng Xu kiếm được</th></tr></thead>
                          <tbody>{leaderboard.map((entry, index) => (
                            <tr key={entry.user_id}>
                              <td><span className={`rank-badge rank-${index + 1}`}>#{entry.rank}</span></td>
                              <td>{entry.full_name}</td>
                              <td className="feature-gold">{Number(entry.total_earned).toLocaleString('vi-VN')} Xu</td>
                            </tr>
                          ))}</tbody>
                        </table></div>
                      )}
                    </div>
                  )}

                  {activeTab === 'tasks' && (
                    <div className="feature-task-grid">
                      {(data?.tasks || []).length === 0 ? <Empty>Chưa có nhiệm vụ đang hoạt động.</Empty> : data.tasks.map(task => (
                        <article className="feature-task" key={task.TaskID}>
                          <div className="feature-task-top"><span className={`task-status ${task.status.toLowerCase()}`}>{task.claimed ? 'Đã nhận' : task.completed ? 'Hoàn thành' : 'Đang thực hiện'}</span><strong>+{task.RewardXu} Xu</strong></div>
                          <h3>{task.Title}</h3>
                          <p>{task.Description}</p>
                          <div className="task-progress-label"><span>Tiến độ</span><strong>{task.progress}/{task.TargetCount}</strong></div>
                          <div className="task-progress"><span style={{ width: `${Math.min(100, task.progress / task.TargetCount * 100)}%` }} /></div>
                          <button
                            className={`btn ${task.completed && !task.claimed ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            disabled={!task.completed || task.claimed}
                            onClick={() => perform(`/api/daily-tasks/${task.TaskID}/claim`, 'POST', {}, `Đã nhận ${task.RewardXu} Xu.`)}
                          >{task.claimed ? 'Đã nhận thưởng' : task.completed ? 'Nhận thưởng' : 'Chưa đủ điều kiện'}</button>
                        </article>
                      ))}
                    </div>
                  )}

                  {activeTab === 'support' && (
                    <div className="feature-support-grid">
                      {user.system_role === 'VIEWER' && (
                        <form className="feature-form" onSubmit={handleTicketSubmit}>
                          <h3>Gửi yêu cầu hỗ trợ</h3>
                          <label>Loại vấn đề<select name="category" className="form-select" required>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                          <label>Tiêu đề<input className="form-input" name="subject" minLength="3" maxLength="150" required /></label>
                          <label>Nội dung chi tiết<textarea className="form-textarea" name="description" rows="5" minLength="10" maxLength="3000" required /></label>
                          <label>Mã giao dịch (nếu có)<input className="form-input" name="transaction_code" maxLength="100" /></label>
                          <button className="btn btn-primary" type="submit"><Send size={15} /> Gửi yêu cầu</button>
                        </form>
                      )}
                      <div className="feature-stack">
                        <div className="feature-support-filters">
                          {user.system_role === 'ADMIN' && (
                            <>
                              <input className="form-input" placeholder="Mã yêu cầu" inputMode="numeric" value={ticketIdSearch} onChange={event => setTicketIdSearch(event.target.value)} />
                              <select className="form-select" value={ticketStatus} onChange={event => setTicketStatus(event.target.value)} aria-label="Lọc trạng thái">
                                <option value="">Tất cả trạng thái</option>
                                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </select>
                            </>
                          )}
                        </div>
                        {(data?.tickets || []).length === 0 ? <Empty>Không có yêu cầu hỗ trợ nào.</Empty> : (
                          <div className="feature-table-wrap"><table className="feature-table">
                            <thead><tr><th>Mã</th>{user.system_role === 'ADMIN' && <th>Người gửi</th>}<th>Tiêu đề</th><th>Trạng thái</th><th></th></tr></thead>
                            <tbody>{data.tickets.map(ticket => (
                              <tr key={ticket.TicketID}>
                                <td>#{ticket.TicketID}</td>
                                {user.system_role === 'ADMIN' && <td>{ticket.full_name}</td>}
                                <td><span className="support-category">{CATEGORY_LABELS[ticket.Category] || ticket.Category}</span><br />{ticket.Subject}</td>
                                <td>{STATUS_LABELS[ticket.Status]}</td>
                                <td><button className="btn btn-secondary btn-sm" onClick={() => openTicket(ticket.TicketID)}>Chi tiết</button></td>
                              </tr>
                            ))}</tbody>
                          </table></div>
                        )}
                        {selectedTicket && (
                          <div className="feature-ticket-detail">
                            <div className="feature-actions"><h3>Yêu cầu #{selectedTicket.ticket.TicketID}</h3><span>{STATUS_LABELS[selectedTicket.ticket.Status]}</span></div>
                            <p><strong>{selectedTicket.ticket.Subject}</strong></p><p>{selectedTicket.ticket.Description}</p>
                            {selectedTicket.ticket.TransactionCode && <p>Mã giao dịch: {selectedTicket.ticket.TransactionCode}</p>}
                            <div className="feature-replies">{selectedTicket.replies.length ? selectedTicket.replies.map(item => (
                              <article key={item.ReplyID}><strong>{item.responder_name}</strong><p>{item.Message}</p><small>{new Date(item.CreatedAt).toLocaleString('vi-VN')}</small></article>
                            )) : <Empty>Chưa có phản hồi.</Empty>}</div>
                            {user.system_role === 'ADMIN' && !['RESOLVED', 'REJECTED'].includes(selectedTicket.ticket.Status) && (
                              <form className="feature-form" onSubmit={submitReply}>
                                <label>Phản hồi<textarea className="form-textarea" rows="3" maxLength="3000" value={reply} onChange={event => setReply(event.target.value)} required /></label>
                                <div className="feature-actions">
                                  <button className="btn btn-primary btn-sm" type="submit"><Send size={14} /> Gửi phản hồi</button>
                                  <select className="form-select" value={selectedTicket.ticket.Status} onChange={event => updateTicketStatus(selectedTicket.ticket.TicketID, event.target.value)}>
                                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                  </select>
                                </div>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'reports' && (
                    <div className="feature-stack">
                      <div className="feature-actions">
                        <p>{user.system_role === 'ADMIN' ? 'Thống kê hệ thống' : 'Dữ liệu chiến dịch của bạn'}</p>
                        <div className="feature-actions">
                          <select className="form-select" value={period} onChange={event => setPeriod(event.target.value)} aria-label="Lọc báo cáo theo thời gian">
                            {PERIODS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                          <DownloadCsv rows={data?.chart || []} filename="youtube-xu-report.csv" />
                        </div>
                      </div>
                      <div className="feature-metrics-grid">
                        {user.system_role === 'ADMIN' ? (
                          <>
                            <Metric label="Tổng người dùng" value={data?.stats.total_users} tone="blue" />
                            <Metric label="Nhà quảng cáo" value={data?.stats.total_advertisers} tone="blue" />
                            <Metric label="Xu đã phát hành" value={data?.stats.xu_issued} />
                            <Metric label="Xu đã dùng (đổi quà)" value={data?.stats.xu_redeemed} tone="rose" />
                            <Metric label="Xu chiến dịch đã chi (tích lũy)" value={data?.stats.campaign_spend} tone="gold" />
                            <Metric label="Giao dịch" value={data?.stats.total_transactions} tone="blue" />
                            <Metric label="Lượt xem hợp lệ" value={data?.stats.valid_views} tone="green" />
                            <Metric label="Lượt xem không hợp lệ" value={data?.stats.invalid_views} tone="rose" />
                            <Metric label="Yêu cầu đổi quà" value={data?.stats.total_redemptions} tone="blue" />
                            <Metric label="Khiếu nại chờ xử lý" value={data?.stats.pending_tickets} tone="rose" />
                          </>
                        ) : (
                          <>
                            <Metric label="Tổng chiến dịch" value={data?.stats.total_campaigns} tone="blue" />
                            <Metric label="Đang hoạt động" value={data?.stats.active_campaigns} tone="green" />
                            <Metric label="Tổng lượt xem" value={data?.stats.total_views} tone="blue" />
                            <Metric label="Lượt xem hợp lệ" value={data?.stats.valid_views} tone="green" />
                            <Metric label="Không hợp lệ" value={data?.stats.invalid_views} tone="rose" />
                          </>
                        )}
                      </div>
                      <div className="feature-chart">
                        <h3>Thống kê theo ngày</h3>
                        {(data?.chart || []).length === 0 ? <Empty>Chưa có dữ liệu trong khoảng thời gian này.</Empty> : data.chart.map(day => {
                          const total = user.system_role === 'ADMIN' ? day.xu_issued : day.total;
                          const max = user.system_role === 'ADMIN' ? maxXu : maxDailyViews;
                          return (
                            <div className="feature-chart-row" key={day.date}>
                              <time>{day.date}</time><div className="feature-chart-track"><span style={{ width: `${Math.max(2, Number(total) / max * 100)}%` }} /></div>
                              <strong>{Number(total).toLocaleString('vi-VN')}</strong>
                            </div>
                          );
                        })}
                      </div>
                      {user.system_role === 'ADMIN' && data?.stats && (
                        <p className="feature-report-note">Xu đã phát hành chỉ tính EARN/BONUS hợp lệ, không tính hoàn Xu; lượt xem được lọc theo trạng thái trong sổ dữ liệu.</p>
                      )}
                      {user.system_role === 'ADVERTISER' && (
                        <div className="feature-table-wrap"><table className="feature-table">
                          <thead><tr><th>Chiến dịch</th><th>Trạng thái</th><th>Tổng lượt xem</th><th>Hợp lệ</th><th>Không hợp lệ</th><th>Xu đã chi</th></tr></thead>
                          <tbody>{(data?.campaigns || []).map(campaign => (
                            <tr key={campaign.ad_id}><td>{campaign.title}</td><td>{campaign.status}</td><td>{campaign.total_views}</td><td>{campaign.valid_views}</td><td>{campaign.invalid_views}</td><td>{Number(campaign.spent_xu).toLocaleString('vi-VN')}</td></tr>
                          ))}</tbody>
                        </table>{!data?.campaigns?.length && <Empty>Chưa có chiến dịch.</Empty>}</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
