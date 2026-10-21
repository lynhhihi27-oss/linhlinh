'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, CheckCircle2, Clock, Coins, Gift, Wallet, ShieldAlert, 
  BarChart3, PlusCircle, AlertTriangle, UserCheck, Lock, Unlock, 
  Copy, ExternalLink, RefreshCw, Filter, Sparkles, Award, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

const adStatusLabels = {
  DRAFT: 'Bản nháp',
  PENDING: 'Chờ duyệt',
  ACTIVE: 'Đang chạy',
  PAUSED: 'Đã tạm dừng',
  ENDED: 'Đã kết thúc',
  REJECTED: 'Bị từ chối'
};

const redemptionStatusLabels = {
  PENDING: 'Chờ xử lý',
  APPROVED: 'Đã duyệt',
  DELIVERED: 'Đã gửi mã',
  REJECTED: 'Đã từ chối'
};

const transactionTypeLabels = {
  EARN: 'Nhận Xu',
  REDEEM: 'Đổi quà',
  REFUND: 'Hoàn Xu',
  BONUS: 'Thưởng',
  ADJUST: 'Điều chỉnh'
};

export default function YouTubeXuApp() {
  // Current active user & role
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('watch'); // 'watch' | 'rewards' | 'wallet' | 'advertiser' | 'admin'
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Data states
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [ads, setAds] = useState([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState('');
  const [rewards, setRewards] = useState([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(true);
  const [rewardsError, setRewardsError] = useState('');
  const [redemptions, setRedemptions] = useState([]);
  const [redeemingRewardId, setRedeemingRewardId] = useState(null);
  const redemptionRequestKeys = useRef(new Map());
  const activeRedemption = useRef(false);
  const [walletData, setWalletData] = useState({
    balance: 0,
    total_earned: 0,
    total_spent: 0,
    referrals: { code: '', invited_users: 0, bonus_xu: 0 },
    transactions: []
  });
  const [adminStats, setAdminStats] = useState(null);
  const [adminAds, setAdminAds] = useState([]);
  const [fraudData, setFraudData] = useState({ suspicious_users: [], recent_invalid_views: [] });

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
    referral_code: '',
    birth_year: 2002,
    gender: 'MALE',
    province: 'Hà Nội'
  });

  // Rewards subtab
  const [rewardSubTab, setRewardSubTab] = useState('shop'); // 'shop' | 'my-gifts'

  // Helper notification toast
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Load User Data
  const loadUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        if (data.user?.system_role === 'ADMIN') setActiveTab('admin');
        else if (data.user?.system_role === 'ADVERTISER') setActiveTab('advertiser');
        else setActiveTab(tab => tab === 'admin' || tab === 'advertiser' ? 'watch' : tab);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load Categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) setCategories(data.categories);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Load Ads for Viewer
  const loadAds = useCallback(async () => {
    setIsLoadingAds(true);
    setAdsError('');
    try {
      const categoryParam = selectedCategory ? `?category=${encodeURIComponent(selectedCategory)}` : '';
      const res = await fetch(`/api/ads${categoryParam}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAdsError(data.message || 'Không thể tải danh sách quảng cáo.');
        return;
      }
      setAds(data.ads);
    } catch (err) {
      console.error(err);
      setAdsError('Không thể kết nối để tải quảng cáo. Vui lòng thử lại.');
    } finally {
      setIsLoadingAds(false);
    }
  }, [selectedCategory]);

  // Load Advertiser Ads
  const loadAdvertiserAds = useCallback(async () => {
    try {
      const res = await fetch('/api/ads');
      const data = await res.json();
      if (data.success) setAds(data.ads);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Load Rewards
  const loadRewards = useCallback(async () => {
    setIsLoadingRewards(true);
    setRewardsError('');
    try {
      const res = await fetch('/api/rewards');
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRewardsError(data.message || 'Không thể tải danh sách quà.');
        return;
      }
      setRewards(data.rewards);
    } catch (err) {
      console.error(err);
      setRewardsError('Không thể kết nối để tải quà. Vui lòng thử lại.');
    } finally {
      setIsLoadingRewards(false);
    }
  }, []);

  // Load Redemptions
  const loadRedemptions = useCallback(async () => {
    try {
      const res = await fetch('/api/redemptions');
      const data = await res.json();
      if (data.success) setRedemptions(data.redemptions);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Load Wallet
  const loadWallet = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet');
      const data = await res.json();
      if (data.success) {
        setWalletData(data);
        setCurrentUser(prev => prev?.xu_balance === data.balance
          ? prev
          : { ...prev, xu_balance: data.balance });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleCopyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(walletData.referrals.code);
      showToast('Đã sao chép mã giới thiệu!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể sao chép mã giới thiệu trên trình duyệt này.', 'error');
    }
  };

  // Load Admin Data
  const loadAdminData = useCallback(async () => {
    try {
      const [statsRes, adsRes, fraudRes] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/ads').then(r => r.json()),
        fetch('/api/admin/fraud').then(r => r.json())
      ]);
      if (statsRes.success) setAdminStats(statsRes.stats);
      if (adsRes.success) setAdminAds(adsRes.ads);
      if (fraudRes.success) setFraudData(fraudRes);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadUser();
    loadCategories();
    loadRewards();
  }, [loadUser, loadCategories, loadRewards]);

  useEffect(() => {
    if (activeTab === 'watch') loadAds();
    if (currentUser && activeTab === 'rewards') loadRedemptions();
    if (currentUser && activeTab === 'wallet') loadWallet();
    if (currentUser && activeTab === 'advertiser') loadAdvertiserAds();
    if (currentUser && activeTab === 'admin') {
      loadAdminData();
      loadRedemptions();
    }
  }, [currentUser, activeTab, loadAds, loadAdminData, loadAdvertiserAds, loadRedemptions, loadWallet]);

  // Đổi quà (UC-02)
  const handleRedeem = async (reward) => {
    if (activeRedemption.current) return;
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    if (currentUser.xu_balance < reward.xu_cost) {
      showToast(`Bạn còn thiếu ${reward.xu_cost - currentUser.xu_balance} xu để đổi phần quà này!`, 'error');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn dùng ${reward.xu_cost} xu để đổi lấy "${reward.reward_name}" không?`)) {
      return;
    }

    const rewardId = Number(reward.reward_id);
    const requestStorageKey = `youtube-xu:redeem:${currentUser.user_id}:${rewardId}`;
    let requestKey = redemptionRequestKeys.current.get(requestStorageKey);
    if (!requestKey) {
      try {
        requestKey = sessionStorage.getItem(requestStorageKey);
      } catch (error) {
        console.error('Unable to read the redemption retry key from session storage:', error);
      }
    }
    if (!requestKey) {
      requestKey = crypto.randomUUID();
    }
    redemptionRequestKeys.current.set(requestStorageKey, requestKey);
    try {
      sessionStorage.setItem(requestStorageKey, requestKey);
    } catch (error) {
      console.error('Unable to persist the redemption retry key in session storage:', error);
    }
    activeRedemption.current = true;
    setRedeemingRewardId(rewardId);

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: rewardId, request_key: requestKey })
      });
      const data = await res.json();

      if (data.success) {
        redemptionRequestKeys.current.delete(requestStorageKey);
        try {
          sessionStorage.removeItem(requestStorageKey);
        } catch (error) {
          console.error('Unable to clear the completed redemption retry key:', error);
        }
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
    } finally {
      activeRedemption.current = false;
      setRedeemingRewardId(null);
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
          ...newCampaign
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
        body: JSON.stringify({ status, reject_reason: rejectReason })
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
    let giftCode;
    if (action === 'APPROVE') {
      giftCode = prompt('Nhập mã quà thực tế do nhà cung cấp cấp:');
      if (!giftCode?.trim()) return;
    }

    try {
      const res = await fetch(`/api/redemptions/${redemptionId}/process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, gift_code: giftCode })
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
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Không thể đăng xuất.', 'error');
        return;
      }
      setCurrentUser(null);
      setActiveTab('watch');
      showToast('Đã đăng xuất khỏi hệ thống!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối khi đăng xuất!', 'error');
    }
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
        showToast(`Đăng ký thành công! Mã giới thiệu của bạn: ${data.referral_code}`, 'success');
        setShowRegisterModal(false);
        setRegisterForm((prev) => ({ ...prev, password: '' }));
        setCurrentUser(data.user);
        setActiveTab('watch');
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi đăng ký tài khoản!', 'error');
    }
  };

  const displayedAdGroups = selectedCategory
    ? [{ category_id: selectedCategory, category_name: ads[0]?.category_name, ads }]
    : categories
      .map(category => ({
        ...category,
        ads: ads.filter(ad => String(ad.category_id) === String(category.category_id))
      }))
      .filter(category => category.ads.length > 0);
  const roleLabel = {
    ADMIN: 'Quản trị viên',
    ADVERTISER: 'Nhà quảng cáo',
    VIEWER: 'Người xem',
    GUEST: 'Khách'
  }[currentUser?.system_role || 'GUEST'];

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
        }} role="status" aria-live="polite">
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* HEADER / TOP NAVBAR */}
      <header style={{
        background: 'rgba(11, 15, 25, 0.88)',
        borderBottom: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div className="container site-header-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px' }}>
          
          {/* Logo */}
          <button type="button" aria-label="Trang chủ YouTube Xu" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'inherit', textAlign: 'left' }} onClick={() => setActiveTab('watch')}>
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
                Nền tảng quảng cáo & đổi thưởng
              </div>
            </div>
          </button>

          {/* Nav Tabs */}
          <nav className="primary-nav" aria-label="Điều hướng chính" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
              <span>Chiến dịch</span>
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

          {/* Account actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

            {/* Balance Pill + Đăng xuất (khi đã đăng nhập) */}
            {isLoading ? (
              <span role="status" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Đang kiểm tra phiên...</span>
            ) : currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  aria-label={`Số dư ví: ${currentUser.xu_balance?.toLocaleString() || 0} Xu. Mở ví`}
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
                </button>
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
      <section className="site-hero">
        <div className="container site-hero-content">
          <div className="hero-copy">
            <span className="hero-eyebrow"><Sparkles size={14} /> NỀN TẢNG YOUTUBE XU</span>
            <h1 className="hero-title">
              <span>{currentUser ? 'Chào mừng' : 'Khám phá'}</span>
              <span className="hero-user-name">{currentUser?.full_name || 'YouTube Xu'}</span>
              {currentUser && (
                <span className={`badge ${currentUser.account_status === 'LOCKED' ? 'badge-red' : 'badge-green'}`}>
                  {currentUser.account_status === 'LOCKED' ? 'Tài khoản bị khóa' : roleLabel}
                </span>
              )}
            </h1>
            <p className="hero-description">
              {activeTab === 'watch' && 'Khám phá các chiến dịch video theo danh mục. Tính năng nhận Xu sẽ mở khi hệ thống xác minh lượt xem được tích hợp.'}
              {activeTab === 'rewards' && 'Chọn phần quà bạn muốn đổi. Yêu cầu sẽ được xử lý sau khi quản trị viên xác nhận mã quà từ nhà cung cấp.'}
              {activeTab === 'wallet' && 'Theo dõi số dư và lịch sử cộng, sử dụng hoặc điều chỉnh Xu trong ví của bạn.'}
              {activeTab === 'advertiser' && 'Tạo chiến dịch video, thiết lập ngân sách và chọn nhóm khách hàng mục tiêu.'}
              {activeTab === 'admin' && 'Quản lý chiến dịch, yêu cầu đổi quà và hoạt động của tài khoản.'}
            </p>
          </div>

          <div className="hero-metrics">
            <div className="hero-metric hero-metric-gold">
              <span className="hero-metric-label">TỶ LỆ QUY ĐỔI</span>
              <strong>1.000 Xu = 10.000đ</strong>
            </div>
            <div className="hero-metric hero-metric-blue">
              <span className="hero-metric-label">XÁC MINH LƯỢT XEM</span>
              <strong>Đang hoàn thiện</strong>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="container" style={{ flex: 1, padding: '32px 20px' }}>

        {/* ========================================================
            TAB 1: XEM QUẢNG CÁO NHẬN XU (UC-01 & UC-V01)
        ======================================================== */}
        {activeTab === 'watch' && (
          <div>
            {/* Filter by Category */}
            <div className="category-toolbar">
              <div className="category-filters">
                <button
                  className={`btn btn-sm category-filter${selectedCategory === '' ? ' is-selected' : ''}`}
                  style={{
                    background: selectedCategory === '' ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                    color: selectedCategory === '' ? '#fff' : 'var(--text-muted)'
                  }}
                  onClick={() => setSelectedCategory('')}
                >
                  Tất cả
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.category_id}
                    className={`btn btn-sm category-filter${selectedCategory === cat.category_id.toString() ? ' is-selected' : ''}`}
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

              <button className="btn btn-secondary btn-sm refresh-button" onClick={loadAds}>
                <RefreshCw size={14} /> Làm mới
              </button>
            </div>

            <div className="glass-panel watch-notice" role="note">
              <strong>Tính năng nhận Xu đang được hoàn thiện.</strong>{' '}
              Hệ thống chưa xác minh được lượt xem với nhà cung cấp, nên hiện chưa ghi nhận lượt xem hoặc cộng Xu.
            </div>

            {/* Ads Grid */}
            {isLoadingAds ? (
              <div className="glass-panel" role="status" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Đang tải danh sách chiến dịch...
              </div>
            ) : adsError ? (
              <div className="glass-panel" role="alert" style={{ padding: '32px 20px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>{adsError}</p>
                <button className="btn btn-secondary btn-sm" onClick={loadAds}>
                  <RefreshCw size={14} /> Thử tải lại
                </button>
              </div>
            ) : ads.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Coins size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Không có quảng cáo nào phù hợp lúc này</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
                  Hãy chọn danh mục khác hoặc quay lại sau khi có chiến dịch mới.
                </p>
              </div>
            ) : (
              <div className="ad-groups">
                {displayedAdGroups.map(group => (
                  <section className="ad-group" key={group.category_id} aria-labelledby={`category-${group.category_id}`}>
                    <div className="ad-group-heading">
                      <h2 id={`category-${group.category_id}`}>
                        {group.category_name}
                      </h2>
                      <span className="badge badge-blue">{group.ads.length} video</span>
                    </div>
                    <div className="ad-grid">
                      {group.ads.map(ad => (
                        <div key={ad.ad_id} className="glass-panel ad-card" style={{
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
                      {/* Load these non-critical thumbnails directly and lazily instead of through the Next.js image optimizer. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://img.youtube.com/vi/${(ad.video_url.match(/(?:v=|\/)([\w-]{11})/) || [])[1] || 'dQw4w9WgXcQ'}/hqdefault.jpg`}
                        alt={ad.title}
                        loading="lazy"
                        decoding="async"
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
                        <span>Nhà quảng cáo: <strong>{ad.advertiser_name || 'Chưa cập nhật'}</strong></span>
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
                            disabled
                            title="Chưa tích hợp xác minh phát quảng cáo"
                          >
                            <Clock size={14} /> Tạm khóa nhận Xu
                          </button>
                        )}
                      </div>
                    </div>
                        </div>
                      ))}
                    </div>
                  </section>
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
              isLoadingRewards ? (
                <div className="glass-panel" role="status" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Đang tải danh sách quà...
                </div>
              ) : rewardsError ? (
                <div className="glass-panel" role="alert" style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>{rewardsError}</p>
                  <button className="btn btn-secondary btn-sm" onClick={loadRewards}>
                    <RefreshCw size={14} /> Thử tải lại
                  </button>
                </div>
              ) : rewards.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Hiện chưa có phần quà nào khả dụng.
                </div>
              ) : (
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
                      Quản trị viên sẽ xác nhận tồn kho và nhập mã quà thực tế từ nhà cung cấp.
                    </div>

                    <button 
                      className="btn btn-gold" 
                      style={{ marginTop: 'auto', width: '100%' }}
                      onClick={() => handleRedeem(item)}
                      disabled={redeemingRewardId !== null || item.stock_qty <= 0 || (currentUser?.xu_balance || 0) < item.xu_cost}
                    >
                      <Gift size={16} /> {redeemingRewardId === item.reward_id ? 'Đang gửi yêu cầu...' : 'Đổi ngay'}
                    </button>
                    </div>
                  ))}
                </div>
              )
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
                                {redemptionStatusLabels[r.status] || r.status}
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
            <div className="glass-panel" style={{ padding: '22px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '5px' }}>Mời bạn bè, nhận 10% xu thưởng</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Nhận hoa hồng mỗi khi bạn được mời hoàn tất xem quảng cáo. Hoa hồng được làm tròn đến xu gần nhất.
                </p>
                <div style={{ display: 'flex', gap: '18px', marginTop: '12px', fontSize: '0.82rem' }}>
                  <span>Bạn đã mời: <strong>{walletData.referrals.invited_users}</strong></span>
                  <span>Xu hoa hồng: <strong style={{ color: '#34d399' }}>{walletData.referrals.bonus_xu?.toLocaleString()} xu</strong></span>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleCopyReferralCode} disabled={!walletData.referrals.code}>
                <Copy size={14} /> Mã: {walletData.referrals.code || 'Đang tải'}
              </button>
            </div>

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
                    Lịch sử ghi lại mọi lần nhận, sử dụng và điều chỉnh Xu trong ví.
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
                              {transactionTypeLabels[t.txn_type] || t.txn_type}
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
                Tạo chiến dịch video, cài đặt ngân sách và lựa chọn nhóm khách hàng mục tiêu.
              </p>

              <form onSubmit={handleCreateCampaign}>
                <div className="form-group">
                  <label className="form-label" htmlFor="campaign-title">Tiêu đề chiến dịch quảng cáo *</label>
                  <input 
                    id="campaign-title"
                    className="form-input" 
                    placeholder="VD: Ra mắt ứng dụng học Tiếng Anh mới"
                    value={newCampaign.title}
                    onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="campaign-video">Link Video YouTube *</label>
                  <input 
                    id="campaign-video"
                    className="form-input" 
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={newCampaign.video_url}
                    onChange={(e) => setNewCampaign({ ...newCampaign, video_url: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="campaign-category">Danh mục *</label>
                    <select 
                      id="campaign-category"
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
                    <label className="form-label" htmlFor="campaign-duration">Thời lượng video (5-60 giây) *</label>
                    <input 
                      id="campaign-duration"
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
                    <label className="form-label" htmlFor="campaign-reward">Xu thưởng mỗi lượt xem</label>
                    <input 
                      id="campaign-reward"
                      type="number"
                      className="form-input" 
                      value={newCampaign.reward_xu}
                      readOnly
                      style={{ opacity: 0.8, background: 'rgba(255,255,255,0.03)' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Tự tính theo khung thời lượng</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="campaign-budget">Tổng ngân sách chiến dịch (Xu) *</label>
                    <input 
                      id="campaign-budget"
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
                      <label className="form-label" htmlFor="campaign-target-gender">Giới tính</label>
                      <select 
                        id="campaign-target-gender"
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
                      <label className="form-label" htmlFor="campaign-target-province">Tỉnh / Thành phố</label>
                      <input 
                        id="campaign-target-province"
                        className="form-input"
                        placeholder="VD: Hà Nội, TP.HCM hoặc để trống"
                        value={newCampaign.target_province}
                        onChange={(e) => setNewCampaign({ ...newCampaign, target_province: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <div>
                      <label className="form-label" htmlFor="campaign-age-from">Độ tuổi tối thiểu</label>
                      <input
                        id="campaign-age-from"
                        type="number"
                        className="form-input"
                        min="16"
                        max="120"
                        placeholder="Không giới hạn"
                        value={newCampaign.target_age_from}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          target_age_from: e.target.value === '' ? '' : parseInt(e.target.value, 10)
                        })}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="campaign-age-to">Độ tuổi tối đa</label>
                      <input
                        id="campaign-age-to"
                        type="number"
                        className="form-input"
                        min="16"
                        max="120"
                        placeholder="Không giới hạn"
                        value={newCampaign.target_age_to}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          target_age_to: e.target.value === '' ? '' : parseInt(e.target.value, 10)
                        })}
                      />
                    </div>
                    <span style={{ gridColumn: '1 / -1', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      Chỉ người xem nằm trong khoảng tuổi này mới thấy chiến dịch. Để trống cả hai ô để không giới hạn tuổi.
                    </span>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
                  Gửi chiến dịch để xét duyệt
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
                          {adStatusLabels[item.status] || item.status}
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
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{adminStats.users?.total_viewers} người xem • {adminStats.users?.total_advertisers} nhà quảng cáo</div>
                </div>

                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>CHIẾN DỊCH QUẢNG CÁO</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', marginTop: '6px' }}>{adminStats.ads?.total_ads}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{adminStats.ads?.active_ads} đang chạy • {adminStats.ads?.pending_ads} chờ duyệt</div>
                </div>

                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>TỔNG LƯỢT XEM VIDEO</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>{adminStats.views?.total_views}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{adminStats.views?.completed_views} hoàn tất • {adminStats.views?.invalid_views} không hợp lệ</div>
                </div>

                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>TỔNG XU TRONG HỆ THỐNG</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fcd34d', marginTop: '6px' }}>{adminStats.users?.total_circulating_xu?.toLocaleString()}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Đã đổi: {adminStats.redemptions?.total_redeemed_xu?.toLocaleString()} xu</div>
                </div>
              </div>
            )}

            {/* Admin Grid: 2 Cột */}
            <div className="admin-review-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px' }}>
              
              {/* Cột 1: Duyệt chiến dịch quảng cáo */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="#10b981" /> Duyệt chiến dịch quảng cáo
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
                          Nhà quảng cáo: <strong>{ad.advertiser_name}</strong> • {ad.duration_sec} giây • Ngân sách: {ad.budget_xu.toLocaleString()} xu
                        </div>
                        <div className="admin-action-buttons" style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleReviewAd(ad.ad_id, 'ACTIVE')}>
                            ✓ Phê duyệt chiến dịch
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

              {/* Cột 2: Duyệt đơn đổi quà */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={18} color="#f59e0b" /> Xác nhận đơn đổi quà
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
                          <span className="badge badge-gold">CHỜ DUYỆT</span>
                          <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>{r.xu_spent} xu</span>
                        </div>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '4px' }}>{r.reward_name}</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                          Người đổi: <strong>{r.full_name}</strong> ({r.email})
                        </div>
                        <div className="admin-action-buttons" style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleProcessRedemption(r.redemption_id, 'APPROVE')}>
                            ✓ Xác nhận mã quà thực tế
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

            {/* Giám sát và xử lý tài khoản */}
            <div className="glass-panel" style={{ padding: '24px', marginTop: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={20} color="#ff0033" /> Giám sát hoạt động bất thường
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Tài khoản có lượt xem không hợp lệ sẽ được kiểm tra để xử lý số dư hoặc tạm khóa.
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
                      <th style={{ padding: '12px' }}>Mã người dùng</th>
                      <th style={{ padding: '12px' }}>Họ tên & Email</th>
                      <th style={{ padding: '12px' }}>Số dư ví</th>
                      <th style={{ padding: '12px' }}>Lượt xem không hợp lệ</th>
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
                          {u.invalid_views} lượt không hợp lệ
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge ${u.account_status === 'LOCKED' ? 'badge-red' : 'badge-green'}`}>
                            {u.account_status === 'LOCKED' ? 'Đã khóa' : 'Đang hoạt động'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div className="admin-action-buttons" style={{ display: 'flex', gap: '8px' }}>
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
          MODAL ĐĂNG NHẬP (UC-G04)
      ======================================================== */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLoginModal(false); }}>
          <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="login-heading" style={{ maxWidth: '460px' }}>
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
              <h3 id="login-heading" style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '6px' }}>Đăng nhập YouTube Xu</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                Quản lý chiến dịch, theo dõi ví Xu và yêu cầu đổi quà.
              </p>
            </div>

            {/* Form đăng nhập */}
            <form onSubmit={handleLogin} style={{ padding: '20px 24px 24px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email-phone">Email hoặc Số điện thoại *</label>
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
                <label className="form-label" htmlFor="login-password">Mật khẩu *</label>
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
          <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="register-heading" style={{ maxWidth: '520px' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id="register-heading" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Đăng Ký Tài Khoản Người Xem</h3>
              <button onClick={() => setShowRegisterModal(false)} style={{ color: 'var(--text-dim)', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleRegister} style={{ padding: '20px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="register-full-name">Họ và tên *</label>
                <input 
                  id="register-full-name"
                  className="form-input" 
                  placeholder="VD: Nguyễn Văn A"
                  value={registerForm.full_name}
                  onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-email">Email *</label>
                <input 
                  id="register-email"
                  type="email"
                  className="form-input" 
                  placeholder="email@example.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-phone">Số điện thoại *</label>
                <input 
                  id="register-phone"
                  className="form-input" 
                  placeholder="0901234567"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-referral">Mã giới thiệu (không bắt buộc)</label>
                <input
                  id="register-referral"
                  className="form-input"
                  placeholder="VD: YX00000005"
                  maxLength={20}
                  value={registerForm.referral_code}
                  onChange={(e) => setRegisterForm({ ...registerForm, referral_code: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-password">Mật khẩu *</label>
                <input 
                  id="register-password"
                  type="password"
                  className="form-input" 
                  placeholder="Mật khẩu của bạn"
                  minLength={8}
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="register-birth-year">Năm sinh (từ 16 tuổi) *</label>
                  <input 
                    id="register-birth-year"
                    type="number"
                    className="form-input" 
                    value={registerForm.birth_year}
                    onChange={(e) => setRegisterForm({ ...registerForm, birth_year: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="register-gender">Giới tính</label>
                  <select 
                    id="register-gender"
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
                <label className="form-label" htmlFor="register-province">Tỉnh / Thành phố</label>
                <input 
                  id="register-province"
                  className="form-input" 
                  placeholder="Hà Nội, TP.HCM..."
                  value={registerForm.province}
                  onChange={(e) => setRegisterForm({ ...registerForm, province: e.target.value })}
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
      <footer className="site-footer">
        <div className="container site-footer-content">
          <div>
            <strong>YouTube Xu</strong>
          </div>
          <div>
            Nền tảng chiến dịch video và đổi thưởng
          </div>
        </div>
      </footer>

    </div>
  );
}
