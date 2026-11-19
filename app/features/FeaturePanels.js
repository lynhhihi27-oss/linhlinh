import { Bell, Check, RefreshCw, Send } from 'lucide-react';
import { CATEGORY_LABELS, PERIODS, STATUS_LABELS, TABS } from './featureConfig';
import { DownloadCsv, Empty, Metric } from './featureApi';

export default function FeaturePanels({
  user,
  activeTab,
  period,
  setPeriod,
  loading,
  error,
  message,
  data,
  selectedTicket,
  setSelectedTicket,
  ticketIdSearch,
  setTicketIdSearch,
  ticketStatus,
  setTicketStatus,
  reply,
  setReply,
  perform,
  loadOlderNotifications,
  handleTicketSubmit,
  submitReply,
  updateTicketStatus,
  openTicket,
  leaderboard
}) {
  const maxDailyViews = Math.max(1, ...(data?.chart || []).map(day => Number(day.total || 0)));
  const maxXu = Math.max(1, ...(data?.chart || []).map(day => Number(day.xu_issued || 0)));

  if (loading) {
    return <div className="feature-loading" role="status">Đang tải dữ liệu...</div>;
  }

  return (
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
              {user.system_role === 'ADMIN' ? (
                <a className="btn btn-secondary btn-sm" href={`/api/admin/reports/export?period=${encodeURIComponent(period)}`}>
                  Xuất báo cáo CSV
                </a>
              ) : (
                <DownloadCsv rows={data?.chart || []} filename="youtube-xu-report.csv" />
              )}
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
                <Metric label="Ngân sách chiến dịch đang giữ" value={data?.stats.reserved_campaign_budget} tone="gold" />
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
                <Metric label="Ngân sách đã chi" value={data?.stats.campaign_spend} tone="gold" />
                <Metric label="Ngân sách đang giữ" value={data?.stats.reserved_campaign_budget} tone="gold" />
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
  );
}
