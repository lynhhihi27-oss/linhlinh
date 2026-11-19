import { Bell, BarChart3, CalendarDays, ChevronLeft, LifeBuoy, Trophy } from 'lucide-react';
import { TABS } from './featureConfig';

const ICONS = {
  Bell,
  Trophy,
  CalendarDays,
  LifeBuoy,
  BarChart3
};

export default function FeatureTabs({ user, activeTab, setActiveTab, data, setData, setMessage, setError }) {
  const visibleTabs = TABS.filter(tab => (
    tab.id !== 'tasks' || user?.system_role === 'VIEWER'
  ) && (
    tab.id !== 'reports' || ['ADMIN', 'ADVERTISER'].includes(user?.system_role)
  ));

  return (
    <nav className="feature-tabs" aria-label="Các chức năng">
      {visibleTabs.map(tab => {
        const Icon = ICONS[tab.icon];
        return (
          <button
            className={`feature-tab${activeTab === tab.id ? ' active' : ''}`}
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setData(null);
              setMessage('');
              setError('');
            }}
          >
            <Icon size={16} /> {tab.label}
            {tab.id === 'notifications' && data?.unread_count > 0 && <span className="feature-count">{data.unread_count}</span>}
          </button>
        );
      })}
    </nav>
  );
}

export function FeatureHeader({ user }) {
  return (
    <header className="features-header">
      <div className="container features-header-inner">
        <a className="features-back" href="/" aria-label="Trở về trang chủ"><ChevronLeft size={18} /> YouTube <b>Xu</b></a>
        <span className="features-user">{user?.full_name || 'Trung tâm tiện ích'}</span>
      </div>
    </header>
  );
}
