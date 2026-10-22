'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, CheckCircle2, Clock, Coins, Gift, Wallet, ShieldAlert, 
  BarChart3, PlusCircle, AlertTriangle, UserCheck, Lock, Unlock, 
  Copy, ExternalLink, RefreshCw, Filter, Sparkles, Award, ArrowUpRight, ArrowDownLeft,
  Users, Share2, Link as LinkIcon
} from 'lucide-react';

export default function YouTubeXuApp() {
  // Current active user & role
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('watch'); // 'watch' | 'rewards' | 'wallet' | 'affiliate' | 'advertiser' | 'admin'
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Data states
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [ads, setAds] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [walletData, setWalletData] = useState({ balance: 0, total_earned: 0, total_spent: 0, transactions: [] });
  const [adminStats, setAdminStats] = useState(null);
  const [adminAds, setAdminAds] = useState([]);
  const [fraudData, setFraudData] = useState({ suspicious_users: [], recent_invalid_views: [] });

  // Affiliate state
  const [affiliateData, setAffiliateData] = useState(null);
  const [isAffiliateLoading, setIsAffiliateLoading] = useState(false);

  // Watch modal state (UC-01)
  const [watchingAd, setWatchingAd] = useState(null);
  const [watchToken, setWatchToken] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isCompletedWatching, setIsCompletedWatching] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const watchTimerRef = useRef(null);

  // New Ad Campaign Form (UC-04)
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration_sec: 15,
    reward_xu: 5,
    budget_xu: 5000,
    category_id: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    target_gender: '',
    target_age_from: 18,
    target_age_to: 35,
    target_province: ''
  });

  // Login Modal (UC-G04)
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ emailOrPhone: '', password: '' });
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Register Modal (UC-03)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    birth_year: 2002,
    gender: 'MALE',
    province: 'Hà Nội'
  });

  // Rewards subtab
  const [rewardSubTab, setRewardSubTab] = useState('shop'); // 'shop' | 'my-gifts'

  // Quick Switch Preset Accounts
  const demoAccounts = [
    { id: '5', label: 'Trần Văn Long (Viewer)', role: 'VIEWER' },
    { id: '6', label: 'Lê Thị Nhi (Viewer)', role: 'VIEWER' },
    { id: '2', label: 'VNG Corp (Advertiser)', role: 'ADVERTISER' },
    { id: '1', label: 'Quản Trị (Admin)', role: 'ADMIN' },
    { id: '10', label: 'Tài Khoản Bị Khóa (Demo UC-06)', role: 'VIEWER' },
    { id: 'guest', label: 'Khách(Guest)', role: 'GUEST' }
  ];

  // Danh sách tài khoản thật từ DB (mật khẩu demo: 123456)
  const DB_ACCOUNTS = [
    { email: 'admin@youtubexu.vn',     name: 'Nguyễn Quản Trị',       role: 'ADMIN',       status: 'ACTIVE', balance: 0 },
    { email: 'adv.vng@gmail.com',      name: 'Công ty Cổ phần VNG',    role: 'ADVERTISER',  status: 'ACTIVE', balance: 50000 },
    { email: 'adv.shopee@gmail.com',   name: 'Shopee Việt Nam',        role: 'ADVERTISER',  status: 'ACTIVE', balance: 100000 },
    { email: 'adv.vinamilk@gmail.com', name: 'Vinamilk Corporation',   role: 'ADVERTISER',  status: 'ACTIVE', balance: 80000 },
    { email: 'long.tv@gmail.com',      name: 'Trần Văn Long',          role: 'VIEWER',      status: 'ACTIVE', balance: 540 },
    { email: 'nhi.lt@gmail.com',       name: 'Lê Thị Nhi',            role: 'VIEWER',      status: 'ACTIVE', balance: 500 },
    { email: 'tu.pm@gmail.com',        name: 'Phạm Minh Tú',          role: 'VIEWER',      status: 'ACTIVE', balance: 120 },
    { email: 'lam.hm@gmail.com',       name: 'Hoàng Mai Lâm',         role: 'VIEWER',      status: 'ACTIVE', balance: 2450 },
    { email: 'luong.nv@gmail.com',     name: 'Nguyễn Văn Lượng',      role: 'VIEWER',      status: 'ACTIVE', balance: 0 },
    { email: 'gianlan.bot@gmail.com',  name: 'Tài Khoản Gian Lận',    role: 'VIEWER',      status: 'LOCKED', balance: 0 },
    { email: 'bachken221@gmail.com',   name: 'Duong Viet Bach',        role: 'VIEWER',      status: 'ACTIVE', balance: 0 },
    { email: 'bachken2121@gmail.com',  name: 'Dung bach',              role: 'VIEWER',      status: 'ACTIVE', balance: 0 },
  ];

  // Helper notification toast
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Load User Data
  const loadUser = async (userId = '5') => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/auth/me?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        // Tự động chuyển tab phù hợp nếu role đặc thù
        if (data.user.system_role === 'ADMIN') setActiveTab('admin');
        else if (data.user.system_role === 'ADVERTISER') setActiveTab('advertiser');
        else if (activeTab === 'admin' || activeTab === 'advertiser') setActiveTab('watch');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Categories
  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) setCategories(data.categories);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Ads for Viewer
  const loadAds = async () => {
    if (!currentUser) return;
    try {
      const catParam = selectedCategory ? `&category=${selectedCategory}` : '';
      const res = await fetch(`/api/ads?role=VIEWER&userId=${currentUser.user_id}${catParam}`);
      const data = await res.json();
      if (data.success) setAds(data.ads);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Advertiser Ads
  const loadAdvertiserAds = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/ads?role=ADVERTISER&userId=${currentUser.user_id}`);
      const data = await res.json();
      if (data.success) setAds(data.ads);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Rewards
  const loadRewards = async () => {
    try {
      const res = await fetch('/api/rewards');
      const data = await res.json();
      if (data.success) setRewards(data.rewards);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Redemptions
  const loadRedemptions = async () => {
    if (!currentUser) return;
    try {
      const role = currentUser.system_role;
      const res = await fetch(`/api/redemptions?userId=${currentUser.user_id}&role=${role}`);
      const data = await res.json();
      if (data.success) setRedemptions(data.redemptions);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Wallet
  const loadWallet = async () => {
    if (!currentUser || currentUser.user_id === 0) return;
    try {
      const res = await fetch(`/api/wallet?userId=${currentUser.user_id}`);
      const data = await res.json();
      if (data.success) {
        setWalletData(data);
        setCurrentUser(prev => ({ ...prev, xu_balance: data.balance }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load Admin Data
  // Load Admin Data
  const loadAdminData = async () => {
    try {
      const [statsRes, adsRes, fraudRes] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/ads?role=ADMIN').then(r => r.json()),
        fetch('/api/admin/fraud').then(r => r.json())
      ]);
      if (statsRes.success) setAdminStats(statsRes.stats);
      if (adsRes.success) setAdminAds(adsRes.ads);
      if (fraudRes.success) setFraudData(fraudRes);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Affiliate Data
  const loadAffiliateData = async () => {
    if (!currentUser || currentUser.user_id === 0) return;
    try {
      setIsAffiliateLoading(true);
      const res = await fetch(`/api/affiliate?userId=${currentUser.user_id}`);
      const data = await res.json();
      if (data.success) {
        setAffiliateData(data);
      }
    } catch (err) {
      console.error('Error loading affiliate data:', err);
    } finally {
      setIsAffiliateLoading(false);
    }
  };

  useEffect(() => {
    loadUser('5');
    loadCategories();
    loadRewards();

    // Tự động nhận diện mã giới thiệu nếu truy cập qua link ?ref=...
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      if (refCode) {
        setRegisterForm(prev => ({ ...prev, referral_code: refCode }));
        setShowRegisterModal(true);
        showToast(`Đã nhận diện mã giới thiệu bạn bè: ${refCode}`, 'success');
      }
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'watch') loadAds();
    if (activeTab === 'rewards') loadRedemptions();
    if (activeTab === 'wallet') loadWallet();
    if (activeTab === 'affiliate') loadAffiliateData();
    if (activeTab === 'advertiser') loadAdvertiserAds();
    if (activeTab === 'admin') {
      loadAdminData();
      loadRedemptions();
    }
  }, [currentUser, activeTab, selectedCategory]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    };
  }, []);

  // UC-01: Bắt đầu xem quảng cáo
  const handleStartWatch = async (ad) => {
    if (currentUser.user_id === 0) {
      showToast('Vui lòng đăng nhập hoặc chọn tài khoản Người xem để nhận xu!', 'error');
      return;
    }
    if (currentUser.account_status === 'LOCKED') {
      showToast('Tài khoản của bạn đang bị khóa do vi phạm quy chế hệ thống!', 'error');
      return;
    }

    try {
      const res = await fetch('/api/views/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.user_id, ad_id: ad.ad_id })
      });
      const data = await res.json();

      if (!data.success) {
        showToast(data.message, 'error');
        return;
      }

      setWatchingAd({ ...ad, duration_sec: data.duration_sec, reward_xu: data.reward_xu });
      setWatchToken(data.view_token);
      setSecondsRemaining(data.duration_sec);
      setIsCompletedWatching(false);

      // Bắt đầu đếm ngược thời gian xem
      if (watchTimerRef.current) clearInterval(watchTimerRef.current);
      watchTimerRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(watchTimerRef.current);
            setIsCompletedWatching(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi bắt đầu xem!', 'error');
    }
  };

  // UC-01: Hoàn tất nhận xu
  const handleClaimReward = async () => {
    if (!isCompletedWatching || isClaiming) return;
    try {
      setIsClaiming(true);
      const res = await fetch('/api/views/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.user_id,
          ad_id: watchingAd.ad_id,
          view_token: watchToken,
          watched_seconds: watchingAd.duration_sec
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast(`🎉 ${data.message}`, 'success');
        setCurrentUser(prev => ({ ...prev, xu_balance: data.balance_after }));
        setWatchingAd(null);
        loadAds();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Không thể cộng xu lúc này!', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  // Đổi quà (UC-02)
  const handleRedeem = async (reward) => {
    if (currentUser.user_id === 0) {
      showToast('Vui lòng đăng nhập để đổi quà tặng!', 'error');
      return;
    }
    if (currentUser.xu_balance < reward.xu_cost) {
      showToast(`Bạn còn thiếu ${reward.xu_cost - currentUser.xu_balance} xu để đổi phần quà này!`, 'error');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn dùng ${reward.xu_cost} xu để đổi lấy "${reward.reward_name}" không?`)) {
      return;
    }

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.user_id, reward_id: reward.reward_id })
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message, 'success');
        setCurrentUser(prev => ({ ...prev, xu_balance: data.balance_after }));
        loadRewards();
        loadRedemptions();
        setRewardSubTab('my-gifts');
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi thực hiện đổi quà!', 'error');
    }
  };

  // UC-04: Tạo chiến dịch quảng cáo
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCampaign,
          advertiser_id: currentUser.user_id
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadAdvertiserAds();
        setNewCampaign({
          title: '',
          video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          duration_sec: 15,
          reward_xu: 5,
          budget_xu: 5000,
          category_id: 1,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          target_gender: '',
          target_age_from: 18,
          target_age_to: 35,
          target_province: ''
        });
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi tạo chiến dịch!', 'error');
    }
  };

  // UC-05: Admin duyệt / từ chối quảng cáo
  const handleReviewAd = async (adId, status, rejectReason = '') => {
    try {
      const res = await fetch(`/api/ads/${adId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reject_reason: rejectReason, reviewed_by: currentUser.user_id })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadAdminData();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi duyệt quảng cáo!', 'error');
    }
  };

  // UC-AD04: Admin duyệt đơn đổi quà lớn
  const handleProcessRedemption = async (redemptionId, action) => {
    try {
      const res = await fetch(`/api/redemptions/${redemptionId}/process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_id: currentUser.user_id })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadRedemptions();
        loadAdminData();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xử lý đơn!', 'error');
    }
  };

  // UC-06: Khóa / Mở khóa tài khoản nghi vấn
  const handleToggleLockUser = async (targetUserId) => {
    try {
      const res = await fetch('/api/admin/fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_LOCK', target_user_id: targetUserId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi cập nhật trạng thái tài khoản!', 'error');
    }
  };

  // UC-06: Thu hồi xu gian lận
  const handleRevokeXu = async (targetUserId, amount) => {
    const reason = prompt('Nhập lý do thu hồi xu:', 'Phát hiện chạy giả lập/tua video');
    if (!reason) return;

    try {
      const res = await fetch('/api/admin/fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REVOKE_XU',
          target_user_id: targetUserId,
          revoke_amount: amount,
          reason
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadAdminData();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi thu hồi xu!', 'error');
    }
  };

  // Đăng nhập (UC-G04)
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setIsLoginLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setShowLoginModal(false);
        setLoginForm({ emailOrPhone: '', password: '' });
        // Tự động chuyển tab phù hợp với vai trò
        if (data.user.system_role === 'ADMIN') setActiveTab('admin');
        else if (data.user.system_role === 'ADVERTISER') setActiveTab('advertiser');
        else setActiveTab('watch');
        showToast(`Chào mừng trở lại, ${data.user.full_name}! 👋`, 'success');
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối server, vui lòng thử lại!', 'error');
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Đăng xuất
  const handleLogout = () => {
    setCurrentUser({ user_id: 0, full_name: 'Khách!!', system_role: 'GUEST', account_status: 'ACTIVE', xu_balance: 0 });
    setActiveTab('watch');
    showToast('Đã đăng xuất khỏi hệ thống!', 'success');
  };

  // Đăng ký tài khoản mới (UC-03)
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đăng ký tài khoản thành công! Tự động đăng nhập...', 'success');
        setShowRegisterModal(false);
        loadUser(data.user_id);
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi đăng ký tài khoản!', 'error');
    }
  };

  // Extract YouTube ID helper
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : 'dQw4w9WgXcQ';
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          fontWeight: 600,
          fontSize: '0.92rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* HEADER / TOP NAVBAR */}
      <header style={{
        background: 'rgba(18, 18, 23, 0.85)',
        borderBottom: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px' }}>
          
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setActiveTab('watch')}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ff0033, #b30024)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(255, 0, 51, 0.4)'
            }}>
              <Play size={20} fill="#fff" color="#fff" style={{ marginLeft: '2px' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px', lineHeight: 1 }}>
                YouTube <span style={{ color: '#ff0033' }}>Xu</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Sprint 1 • 3NF Platform
              </div>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button 
              className="btn btn-sm"
              style={{
                background: activeTab === 'watch' ? 'var(--bg-surface-hover)' : 'transparent',
                color: activeTab === 'watch' ? '#fff' : 'var(--text-muted)',
                fontWeight: activeTab === 'watch' ? 700 : 500,
                border: activeTab === 'watch' ? '1px solid var(--border-subtle)' : '1px solid transparent'
              }}
              onClick={() => setActiveTab('watch')}
            >
              <Play size={16} color="#ff0033" />
              <span>Xem Kiếm Xu</span>
            </button>

            <button 
              className="btn btn-sm"
              style={{
                background: activeTab === 'rewards' ? 'var(--bg-surface-hover)' : 'transparent',
                color: activeTab === 'rewards' ? '#fff' : 'var(--text-muted)',
                fontWeight: activeTab === 'rewards' ? 700 : 500,
                border: activeTab === 'rewards' ? '1px solid var(--border-subtle)' : '1px solid transparent'
              }}
              onClick={() => setActiveTab('rewards')}
            >
              <Gift size={16} color="#f59e0b" />
              <span>Đổi Quà</span>
            </button>

            <button 
              className="btn btn-sm"
              style={{
                background: activeTab === 'wallet' ? 'var(--bg-surface-hover)' : 'transparent',
                color: activeTab === 'wallet' ? '#fff' : 'var(--text-muted)',
                fontWeight: activeTab === 'wallet' ? 700 : 500,
                border: activeTab === 'wallet' ? '1px solid var(--border-subtle)' : '1px solid transparent'
              }}
              onClick={() => setActiveTab('wallet')}
            >
              <Wallet size={16} color="#10b981" />
              <span>Ví Xu</span>
            </button>

            <button 
              className="btn btn-sm"
              style={{
                background: activeTab === 'affiliate' ? 'var(--bg-surface-hover)' : 'transparent',
                color: activeTab === 'affiliate' ? '#fff' : 'var(--text-muted)',
                fontWeight: activeTab === 'affiliate' ? 700 : 500,
                border: activeTab === 'affiliate' ? '1px solid var(--border-subtle)' : '1px solid transparent'
              }}
              onClick={() => setActiveTab('affiliate')}
            >
              <Users size={16} color="#a855f7" />
              <span>Giới Thiệu</span>
              <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', fontWeight: 700 }}>+Hoa hồng</span>
            </button>

            {/* Tab dành cho Advertiser */}
            {(currentUser?.system_role === 'ADVERTISER' || currentUser?.system_role === 'ADMIN') && (
              <button 
                className="btn btn-sm"
                style={{
                  background: activeTab === 'advertiser' ? 'var(--bg-surface-hover)' : 'transparent',
                  color: activeTab === 'advertiser' ? '#fff' : 'var(--text-muted)',
                  fontWeight: activeTab === 'advertiser' ? 700 : 500,
                  border: activeTab === 'advertiser' ? '1px solid var(--border-subtle)' : '1px solid transparent'
                }}
                onClick={() => setActiveTab('advertiser')}
              >
                <PlusCircle size={16} color="#3b82f6" />
                <span>Nhà Quảng Cáo</span>
              </button>
            )}

            {/* Tab dành cho Admin */}
            {currentUser?.system_role === 'ADMIN' && (
              <button 
                className="btn btn-sm"
                style={{
                  background: activeTab === 'admin' ? 'rgba(255, 0, 51, 0.15)' : 'transparent',
                  color: activeTab === 'admin' ? '#ff4d6d' : 'var(--text-muted)',
                  fontWeight: activeTab === 'admin' ? 700 : 500,
                  border: activeTab === 'admin' ? '1px solid rgba(255, 0, 51, 0.3)' : '1px solid transparent'
                }}
                onClick={() => setActiveTab('admin')}
              >
                <ShieldAlert size={16} color="#ff0033" />
                <span>Quản Trị Admin</span>
              </button>
            )}
          </nav>

          {/* Right Action: Demo Role Switcher & User Balance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            
            {/* Quick Demo Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}> Nhanh:</span>
              <select 
                className="form-select"
                style={{ padding: '6px 10px', fontSize: '0.8rem', width: 'auto' }}
                value={currentUser?.user_id === 0 ? 'guest' : (currentUser?.user_id?.toString() || '5')}
                onChange={(e) => loadUser(e.target.value)}
              >
                {demoAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.label}</option>
                ))}
              </select>
            </div>

            {/* Balance Pill + Đăng xuất (khi đã đăng nhập) */}
            {currentUser && currentUser.user_id !== 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveTab('wallet')}
                  title="Bấm để xem lịch sử ví xu"
                >
                  <Coins size={18} color="#f59e0b" />
                  <span style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>
                    {currentUser.xu_balance?.toLocaleString()} <span style={{ fontSize: '0.75rem' }}>XU</span>
                  </span>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleLogout}
                  title="Đăng xuất khỏi hệ thống"
                  style={{ color: 'var(--text-muted)', padding: '6px 12px' }}
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowLoginModal(true)}>
                  Đăng nhập
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowRegisterModal(true)}>
                  Đăng ký
                </button>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* SUB-BANNER / HERO */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(255, 0, 51, 0.06) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '24px 0'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Chào mừng</span>
              <span style={{ color: '#fff' }}>{currentUser?.full_name || 'Quý khách'}</span>
              <span className={`badge ${currentUser?.account_status === 'LOCKED' ? 'badge-red' : 'badge-green'}`}>
                {currentUser?.account_status === 'LOCKED' ? 'Tài khoản bị khóa' : (currentUser?.system_role || 'GUEST')}
              </span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
              {activeTab === 'watch' && 'Xem trọn vẹn video quảng cáo để nhận xu tức thì vào ví. Mỗi quảng cáo nhận 1 lần/ngày.'}
              {activeTab === 'rewards' && 'Đổi số xu tích lũy lấy thẻ nạp điện thoại (Viettel, Vina, Mobi) hoặc voucher MoMo, Grab, Shopee.'}
              {activeTab === 'wallet' && 'Sổ cái kiểm toán biến động xu chuẩn 3NF: EARN, REDEEM, REFUND, BONUS, ADJUST.'}
              {activeTab === 'advertiser' && 'Khởi tạo chiến dịch video YouTube, thiết lập ngân sách và bộ lọc khách hàng mục tiêu.'}
              {activeTab === 'admin' && 'Bảng điều khiển quản trị: Kiểm duyệt quảng cáo, duyệt đơn đổi thưởng > 50k, chống gian lận.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>TỶ LỆ QUY ĐỔI</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>1.000 Xu = 10.000đ</div>
            </div>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>HẠN MỨC NGÀY</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>50 lượt / 500 Xu</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="container" style={{ flex: 1, padding: '32px 20px' }}>

        {/* ========================================================
            TAB 1: XEM QUẢNG CÁO NHẬN XU (UC-01 & UC-V01)
        ======================================================== */}
        {activeTab === 'watch' && (
          <div>
            {/* Filter by Category */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button
                  className="btn btn-sm"
                  style={{
                    background: selectedCategory === '' ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                    color: selectedCategory === '' ? '#fff' : 'var(--text-muted)'
                  }}
                  onClick={() => setSelectedCategory('')}
                >
                  Tất cả danh mục
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.category_id}
                    className="btn btn-sm"
                    style={{
                      background: selectedCategory === cat.category_id.toString() ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                      color: selectedCategory === cat.category_id.toString() ? '#fff' : 'var(--text-muted)'
                    }}
                    onClick={() => setSelectedCategory(cat.category_id.toString())}
                  >
                    {cat.category_name}
                  </button>
                ))}
              </div>

              <button className="btn btn-secondary btn-sm" onClick={loadAds}>
                <RefreshCw size={14} /> Làm mới
              </button>
            </div>

            {/* Ads Grid */}
            {ads.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Coins size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Không có quảng cáo nào phù hợp lúc này</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
                  Vui lòng chọn danh mục khác hoặc quay lại sau khi nhà quảng cáo cập nhật chiến dịch!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '22px' }}>
                {ads.map(ad => (
                  <div key={ad.ad_id} className="glass-panel" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    position: 'relative'
                  }}>
                    {/* Video Thumbnail Header */}
                    <div style={{
                      position: 'relative',
                      height: '170px',
                      background: '#15151e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img 
                        src={`https://img.youtube.com/vi/${(ad.video_url.match(/(?:v=|\/)([\w-]{11})/) || [])[1] || 'dQw4w9WgXcQ'}/hqdefault.jpg`}
                        alt={ad.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(18, 18, 23, 0.95) 100%)'
                      }} />
                      
                      {/* Play overlay button */}
                      <div style={{
                        position: 'absolute',
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(255, 0, 51, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(255, 0, 51, 0.5)'
                      }}>
                        <Play size={22} fill="#fff" color="#fff" style={{ marginLeft: '2px' }} />
                      </div>

                      {/* Top Badges */}
                      <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                        <span className="badge badge-blue">{ad.category_name}</span>
                      </div>
                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        <span className="badge badge-gold">
                          <Coins size={13} /> +{ad.reward_xu} XU
                        </span>
                      </div>
                    </div>

                    {/* Ad Details */}
                    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', lineHeight: 1.4 }}>
                        {ad.title}
                      </h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={14} color="#94a3b8" /> {ad.duration_sec} giây
                        </span>
                        <span>•</span>
                        <span>Nhà QC: <strong>{ad.advertiser_name || 'VNG / Shopee'}</strong></span>
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                          Ngân sách: {ad.spent_xu}/{ad.budget_xu} xu
                        </div>

                        {ad.viewed_today > 0 ? (
                          <button className="btn btn-secondary btn-sm" disabled style={{ opacity: 0.6 }}>
                            <CheckCircle2 size={14} color="#10b981" /> Đã nhận xu hôm nay
                          </button>
                        ) : (
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleStartWatch(ad)}
                            disabled={currentUser?.account_status === 'LOCKED'}
                          >
                            <Play size={14} /> Xem ngay (+{ad.reward_xu} Xu)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: ĐỔI QUÀ TẶNG & QUÀ CỦA TÔI (UC-02 & UC-V05)
        ======================================================== */}
        {activeTab === 'rewards' && (
          <div>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <button 
                className="btn btn-sm"
                style={{
                  background: rewardSubTab === 'shop' ? 'var(--gold-bg)' : 'transparent',
                  color: rewardSubTab === 'shop' ? '#fcd34d' : 'var(--text-muted)',
                  border: rewardSubTab === 'shop' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                  fontWeight: 700
                }}
                onClick={() => setRewardSubTab('shop')}
              >
                <Gift size={16} /> Gian Hàng Đổi Quà ({rewards.length})
              </button>

              <button 
                className="btn btn-sm"
                style={{
                  background: rewardSubTab === 'my-gifts' ? 'var(--blue-bg)' : 'transparent',
                  color: rewardSubTab === 'my-gifts' ? '#60a5fa' : 'var(--text-muted)',
                  border: rewardSubTab === 'my-gifts' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  fontWeight: 700
                }}
                onClick={() => setRewardSubTab('my-gifts')}
              >
                <Award size={16} /> Quà Của Tôi ({redemptions.length})
              </button>
            </div>

            {/* Subtab 1: Gian hàng quà tặng */}
            {rewardSubTab === 'shop' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {rewards.map(item => (
                  <div key={item.reward_id} className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span className={`badge ${item.reward_type === 'PHONE_CARD' ? 'badge-blue' : 'badge-gold'}`}>
                        {item.reward_type === 'PHONE_CARD' ? 'Thẻ cào điện thoại' : 'E-Voucher'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: item.stock_qty > 0 ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
                        {item.stock_qty > 0 ? `Còn ${item.stock_qty} mã` : 'Tạm hết'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>{item.reward_name}</h3>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Coins size={22} /> {item.xu_cost?.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>XU</span>
                    </div>

                    <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                      {item.face_value_vnd <= 50000 
                        ? '⚡ Duyệt tự động & nhận mã tức thì.' 
                        : '🛡️ Trị giá > 50k: Admin duyệt trong 24h.'}
                    </div>

                    <button 
                      className="btn btn-gold" 
                      style={{ marginTop: 'auto', width: '100%' }}
                      onClick={() => handleRedeem(item)}
                      disabled={item.stock_qty <= 0 || (currentUser?.xu_balance || 0) < item.xu_cost}
                    >
                      <Gift size={16} /> Đổi ngay
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Subtab 2: Quà của tôi */}
            {rewardSubTab === 'my-gifts' && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Lịch sử đổi quà của bạn</h3>
                {redemptions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
                    Bạn chưa đổi phần quà nào. Hãy tích lũy xu để đổi thưởng nhé!
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '12px 14px' }}>Mã đơn</th>
                          <th style={{ padding: '12px 14px' }}>Phần quà</th>
                          <th style={{ padding: '12px 14px' }}>Số xu đã đổi</th>
                          <th style={{ padding: '12px 14px' }}>Mã nhận thưởng (Gift Code)</th>
                          <th style={{ padding: '12px 14px' }}>Thời gian</th>
                          <th style={{ padding: '12px 14px' }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {redemptions.map(r => (
                          <tr key={r.redemption_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <td style={{ padding: '14px', fontWeight: 700 }}>#{r.redemption_id}</td>
                            <td style={{ padding: '14px', fontWeight: 600 }}>{r.reward_name}</td>
                            <td style={{ padding: '14px', color: '#f59e0b', fontWeight: 700 }}>-{r.xu_spent} xu</td>
                            <td style={{ padding: '14px' }}>
                              {r.gift_code ? (
                                <span style={{
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontFamily: 'monospace'
                                }}>
                                  {r.gift_code}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Chờ duyệt cấp mã</span>
                              )}
                            </td>
                            <td style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                              {new Date(r.requested_at).toLocaleString('vi-VN')}
                            </td>
                            <td style={{ padding: '14px' }}>
                              <span className={`badge ${
                                r.status === 'APPROVED' || r.status === 'DELIVERED' ? 'badge-green' :
                                r.status === 'PENDING' ? 'badge-gold' : 'badge-red'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: VÍ XU & SỔ CÁI BIẾN ĐỘNG (UC-V03)
        ======================================================== */}
        {activeTab === 'wallet' && (
          <div>
            {/* Wallet Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.02))' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Coins size={18} color="#f59e0b" /> SỐ DƯ HIỆN TẠI
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fbbf24', marginTop: '10px' }}>
                  {walletData.balance?.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>XU</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  Tương đương: <strong>{(walletData.balance * 10).toLocaleString()} VNĐ</strong>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowDownLeft size={18} color="#10b981" /> TỔNG XU KIẾM ĐƯỢC
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginTop: '10px' }}>
                  +{walletData.total_earned?.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>XU</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '4px' }}>Từ xem video và thưởng giới thiệu</div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowUpRight size={18} color="#f43f5e" /> TỔNG XU ĐÃ DÙNG
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fb7185', marginTop: '10px' }}>
                  -{walletData.total_spent?.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>XU</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '4px' }}>Đổi thẻ cào & voucher quà tặng</div>
              </div>
            </div>

            {/* Sổ Cái Xu (Transaction Ledger) */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Sổ Cái Biến Động Xu (xu_transactions)</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Bảng kê chi tiết kiểm toán mọi giao dịch xu chuẩn 3NF, đối soát với số dư tức thời.
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={loadWallet}>
                  <RefreshCw size={14} /> Tải lại sổ cái
                </button>
              </div>

              {walletData.transactions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>Chưa có giao dịch nào được ghi nhận.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px' }}>Mã GD</th>
                        <th style={{ padding: '12px' }}>Thời gian</th>
                        <th style={{ padding: '12px' }}>Loại giao dịch</th>
                        <th style={{ padding: '12px' }}>Biến động</th>
                        <th style={{ padding: '12px' }}>Số dư sau GD</th>
                        <th style={{ padding: '12px' }}>Ghi chú / Đối soát</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walletData.transactions.map(t => (
                        <tr key={t.txn_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '12px', fontWeight: 700 }}>#{t.txn_id}</td>
                          <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                            {new Date(t.created_at).toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge ${
                              t.txn_type === 'EARN' || t.txn_type === 'BONUS' ? 'badge-green' :
                              t.txn_type === 'REDEEM' ? 'badge-gold' :
                              t.txn_type === 'REFUND' ? 'badge-blue' : 'badge-red'
                            }`}>
                              {t.txn_type}
                            </span>
                          </td>
                          <td style={{
                            padding: '12px',
                            fontWeight: 700,
                            color: t.amount > 0 ? '#34d399' : '#fb7185'
                          }}>
                            {t.amount > 0 ? `+${t.amount}` : t.amount} xu
                          </td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#fcd34d' }}>
                            {t.balance_after?.toLocaleString()} xu
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                            {t.note || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: AFFILIATE (GIỚI THIỆU BẠN BÈ & HOA HỒNG TÍCH LŨY)
        ======================================================== */}
        {activeTab === 'affiliate' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            
            {/* Banner Hero Giới Thiệu */}
            <div className="glass-panel" style={{
              padding: '30px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1))',
              borderColor: 'rgba(139, 92, 246, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', zIndex: 2, maxWidth: '900px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(139, 92, 246, 0.25)', color: '#c084fc', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '12px' }}>
                  <Sparkles size={14} /> CHƯƠNG TRÌNH AFFILIATE YOUTUBE XU
                </div>
                <h2 style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '10px' }}>
                  Giới Thiệu Bạn Bè — <span style={{ background: 'linear-gradient(90deg, #c084fc, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Hưởng Hoa Hồng Kép Trọn Đời</span>
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '22px' }}>
                  Mời bạn bè cùng xem video kiếm xu trên YouTube Xu để cùng tích lũy và hưởng chính sách hoa hồng tự động: <br />
                  ✨ <strong>20% Xu thưởng</strong> mỗi khi bạn bè xem video hoàn tất (Ví dụ: Bạn bè nhận 10 xu → Bạn nhận ngay +2 xu).<br />
                  🎁 <strong>5% Giá trị quà</strong> mỗi khi bạn bè thực hiện đổi thẻ cào/voucher (Ví dụ: Bạn bè đổi thẻ 1.000 xu → Bạn nhận ngay +50 xu).
                </p>

                {/* Box Mã & Link Giới Thiệu */}
                {currentUser?.user_id !== 0 ? (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '14px',
                    background: 'rgba(10, 10, 15, 0.65)',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>Mã Giới Thiệu:</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fcd34d', letterSpacing: '1px', background: 'rgba(245, 158, 11, 0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px dashed #f59e0b' }}>
                        {affiliateData?.referral_code || ('YX' + String(currentUser?.user_id).padStart(8, '0'))}
                      </span>
                      <button 
                        type="button"
                        className="btn btn-sm btn-secondary" 
                        onClick={() => {
                          const code = affiliateData?.referral_code || ('YX' + String(currentUser?.user_id).padStart(8, '0'));
                          navigator.clipboard.writeText(code);
                          showToast(`Đã sao chép mã giới thiệu: ${code}`, 'success');
                        }}
                      >
                        <Copy size={14} /> Sao Chép
                      </button>
                    </div>

                    <div style={{ width: '1px', height: '28px', background: 'var(--border-subtle)' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
                      <input 
                        readOnly 
                        className="form-input" 
                        style={{ fontSize: '0.85rem', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: '#c084fc' }}
                        value={typeof window !== 'undefined' ? `${window.location.origin}/?ref=${affiliateData?.referral_code || ('YX' + String(currentUser?.user_id).padStart(8, '0'))}` : ''}
                      />
                      <button 
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          const link = `${window.location.origin}/?ref=${affiliateData?.referral_code || ('YX' + String(currentUser?.user_id).padStart(8, '0'))}`;
                          navigator.clipboard.writeText(link);
                          showToast('Đã sao chép link mời bạn bè!', 'success');
                        }}
                      >
                        <Share2 size={14} /> Sao Chép Link
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px 18px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontSize: '0.9rem' }}>
                    Vui lòng đăng nhập hoặc chọn tài khoản Người xem để lấy mã giới thiệu và theo dõi hoa hồng của bạn.
                  </div>
                )}
              </div>
            </div>

            {/* 4 Thẻ Chỉ Số KPI Hoa Hồng */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Bạn Bè Đã Mời</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} color="#3b82f6" />
                  </div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                  {affiliateData?.stats?.total_friends || 0} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 500 }}>người</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '4px' }}>Mạng lưới cấp dưới trực tiếp</div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Hoa Hồng Tích Lũy</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins size={18} color="#f59e0b" />
                  </div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fcd34d' }}>
                  +{Number(affiliateData?.stats?.total_commission || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 500 }}>xu</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>Đã cộng vào số dư ví của bạn</div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hoa Hồng Xem Video (20%)</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={18} color="#10b981" />
                  </div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399' }}>
                  +{Number(affiliateData?.stats?.commission_from_views || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 500 }}>xu</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Tự động cộng sau mỗi lượt xem</div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hoa Hồng Đổi Quà (5%)</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Gift size={18} color="#ec4899" />
                  </div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f472b6' }}>
                  +{Number(affiliateData?.stats?.commission_from_redemptions || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 500 }}>xu</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Thưởng thêm khi bạn bè đổi quà</div>
              </div>
            </div>

            {/* Bảng Danh Sách Bạn Bè & Lịch Sử Hoa Hồng */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px', alignItems: 'start' }}>
              
              {/* Cột 1: Danh sách bạn bè đã mời */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} color="#a855f7" /> Bạn Bè Đã Giới Thiệu ({affiliateData?.friends?.length || 0})
                  </h3>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={loadAffiliateData}>
                    <RefreshCw size={13} /> Làm Mới
                  </button>
                </div>

                {!affiliateData?.friends || affiliateData.friends.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <Users size={40} color="var(--text-dim)" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <p style={{ fontWeight: 600, marginBottom: '6px' }}>Bạn chưa có bạn bè nào tham gia qua mã mời.</p>
                    <p style={{ fontSize: '0.82rem' }}>Hãy chia sẻ mã hoặc link ở trên cho bạn bè để bắt đầu nhận hoa hồng nhé!</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <th style={{ padding: '10px 8px' }}>Họ và Tên</th>
                          <th style={{ padding: '10px 8px' }}>Ngày tham gia</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center' }}>Đã xem</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center' }}>Đổi quà</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right' }}>Hoa hồng đem lại</th>
                        </tr>
                      </thead>
                      <tbody>
                        {affiliateData.friends.map(f => (
                          <tr key={f.user_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <td style={{ padding: '12px 8px' }}>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{f.full_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{f.phone || f.email}</div>
                            </td>
                            <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {new Date(f.created_at).toLocaleDateString('vi-VN')}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                              <span className="badge badge-blue">{f.total_views} video</span>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                              <span className="badge badge-gold">{f.total_redemptions} quà</span>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                              +{Number(f.commission_earned || 0).toLocaleString()} xu
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Cột 2: Lịch sử nhận hoa hồng chi tiết */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="#f59e0b" /> Nhật Ký Hoa Hồng Thời Gian Thực
                  </h3>
                  <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>Tự động qua Sổ cái</span>
                </div>

                {!affiliateData?.history || affiliateData.history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <Coins size={40} color="var(--text-dim)" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <p style={{ fontWeight: 600, marginBottom: '6px' }}>Chưa có biến động hoa hồng.</p>
                    <p style={{ fontSize: '0.82rem' }}>Khi bạn bè xem video hoặc đổi quà, số xu hoa hồng sẽ hiện ngay tại đây!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto' }}>
                    {affiliateData.history.map(item => (
                      <div key={item.txn_id} style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.86rem', color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.4 }}>
                            {item.note}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                            {new Date(item.created_at).toLocaleString('vi-VN')} • Số dư sau: {item.balance_after?.toLocaleString()} xu
                          </div>
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399', whiteSpace: 'nowrap' }}>
                          +{item.amount} xu
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ========================================================
            TAB 4: NHÀ QUẢNG CÁO (UC-04: TẠO VÀ QUẢN LÝ CHIẾN DỊCH)
        ======================================================== */}
        {activeTab === 'advertiser' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px', alignItems: 'start' }}>
            
            {/* Form Tạo Chiến Dịch Mới */}
            <div className="glass-panel" style={{ padding: '26px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} color="#3b82f6" /> Tạo Chiến Dịch Quảng Cáo
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Theo Use Case UC-04: Khởi tạo quảng cáo, ngân sách xu và phân nhóm đối tượng mục tiêu.
              </p>

              <form onSubmit={handleCreateCampaign}>
                <div className="form-group">
                  <label className="form-label">Tiêu đề chiến dịch quảng cáo *</label>
                  <input 
                    className="form-input" 
                    placeholder="VD: Ra mắt ứng dụng học Tiếng Anh mới"
                    value={newCampaign.title}
                    onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Link Video YouTube *</label>
                  <input 
                    className="form-input" 
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={newCampaign.video_url}
                    onChange={(e) => setNewCampaign({ ...newCampaign, video_url: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Danh mục *</label>
                    <select 
                      className="form-select"
                      value={newCampaign.category_id}
                      onChange={(e) => setNewCampaign({ ...newCampaign, category_id: parseInt(e.target.value) })}
                    >
                      {categories.map(c => (
                        <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Thời lượng video (5-60 giây) *</label>
                    <input 
                      type="number"
                      className="form-input" 
                      min="5" 
                      max="60"
                      value={newCampaign.duration_sec}
                      onChange={(e) => {
                        const d = parseInt(e.target.value || 5);
                        let r = 5;
                        if (d > 30) r = 20;
                        else if (d > 15) r = 10;
                        setNewCampaign({ ...newCampaign, duration_sec: d, reward_xu: r });
                      }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Xu thưởng mỗi lượt xem</label>
                    <input 
                      type="number"
                      className="form-input" 
                      value={newCampaign.reward_xu}
                      readOnly
                      style={{ opacity: 0.8, background: 'rgba(255,255,255,0.03)' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Tự tính theo khung thời lượng</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tổng ngân sách chiến dịch (Xu) *</label>
                    <input 
                      type="number"
                      className="form-input" 
                      min="100"
                      step="500"
                      value={newCampaign.budget_xu}
                      onChange={(e) => setNewCampaign({ ...newCampaign, budget_xu: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                {/* Targeting Section */}
                <div style={{ marginTop: '12px', padding: '16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px', color: '#60a5fa' }}>
                    🎯 Cấu hình đối tượng mục tiêu (ad_targeting)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label">Giới tính</label>
                      <select 
                        className="form-select"
                        value={newCampaign.target_gender}
                        onChange={(e) => setNewCampaign({ ...newCampaign, target_gender: e.target.value })}
                      >
                        <option value="">Tất cả</option>
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Tỉnh / Thành phố</label>
                      <input 
                        className="form-input"
                        placeholder="VD: Hà Nội, TP.HCM hoặc để trống"
                        value={newCampaign.target_province}
                        onChange={(e) => setNewCampaign({ ...newCampaign, target_province: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
                  Gửi Phê Duyệt Chiến Dịch (PENDING)
                </button>
              </form>
            </div>

            {/* Danh Sách Chiến Dịch Của Tôi */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Chiến Dịch Đã Tạo</h3>
                <button className="btn btn-secondary btn-sm" onClick={loadAdvertiserAds}>
                  <RefreshCw size={14} /> Làm mới
                </button>
              </div>

              {ads.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Bạn chưa có chiến dịch quảng cáo nào.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {ads.map(item => (
                    <div key={item.ad_id} style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className="badge badge-blue">{item.category_name}</span>
                        <span className={`badge ${
                          item.status === 'ACTIVE' ? 'badge-green' :
                          item.status === 'PENDING' ? 'badge-gold' :
                          item.status === 'ENDED' ? 'badge-blue' : 'badge-red'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>{item.title}</h4>
                      
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '16px', marginBottom: '12px' }}>
                        <span>Thời lượng: <strong>{item.duration_sec}s</strong></span>
                        <span>Xu/lượt: <strong>+{item.reward_xu} xu</strong></span>
                        <span>Đã chi: <strong>{item.spent_xu}/{item.budget_xu} xu</strong></span>
                      </div>

                      {/* Progress bar ngân sách */}
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, (item.spent_xu / item.budget_xu) * 100)}%`,
                          background: item.spent_xu >= item.budget_xu ? '#f43f5e' : '#10b981'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 5: QUẢN TRỊ VIÊN ADMIN (UC-05, UC-06, UC-AD04)
        ======================================================== */}
        {activeTab === 'admin' && (
          <div>
            {/* Admin Stats Overview */}
            {adminStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>TỔNG NGƯỜI DÙNG</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>{adminStats.users?.total_users}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{adminStats.users?.total_viewers} Người xem • {adminStats.users?.total_advertisers} Nhà QC</div>
                </div>

                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>CHIẾN DỊCH QUẢNG CÁO</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', marginTop: '6px' }}>{adminStats.ads?.total_ads}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{adminStats.ads?.active_ads} Active • {adminStats.ads?.pending_ads} Chờ duyệt</div>
                </div>

                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>TỔNG LƯỢT XEM VIDEO</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>{adminStats.views?.total_views}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{adminStats.views?.completed_views} Hoàn tất • {adminStats.views?.invalid_views} Nghi vấn</div>
                </div>

                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>XU LƯU HÀNH & ĐÃ ĐỔI</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fcd34d', marginTop: '6px' }}>{adminStats.users?.total_circulating_xu?.toLocaleString()}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Đã đổi: {adminStats.redemptions?.total_redeemed_xu?.toLocaleString()} xu</div>
                </div>
              </div>
            )}

            {/* Admin Grid: 2 Cột */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px' }}>
              
              {/* Cột 1: Phê Duyệt Quảng Cáo (UC-05) */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="#10b981" /> Phê Duyệt Quảng Cáo (UC-05)
                </h3>
                
                {adminAds.filter(a => a.status === 'PENDING').length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>Không có quảng cáo nào đang chờ duyệt.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {adminAds.filter(a => a.status === 'PENDING').map(ad => (
                      <div key={ad.ad_id} style={{
                        background: 'var(--bg-surface-elevated)',
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span className="badge badge-gold">CHỜ DUYỆT</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>#{ad.ad_id}</span>
                        </div>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '4px' }}>{ad.title}</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                          Nhà QC: <strong>{ad.advertiser_name}</strong> • {ad.duration_sec}s • Ngân sách: {ad.budget_xu} xu
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleReviewAd(ad.ad_id, 'ACTIVE')}>
                            ✓ Phê duyệt (ACTIVE)
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => {
                            const reason = prompt('Nhập lý do từ chối:', 'Nội dung không phù hợp quy định');
                            if (reason) handleReviewAd(ad.ad_id, 'REJECTED', reason);
                          }}>
                            ✕ Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cột 2: Duyệt Đơn Đổi Quà > 50k (UC-AD04) */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={18} color="#f59e0b" /> Duyệt Đơn Đổi Thưởng &gt; 50k (UC-AD04)
                </h3>

                {redemptions.filter(r => r.status === 'PENDING').length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>Không có đơn đổi thưởng nào đang chờ duyệt.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {redemptions.filter(r => r.status === 'PENDING').map(r => (
                      <div key={r.redemption_id} style={{
                        background: 'var(--bg-surface-elevated)',
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span className="badge badge-gold">PENDING DUYỆT</span>
                          <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>{r.xu_spent} xu</span>
                        </div>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '4px' }}>{r.reward_name}</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                          Người đổi: <strong>{r.full_name}</strong> ({r.email})
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleProcessRedemption(r.redemption_id, 'APPROVE')}>
                            ✓ Cấp mã quà (APPROVED)
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleProcessRedemption(r.redemption_id, 'REJECT')}>
                            ✕ Từ chối & Hoàn xu
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Giám Sát Chống Gian Lận (UC-06) */}
            <div className="glass-panel" style={{ padding: '24px', marginTop: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={20} color="#ff0033" /> Phát Hiện Gian Lận & Xử Lý Tài Khoản (UC-06)
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Cảnh báo tài khoản có lượt xem INVALID, bot tự động hoặc tua video để thu hồi xu (ADJUST) và khóa tài khoản.
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={loadAdminData}>
                  <RefreshCw size={14} /> Tải lại
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px' }}>User ID</th>
                      <th style={{ padding: '12px' }}>Họ tên & Email</th>
                      <th style={{ padding: '12px' }}>Số dư ví</th>
                      <th style={{ padding: '12px' }}>Lượt xem Invalid</th>
                      <th style={{ padding: '12px' }}>Trạng thái</th>
                      <th style={{ padding: '12px' }}>Hành động xử lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fraudData.suspicious_users?.map(u => (
                      <tr key={u.user_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '12px', fontWeight: 700 }}>#{u.user_id}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 700, color: '#f59e0b' }}>{u.xu_balance} xu</td>
                        <td style={{ padding: '12px', color: u.invalid_views > 0 ? '#f43f5e' : 'var(--text-dim)', fontWeight: 700 }}>
                          {u.invalid_views} lượt nghi vấn
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge ${u.account_status === 'LOCKED' ? 'badge-red' : 'badge-green'}`}>
                            {u.account_status}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className={`btn btn-sm ${u.account_status === 'LOCKED' ? 'btn-secondary' : 'btn-primary'}`}
                              onClick={() => handleToggleLockUser(u.user_id)}
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            >
                              {u.account_status === 'LOCKED' ? <Unlock size={13} /> : <Lock size={13} />}
                              {u.account_status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
                            </button>

                            {u.xu_balance > 0 && (
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleRevokeXu(u.user_id, u.xu_balance)}
                                style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#fb7185' }}
                              >
                                Thu hồi xu
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ========================================================
          MODAL XEM VIDEO NHẬN XU (UC-01 PLAYER)
      ======================================================== */}
      {watchingAd && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '780px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-gold">
                  <Coins size={14} /> +{watchingAd.reward_xu} XU
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{watchingAd.title}</h3>
              </div>
              <button 
                onClick={() => {
                  if (confirm('Nếu thoát giữa chừng, bạn sẽ KHÔNG nhận được xu thưởng. Bạn có chắc muốn đóng?')) {
                    if (watchTimerRef.current) clearInterval(watchTimerRef.current);
                    setWatchingAd(null);
                  }
                }}
                style={{ color: 'var(--text-dim)', fontSize: '1.2rem', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Video Iframe Embed */}
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
              <iframe
                src={getYouTubeEmbedUrl(watchingAd.video_url)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  pointerEvents: 'none' // Chặn tua video
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>

            {/* Interactive Countdown & Claim Bar */}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {isCompletedWatching ? '🎉 Đã xem đủ thời lượng yêu cầu!' : `Đang xem: Còn lại ${secondsRemaining} giây`}
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b' }}>
                  Phần thưởng: +{watchingAd.reward_xu} Xu
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '18px' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, ((watchingAd.duration_sec - secondsRemaining) / watchingAd.duration_sec) * 100)}%`,
                  background: isCompletedWatching ? '#10b981' : 'linear-gradient(90deg, #ff0033, #f59e0b)',
                  transition: 'width 1s linear'
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  * Không chuyển tab hoặc đóng trình duyệt để hệ thống xác thực heartbeat.
                </span>

                <button 
                  className={`btn ${isCompletedWatching ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '180px' }}
                  onClick={handleClaimReward}
                  disabled={!isCompletedWatching || isClaiming}
                >
                  {isClaiming ? 'Đang cộng xu...' : (isCompletedWatching ? `Nhận ngay +${watchingAd.reward_xu} Xu` : `Chờ (${secondsRemaining}s)`)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL ĐĂNG NHẬP (UC-G04)
      ======================================================== */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLoginModal(false); }}>
          <div className="modal-box" style={{ maxWidth: '460px' }}>
            {/* Header modal */}
            <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #ff0033, #b30024)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(255, 0, 51, 0.4)',
                margin: '0 auto 14px'
              }}>
                <Play size={24} fill="#fff" color="#fff" style={{ marginLeft: '2px' }} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '6px' }}>Đăng nhập YouTube Xu</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                Xem quảng cáo, tích xu và đổi thưởng hấp dẫn mỗi ngày!
              </p>
            </div>

            {/* Danh sách tài khoản DB - Click để đăng nhập nhanh */}
            <div style={{ margin: '16px 24px 0' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                👤 Chọn tài khoản để đăng nhập nhanh <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>— mật khẩu: 123456</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '220px', overflowY: 'auto', paddingRight: '2px' }}>
                {DB_ACCOUNTS.map((acc) => {
                  const roleColors = {
                    ADMIN: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', badge: '#ef4444', label: 'Admin' },
                    ADVERTISER: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', badge: '#3b82f6', label: 'NQC' },
                    VIEWER: acc.status === 'LOCKED'
                      ? { bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.2)', badge: '#9ca3af', label: 'Bị khóa' }
                      : { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', badge: '#10b981', label: 'Viewer' },
                  };
                  const c = roleColors[acc.role] || roleColors.VIEWER;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={async () => {
                        const payload = { emailOrPhone: acc.email, password: '123456' };
                        setLoginForm(payload);
                        setIsLoginLoading(true);
                        try {
                          const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                          const data = await res.json();
                          if (data.success) {
                            setCurrentUser(data.user);
                            setShowLoginModal(false);
                            setLoginForm({ emailOrPhone: '', password: '' });
                            if (data.user.system_role === 'ADMIN') setActiveTab('admin');
                            else if (data.user.system_role === 'ADVERTISER') setActiveTab('advertiser');
                            else setActiveTab('watch');
                            showToast(`Chào mừng, ${data.user.full_name}! 👋`, 'success');
                          } else { showToast(data.message, 'error'); }
                        } catch { showToast('Lỗi kết nối server!', 'error'); } finally { setIsLoginLoading(false); }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: c.bg, border: `1px solid ${c.border}`,
                        borderRadius: 'var(--radius-md)', padding: '8px 12px',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.opacity = '0.85'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.opacity = '1'; }}
                    >
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        background: c.badge, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700, color: '#fff'
                      }}>
                        {acc.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {acc.email}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: c.badge, textTransform: 'uppercase' }}>{c.label}</span>
                        {acc.balance > 0 && <span style={{ fontSize: '0.65rem', color: '#f59e0b' }}>{acc.balance.toLocaleString()} xu</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form đăng nhập */}
            <form onSubmit={handleLogin} style={{ padding: '20px 24px 24px' }}>
              <div className="form-group">
                <label className="form-label">Email hoặc Số điện thoại *</label>
                <input
                  id="login-email-phone"
                  className="form-input"
                  placeholder="email@example.com hoặc 0903000001"
                  value={loginForm.emailOrPhone}
                  onChange={(e) => setLoginForm({ ...loginForm, emailOrPhone: e.target.value })}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu *</label>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="Nhập mật khẩu của bạn"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '6px', padding: '12px' }}
                disabled={isLoginLoading}
              >
                {isLoginLoading ? 'Đang kiểm tra...' : '🔐 Đăng nhập vào hệ thống'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '18px 0 14px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>hoặc</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }}
              >
                Chưa có tài khoản? Đăng ký ngay
              </button>

              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                style={{ display: 'block', margin: '12px auto 0', color: 'var(--text-dim)', fontSize: '0.82rem', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL ĐĂNG KÝ TÀI KHOẢN MỚI (UC-03)
      ======================================================== */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Đăng Ký Tài Khoản Người Xem</h3>
              <button onClick={() => setShowRegisterModal(false)} style={{ color: 'var(--text-dim)', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleRegister} style={{ padding: '20px' }}>
              <div className="form-group">
                <label className="form-label">Họ và tên *</label>
                <input 
                  className="form-input" 
                  placeholder="VD: Nguyễn Văn A"
                  value={registerForm.full_name}
                  onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email *</label>
                <input 
                  type="email"
                  className="form-input" 
                  placeholder="email@example.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Số điện thoại *</label>
                <input 
                  className="form-input" 
                  placeholder="0901234567"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu *</label>
                <input 
                  type="password"
                  className="form-input" 
                  placeholder="Mật khẩu của bạn"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Năm sinh (từ 16 tuổi) *</label>
                  <input 
                    type="number"
                    className="form-input" 
                    value={registerForm.birth_year}
                    onChange={(e) => setRegisterForm({ ...registerForm, birth_year: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Giới tính</label>
                  <select 
                    className="form-select"
                    value={registerForm.gender}
                    onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tỉnh / Thành phố</label>
                <input 
                  className="form-input" 
                  placeholder="Hà Nội, TP.HCM..."
                  value={registerForm.province}
                  onChange={(e) => setRegisterForm({ ...registerForm, province: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Mã người giới thiệu</span>
                  <span style={{ fontSize: '0.75rem', color: '#a855f7' }}>Không bắt buộc</span>
                </label>
                <input 
                  className="form-input" 
                  placeholder="Nhập mã giới thiệu (VD: YX00000005) nếu có"
                  value={registerForm.referral_code || ''}
                  onChange={(e) => setRegisterForm({ ...registerForm, referral_code: e.target.value })}
                  style={{ borderColor: registerForm.referral_code ? '#a855f7' : undefined }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Đăng Ký & Nhận Thưởng
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      {/* <footer style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px 0',
        marginTop: 'auto',
        fontSize: '0.82rem',
        color: 'var(--text-dim)'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong>YouTube Xu</strong> • Dự án Sprint 1 (DB-01, DB-02, DB-03, SYS-01, SYS-02).
          </div>
          <div>
            Cơ sở dữ liệu MySQL XAMPP • Kiến trúc 3NF • Next.js Fullstack
          </div>
        </div>
      </footer> */}

    </div>
  );
}
