'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, RefreshCw, Sparkles } from 'lucide-react';
import { api } from './featureApi';
import FeatureTabs, { FeatureHeader } from './FeatureTabs';
import FeaturePanels from './FeaturePanels';
import { TABS, STATUS_LABELS } from './featureConfig';

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
      .catch(loadError => {
        setUser(null);
        setError(loadError.message);
      })
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
      !window.confirm(`Xác nhận chuyển yêu cầu #${id} sang trạng thái "${STATUS_LABELS[status]}"?`)) {
      return;
    }

    const result = await perform(`/api/support/${id}/status`, 'PATCH', { status });
    if (result) await openTicket(id);
  };

  const leaderboard = data?.users || [];

  return (
    <>
      <FeatureHeader user={user} />
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
            <FeatureTabs
              user={user}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              data={data}
              setData={setData}
              setMessage={setMessage}
              setError={setError}
            />

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

              <FeaturePanels
                user={user}
                activeTab={activeTab}
                period={period}
                setPeriod={setPeriod}
                loading={loading}
                error={error}
                message={message}
                data={data}
                selectedTicket={selectedTicket}
                setSelectedTicket={setSelectedTicket}
                ticketIdSearch={ticketIdSearch}
                setTicketIdSearch={setTicketIdSearch}
                ticketStatus={ticketStatus}
                setTicketStatus={setTicketStatus}
                reply={reply}
                setReply={setReply}
                perform={perform}
                loadOlderNotifications={loadOlderNotifications}
                handleTicketSubmit={handleTicketSubmit}
                submitReply={submitReply}
                updateTicketStatus={updateTicketStatus}
                openTicket={openTicket}
                leaderboard={leaderboard}
              />
            </section>
          </>
        )}
      </main>
    </>
  );
}
