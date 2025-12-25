import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Gift, Plus, Check, Heart, Coffee, Gamepad2, Film, Sparkles, Car, Bed, Calendar, ChevronRight, ArrowLeft, Users, BookOpen, Share2, Palette, Music, Utensils, TreePine, Download, X, Edit3, Trash2, Printer, ExternalLink, Mail, MessageSquarePlus, Cloud, CloudOff, RefreshCw, HelpCircle } from 'lucide-react';
import { shareCoupon, downloadICS, getGoogleCalendarURL, getOutlookCalendarURL, getEmailURL, printCoupon } from './utils/couponActions';
import { createBooklet, fetchBooklet, updateBooklet, getShareUrl, getBookletIdFromUrl } from './utils/cloudSync';
import Games from './components/Games';

// ============================================
// CUSTOMIZATION 
// ============================================
const DEFAULT_GIFTERS = [
  { id: 1, name: 'Silas', color: 'bg-pink-400' },
  { id: 2, name: 'Gideon', color: 'bg-blue-400' },
  { id: 3, name: 'Abel', color: 'bg-green-400' },
];

const TEMPLATES = [
  { id: 1, title: 'Breakfast in Bed', icon: Coffee, category: 'service', color: 'amber', description: 'A cozy morning treat' },
  { id: 2, title: 'Chore Pass', icon: Sparkles, category: 'service', color: 'green', description: 'Skip one chore, guilt-free' },
  { id: 3, title: 'Movie Night Pick', icon: Film, category: 'choice', color: 'purple', description: 'You choose what we watch' },
  { id: 4, title: 'Game Night', icon: Gamepad2, category: 'time', color: 'blue', description: 'Family game of your choice' },
  { id: 5, title: 'Day Trip Adventure', icon: Car, category: 'adventure', color: 'rose', description: 'A surprise outing' },
  { id: 6, title: 'Sleep In Pass', icon: Bed, category: 'relaxation', color: 'indigo', description: 'Extra ZZZs, no guilt' },
  { id: 7, title: 'Dinner Choice', icon: Utensils, category: 'choice', color: 'amber', description: 'Pick the restaurant or meal' },
  { id: 8, title: 'Playlist Control', icon: Music, category: 'choice', color: 'purple', description: 'DJ for the day' },
  { id: 9, title: 'Nature Walk', icon: TreePine, category: 'adventure', color: 'green', description: 'A peaceful outdoor stroll' },
  { id: 10, title: 'Hug Coupon', icon: Heart, category: 'love', color: 'rose', description: 'Redeemable anytime' },
];

const colorMap = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', badge: 'bg-amber-100', gradient: 'from-amber-400 to-orange-400' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-500', badge: 'bg-green-100', gradient: 'from-green-400 to-emerald-400' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-500', badge: 'bg-purple-100', gradient: 'from-purple-400 to-violet-400' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', badge: 'bg-blue-100', gradient: 'from-blue-400 to-cyan-400' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-500', badge: 'bg-rose-100', gradient: 'from-rose-400 to-pink-400' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-500', badge: 'bg-indigo-100', gradient: 'from-indigo-400 to-blue-400' },
};

// Icon lookup map for serialization/deserialization
const iconMap = {
  Gift, Coffee, Sparkles, Film, Gamepad2, Car, Bed, Utensils, Music, TreePine, Heart, Calendar, Palette, BookOpen
};

const STORAGE_KEY = 'experience_gifts_v1';

// Encode/decode booklet state for URL sharing
const encodeBooklet = (data) => {
  try {
    // Convert icon components to strings for serialization
    const serializable = {
      ...data,
      coupons: data.coupons?.map(c => ({
        ...c,
        icon: c.icon?.displayName || c.icon?.name || 'Gift'
      }))
    };
    return btoa(encodeURIComponent(JSON.stringify(serializable)));
  } catch {
    return null;
  }
};

const decodeBooklet = (encoded) => {
  try {
    const data = JSON.parse(decodeURIComponent(atob(encoded)));
    // Restore icon components from strings
    if (data.coupons) {
      data.coupons = data.coupons.map(c => ({
        ...c,
        icon: typeof c.icon === 'string'
          ? iconMap[c.icon] || Gift
          : c.icon?.displayName
            ? iconMap[c.icon.displayName] || Gift
            : Gift
      }));
    }
    return data;
  } catch {
    return null;
  }
};

export default function ExperienceGifts() {
  const [currentView, setCurrentView] = useState('home');
  const [booklet, setBooklet] = useState({ title: '', recipient: '', theme: '🎄 Holiday' });
  const [coupons, setCoupons] = useState([]);
  const [gifters, setGifters] = useState(DEFAULT_GIFTERS);
  const [selectedGifter, setSelectedGifter] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [editingGifter, setEditingGifter] = useState(null);
  const [newGifterName, setNewGifterName] = useState('');
  const [customCouponTitle, setCustomCouponTitle] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [scheduleModalCoupon, setScheduleModalCoupon] = useState(null);
  const [toast, setToast] = useState(null);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestionType, setSuggestionType] = useState('suggestion');
  const [suggestionText, setSuggestionText] = useState('');
  const [showCouponHelp, setShowCouponHelp] = useState(false);
  const [showAddCouponsHelp, setShowAddCouponsHelp] = useState(false);

  // Cloud sync state
  const [bookletId, setBookletId] = useState(null);
  const [syncStatus, setSyncStatus] = useState('local'); // 'local', 'syncing', 'synced', 'error'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const saveTimeoutRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Load from URL (cloud ID or hash) or localStorage on mount
  useEffect(() => {
    const loadData = async () => {
      // Check for cloud booklet ID in URL first
      const cloudId = getBookletIdFromUrl();
      if (cloudId) {
        setSyncStatus('syncing');
        const data = await fetchBooklet(cloudId);
        if (data) {
          setBookletId(cloudId);
          setBooklet(data.booklet || { title: '', recipient: '', theme: '🎄 Holiday' });
          setCoupons(data.coupons || []);
          setGifters(data.gifters || DEFAULT_GIFTERS);
          setSyncStatus('synced');
          setLastSyncTime(new Date());
          setCurrentView('view-booklet');
          // Keep the URL clean but preserve the ID
          window.history.replaceState(null, '', `?id=${cloudId}`);
          return;
        }
        setSyncStatus('error');
      }

      // Check for legacy hash-based sharing
      const hash = window.location.hash.slice(1);
      if (hash && hash.startsWith('booklet=')) {
        const encoded = hash.replace('booklet=', '');
        const data = decodeBooklet(encoded);
        if (data) {
          setBooklet(data.booklet || { title: '', recipient: '', theme: '🎄 Holiday' });
          setCoupons(data.coupons || []);
          setGifters(data.gifters || DEFAULT_GIFTERS);
          setCurrentView('view-booklet');
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }

      // Fall back to localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          setBooklet(data.booklet || { title: '', recipient: '', theme: '🎄 Holiday' });
          setCoupons(data.coupons || []);
          setGifters(data.gifters || DEFAULT_GIFTERS);
          if (data.bookletId) {
            setBookletId(data.bookletId);
            setSyncStatus('synced');
          }
        }
      } catch (e) {
        console.log('No saved data');
      }
    };

    loadData();
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (booklet.title || coupons.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ booklet, coupons, gifters, bookletId }));
    }
  }, [booklet, coupons, gifters, bookletId]);

  // Cloud sync - save to cloud with debounce
  useEffect(() => {
    if (!bookletId || syncStatus === 'local') return;

    // Debounce saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSyncStatus('syncing');
      const result = await updateBooklet(bookletId, { booklet, coupons, gifters });
      if (result) {
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      } else {
        setSyncStatus('error');
      }
    }, 1000); // Wait 1 second after last change

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [booklet, coupons, gifters, bookletId, syncStatus]);

  // Poll for updates when viewing a synced booklet
  useEffect(() => {
    if (!bookletId || currentView !== 'view-booklet') {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      return;
    }

    const pollForUpdates = async () => {
      const data = await fetchBooklet(bookletId);
      if (data && data.updatedAt !== lastSyncTime?.toISOString()) {
        // Only update if data is newer
        const remoteTime = new Date(data.updatedAt);
        if (!lastSyncTime || remoteTime > lastSyncTime) {
          setBooklet(data.booklet);
          setCoupons(data.coupons);
          setGifters(data.gifters);
          setLastSyncTime(remoteTime);
        }
      }
    };

    // Poll every 5 seconds
    pollIntervalRef.current = setInterval(pollForUpdates, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [bookletId, currentView, lastSyncTime]);

  const addCoupon = (template) => {
    if (!selectedGifter) return;
    setCoupons([...coupons, {
      ...template,
      id: Date.now(),
      gifterId: selectedGifter,
      redeemed: false,
      redeemedAt: null,
    }]);
  };

  const addCustomCoupon = () => {
    if (!selectedGifter || !customCouponTitle.trim()) return;
    setCoupons([...coupons, {
      id: Date.now(),
      title: customCouponTitle.trim(),
      icon: Gift,
      category: 'custom',
      color: 'rose',
      description: 'A special gift just for you',
      gifterId: selectedGifter,
      redeemed: false,
      redeemedAt: null,
    }]);
    setCustomCouponTitle('');
    setShowCustomModal(false);
  };

  const removeCoupon = (couponId) => {
    setCoupons(coupons.filter(c => c.id !== couponId));
  };

  const toggleRedeem = (couponId) => {
    setCoupons(coupons.map(c =>
      c.id === couponId 
        ? { ...c, redeemed: !c.redeemed, redeemedAt: c.redeemed ? null : new Date().toLocaleDateString() } 
        : c
    ));
  };

  const generateShareUrl = async () => {
    setSyncStatus('syncing');

    try {
      let id = bookletId;

      // Create cloud booklet if we don't have one yet
      if (!id) {
        const result = await createBooklet({ booklet, coupons, gifters });
        if (result && result.id) {
          id = result.id;
          setBookletId(id);
          setSyncStatus('synced');
          setLastSyncTime(new Date());
        } else {
          // Fall back to hash-based URL if cloud sync fails
          setSyncStatus('error');
          const data = { booklet, coupons, gifters };
          const encoded = encodeBooklet(data);
          const url = `${window.location.origin}${window.location.pathname}#booklet=${encoded}`;
          setShareUrl(url);
          setShowShareModal(true);
          return;
        }
      } else {
        // Update existing cloud booklet
        await updateBooklet(id, { booklet, coupons, gifters });
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      }

      const url = getShareUrl(id);
      setShareUrl(url);
      setShowShareModal(true);
    } catch (error) {
      console.error('Share error:', error);
      setSyncStatus('error');
      // Fall back to hash-based URL
      const data = { booklet, coupons, gifters };
      const encoded = encodeBooklet(data);
      const url = `${window.location.origin}${window.location.pathname}#booklet=${encoded}`;
      setShareUrl(url);
      setShowShareModal(true);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied! Share it with the gift recipient.');
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      alert('Link copied!');
    }
  };

  const resetAll = () => {
    if (confirm('Start fresh? This will clear everything.')) {
      setCurrentView('home');
      setBooklet({ title: '', recipient: '', theme: '🎄 Holiday' });
      setCoupons([]);
      setGifters(DEFAULT_GIFTERS);
      setSelectedGifter(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleShareCoupon = async (coupon) => {
    let url;
    if (bookletId) {
      url = getShareUrl(bookletId);
    } else {
      url = `${window.location.origin}${window.location.pathname}#booklet=${encodeBooklet({ booklet, coupons, gifters })}`;
    }
    const result = await shareCoupon(coupon, url);
    if (result.success) {
      if (result.method === 'clipboard') {
        showToast('Link copied to clipboard!');
      }
    } else {
      showToast('Could not share. Try copying the link manually.');
    }
  };

  const handlePrintCoupon = (coupon) => {
    const gifter = gifters.find(g => g.id === coupon.gifterId);
    printCoupon(coupon, gifter?.name || 'Someone Special', booklet.title || 'Coupon Book', booklet.recipient || 'You');
  };

  const handleEmailCoupon = (coupon) => {
    let url;
    if (bookletId) {
      url = getShareUrl(bookletId);
    } else {
      url = `${window.location.origin}${window.location.pathname}#booklet=${encodeBooklet({ booklet, coupons, gifters })}`;
    }
    window.location.href = getEmailURL(coupon, { bookletUrl: url });
  };

  const updateGifterName = (id, newName) => {
    setGifters(gifters.map(g => g.id === id ? { ...g, name: newName } : g));
    setEditingGifter(null);
  };

  const addGifter = () => {
    if (!newGifterName.trim()) return;
    const colors = ['bg-pink-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-amber-400', 'bg-cyan-400'];
    const usedColors = gifters.map(g => g.color);
    const availableColor = colors.find(c => !usedColors.includes(c)) || colors[gifters.length % colors.length];
    setGifters([...gifters, { id: Date.now(), name: newGifterName.trim(), color: availableColor }]);
    setNewGifterName('');
  };

  const removeGifter = (id) => {
    if (gifters.length <= 1) return;
    setGifters(gifters.filter(g => g.id !== id));
    if (selectedGifter === id) setSelectedGifter(null);
  };

  // ============================================
  // GAMES SCREEN
  // ============================================
  if (currentView === 'games') {
    return <Games onBack={() => setCurrentView('home')} />;
  }

  // ============================================
  // HOME SCREEN
  // ============================================
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">
        <div className="max-w-md mx-auto px-6 py-12">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-rose-400 to-amber-400 rounded-3xl shadow-lg mb-4">
              <Gift className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Experience Gifts</h1>
            <p className="text-gray-500 mt-2">Give moments, not things</p>
          </div>

          {/* Main Actions */}
          <div className="space-y-4">
            {/* View Demo First - helps users understand the app */}
            <button
              onClick={() => {
                setBooklet({ title: "Mom's 2025 Coupon Book", recipient: 'Mom', theme: '🎄 Holiday' });
                setCoupons([
                  { ...TEMPLATES[0], id: 1, gifterId: 1, redeemed: true, redeemedAt: 'Jan 15' },
                  { ...TEMPLATES[1], id: 2, gifterId: 2, redeemed: false },
                  { ...TEMPLATES[2], id: 3, gifterId: 3, redeemed: false },
                  { ...TEMPLATES[3], id: 4, gifterId: 1, redeemed: true, redeemedAt: 'Feb 8' },
                  { ...TEMPLATES[4], id: 5, gifterId: 2, redeemed: false },
                  { ...TEMPLATES[5], id: 6, gifterId: 3, redeemed: false },
                ]);
                setCurrentView('view-booklet');
                setShowCouponHelp(true); // Auto-show help for demo
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-5 flex items-center justify-between shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg">View Demo Booklet</div>
                  <div className="text-purple-100 text-sm">See all the features</div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6" />
            </button>

            <button
              onClick={() => setCurrentView('create-booklet')}
              className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl p-5 flex items-center justify-between shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg">Create New Booklet</div>
                  <div className="text-rose-100 text-sm">Start a gift collection</div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Show continue if there's saved progress */}
            {(booklet.title || coupons.length > 0) && (
              <button
                onClick={() => setCurrentView('view-booklet')}
                className="w-full bg-white border-2 border-rose-200 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-rose-500" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-800">Continue: {booklet.title || 'My Booklet'}</div>
                    <div className="text-gray-400 text-sm">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''} added</div>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-300" />
              </button>
            )}

            <button
              onClick={() => setCurrentView('games')}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl p-5 flex items-center justify-between shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg">Play Together</div>
                  <div className="text-purple-100 text-sm">Real-time games with family</div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="mt-12 grid grid-cols-4 gap-2 text-center">
            <div className="p-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Heart className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-xs text-gray-500">Meaningful</div>
            </div>
            <div className="p-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-xs text-gray-500">Multi-Gifter</div>
            </div>
            <div className="p-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-xs text-gray-500">Year-Round</div>
            </div>
            <div className="p-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Gamepad2 className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-xs text-gray-500">Play Games</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // CREATE BOOKLET SCREEN
  // ============================================
  if (currentView === 'create-booklet') {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-md mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setCurrentView('home')} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">Create Booklet</h2>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Booklet Name</label>
              <input
                type="text"
                placeholder="Mom's 2025 Coupon Book"
                value={booklet.title}
                onChange={(e) => setBooklet({ ...booklet, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">For Who?</label>
              <input
                type="text"
                placeholder="Mom, Dad, Grandma..."
                value={booklet.recipient}
                onChange={(e) => setBooklet({ ...booklet, recipient: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Who's Giving? (tap to edit names)</label>
              <div className="flex flex-wrap gap-3">
                {gifters.map(gifter => (
                  <div key={gifter.id} className="text-center relative group">
                    {editingGifter === gifter.id ? (
                      <div className="flex flex-col items-center">
                        <input
                          type="text"
                          defaultValue={gifter.name}
                          autoFocus
                          className="w-20 text-center text-sm border-2 border-rose-300 rounded-lg px-2 py-1"
                          onBlur={(e) => updateGifterName(gifter.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateGifterName(gifter.id, e.target.value);
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingGifter(gifter.id)}
                          className={`w-14 h-14 ${gifter.color} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md hover:shadow-lg transition-all`}
                        >
                          {gifter.name[0]}
                        </button>
                        <div className="text-sm text-gray-600 mt-1">{gifter.name}</div>
                        {gifters.length > 1 && (
                          <button 
                            onClick={() => removeGifter(gifter.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
                <div className="text-center">
                  {newGifterName !== '' ? (
                    <div className="flex flex-col items-center">
                      <input
                        type="text"
                        placeholder="Name"
                        value={newGifterName}
                        autoFocus
                        className="w-20 text-center text-sm border-2 border-rose-300 rounded-lg px-2 py-1"
                        onChange={(e) => setNewGifterName(e.target.value)}
                        onBlur={() => { addGifter(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') addGifter(); }}
                      />
                    </div>
                  ) : (
                    <button 
                      onClick={() => setNewGifterName(' ')}
                      className="w-14 h-14 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center hover:border-gray-400 transition-colors"
                    >
                      <Plus className="w-6 h-6 text-gray-400" />
                    </button>
                  )}
                  <div className="text-sm text-gray-400 mt-1">Add</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {['🎄 Holiday', '🎂 Birthday', '💝 Just Because'].map(theme => (
                  <button 
                    key={theme} 
                    onClick={() => setBooklet({ ...booklet, theme })}
                    className={`p-3 border-2 rounded-xl text-sm transition-all ${
                      booklet.theme === theme 
                        ? 'border-rose-400 bg-rose-50 text-rose-700' 
                        : 'border-gray-200 hover:border-rose-300 hover:bg-rose-50'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={() => {
              if (!booklet.title) setBooklet(b => ({ ...b, title: "Mom's 2025 Coupon Book" }));
              if (!booklet.recipient) setBooklet(b => ({ ...b, recipient: 'Mom' }));
              setCurrentView('add-coupons');
            }}
            className="w-full mt-8 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            Continue to Add Coupons
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // ADD COUPONS SCREEN
  // ============================================
  if (currentView === 'add-coupons') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentView('create-booklet')} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl min-h-[44px] min-w-[44px]">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-lg font-bold text-gray-800">Add Coupons</h2>
              <button onClick={() => setShowAddCouponsHelp(true)} className="p-2 hover:bg-gray-100 rounded-xl min-h-[44px] min-w-[44px]">
                <HelpCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Gifter Selector */}
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">Select who's giving this coupon:</div>
              <div className="flex gap-2 flex-wrap">
                {gifters.map(gifter => (
                  <button
                    key={gifter.id}
                    onClick={() => setSelectedGifter(gifter.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedGifter === gifter.id 
                        ? `${gifter.color} text-white shadow-md scale-105` 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{gifter.name}</span>
                  </button>
                ))}
              </div>
              {!selectedGifter && (
                <div className="text-xs text-amber-600 mt-2">👆 Select a gifter first</div>
              )}
            </div>
          </div>

          {/* Added Coupons Summary */}
          {coupons.length > 0 && (
            <div className="bg-white mx-4 mt-4 p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-700">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''} added</div>
                <div className="flex -space-x-2">
                  {[...new Set(coupons.map(c => c.gifterId))].map(gid => {
                    const gifter = gifters.find(g => g.id === gid);
                    if (!gifter) return null;
                    return (
                      <div key={gid} className={`w-6 h-6 ${gifter.color} rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                        {gifter.name[0]}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Full list of added coupons - scrollable */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {coupons.map(coupon => {
                  const gifter = gifters.find(g => g.id === coupon.gifterId);
                  return (
                    <div key={coupon.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-5 h-5 ${gifter?.color || 'bg-gray-300'} rounded-full flex-shrink-0`} />
                        <span className="text-gray-600 truncate">{coupon.title}</span>
                      </div>
                      <button
                        onClick={() => removeCoupon(coupon.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {coupons.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`Remove all ${coupons.length} coupons?`)) {
                      setCoupons([]);
                    }
                  }}
                  className="w-full mt-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          )}

          {/* Template Grid */}
          <div className="px-4 py-6">
            <div className="text-sm font-medium text-gray-500 mb-3">Tap to add a coupon</div>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map(template => {
                const colors = colorMap[template.color];
                const Icon = template.icon;
                const count = coupons.filter(c => c.title === template.title).length;
                return (
                  <button
                    key={template.id}
                    onClick={() => addCoupon(template)}
                    disabled={!selectedGifter}
                    className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-4 text-left transition-all ${
                      selectedGifter ? 'hover:shadow-md active:scale-95' : 'opacity-50 cursor-not-allowed'
                    } relative`}
                  >
                    {count > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow">
                        {count}
                      </div>
                    )}
                    <div className={`w-10 h-10 ${colors.badge} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div className="font-medium text-gray-800 text-sm">{template.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Option */}
            <button 
              onClick={() => selectedGifter && setShowCustomModal(true)}
              disabled={!selectedGifter}
              className={`w-full mt-4 border-2 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 transition-colors ${
                selectedGifter 
                  ? 'border-gray-300 text-gray-500 hover:border-rose-300 hover:text-rose-500' 
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
            >
              <Palette className="w-5 h-5" />
              <span className="font-medium">Create Custom Coupon</span>
            </button>
          </div>

          {/* Done Button */}
          {coupons.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-4">
              <div className="max-w-md mx-auto">
                <button
                  onClick={() => setCurrentView('view-booklet')}
                  className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                >
                  Preview Booklet ({coupons.length} coupon{coupons.length !== 1 ? 's' : ''})
                </button>
              </div>
            </div>
          )}

          {/* Custom Coupon Modal */}
          {showCustomModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Custom Coupon</h3>
                <input
                  type="text"
                  placeholder="e.g., Walk Sylvie, Take out Trash ..."
                  value={customCouponTitle}
                  onChange={(e) => setCustomCouponTitle(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => { setShowCustomModal(false); setCustomCouponTitle(''); }}
                    className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCustomCoupon}
                    disabled={!customCouponTitle.trim()}
                    className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Coupons Help Modal */}
          {showAddCouponsHelp && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
                  <h3 className="text-lg font-bold text-gray-800">How to Add Coupons</h3>
                  <button onClick={() => setShowAddCouponsHelp(false)} className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="bg-amber-50 rounded-xl p-4">
                    <div className="font-bold text-amber-800 mb-2">Step 1: Pick a Gifter</div>
                    <p className="text-sm text-amber-700">Tap a name at the top to select who is giving this coupon. Each person gets their own color!</p>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="font-bold text-blue-800 mb-2">Step 2: Add Coupons</div>
                    <p className="text-sm text-blue-700">Tap any template to add it, or tap <strong>"+ Custom"</strong> to create your own.</p>
                  </div>

                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="font-bold text-green-800 mb-2">Step 3: Review & Continue</div>
                    <p className="text-sm text-green-700">Your added coupons appear at the top. Tap the trash icon to remove any. When done, tap <strong>"View Booklet"</strong>.</p>
                  </div>

                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="font-bold text-purple-800 mb-2">Tips</div>
                    <div className="text-sm text-purple-700 space-y-1">
                      <p>• Multiple people can add coupons</p>
                      <p>• Mix templates with custom coupons</p>
                      <p>• Edit gifter names by tapping the pencil</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAddCouponsHelp(false)}
                    className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-medium min-h-[44px]"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // VIEW BOOKLET SCREEN (Recipient View)
  // ============================================
  if (currentView === 'view-booklet') {
    const redeemedCount = coupons.filter(c => c.redeemed).length;
    const progress = coupons.length > 0 ? (redeemedCount / coupons.length) * 100 : 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 print:bg-white">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="px-6 pt-8 pb-4 print:hidden">
            <div className="flex items-center justify-between mb-6">
              <button onClick={resetAll} className="p-2 -ml-2 hover:bg-white/50 rounded-xl">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                {/* Sync Status Indicator */}
                {bookletId && (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      syncStatus === 'synced' ? 'bg-green-100 text-green-700' :
                      syncStatus === 'syncing' ? 'bg-amber-100 text-amber-700' :
                      syncStatus === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}
                    title={lastSyncTime ? `Last synced: ${lastSyncTime.toLocaleTimeString()}` : 'Not synced'}
                  >
                    {syncStatus === 'synced' && <Cloud className="w-3.5 h-3.5" />}
                    {syncStatus === 'syncing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {syncStatus === 'error' && <CloudOff className="w-3.5 h-3.5" />}
                    <span>
                      {syncStatus === 'synced' ? 'Synced' :
                       syncStatus === 'syncing' ? 'Syncing...' :
                       syncStatus === 'error' ? 'Offline' : 'Local'}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setShowCouponHelp(true)}
                  className="p-2 hover:bg-white/50 rounded-xl"
                  title="Help"
                >
                  <HelpCircle className="w-6 h-6 text-gray-600" />
                </button>
                <button
                  onClick={() => setCurrentView('add-coupons')}
                  className="p-2 hover:bg-white/50 rounded-xl"
                  title="Edit coupons"
                >
                  <Edit3 className="w-6 h-6 text-gray-600" />
                </button>
                <button
                  onClick={generateShareUrl}
                  className="p-2 hover:bg-white/50 rounded-xl"
                  title="Share booklet"
                >
                  <Share2 className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Booklet Cover */}
            <div className="bg-gradient-to-br from-rose-400 to-amber-400 rounded-3xl p-6 shadow-xl text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-lg">{booklet.title || "Coupon Book"}</div>
                  <div className="text-rose-100 text-sm">For {booklet.recipient || 'Someone Special'}</div>
                </div>
              </div>
              
              {/* Progress */}
              <div className="bg-white/20 rounded-full h-3 mb-2 overflow-hidden">
                <div 
                  className="bg-white rounded-full h-3 transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-sm text-rose-100">{redeemedCount} of {coupons.length} redeemed</div>
              
              {/* Gifters */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-rose-100">From:</span>
                <div className="flex -space-x-2">
                  {gifters.map(gifter => (
                    <div key={gifter.id} className={`w-8 h-8 ${gifter.color} rounded-full border-2 border-white/30 flex items-center justify-center text-white text-xs font-bold shadow`}>
                      {gifter.name[0]}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-rose-100 ml-1">
                  {gifters.map(g => g.name).join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* Print Header (only shows when printing) */}
          <div className="hidden print:block px-6 py-8 text-center border-b-4 border-rose-400">
            <div className="text-3xl mb-2">🎁</div>
            <h1 className="text-2xl font-bold text-gray-800">{booklet.title || "Coupon Book"}</h1>
            <p className="text-gray-500">For {booklet.recipient || 'Someone Special'}</p>
            <p className="text-sm text-gray-400 mt-2">From: {gifters.map(g => g.name).join(', ')}</p>
          </div>

          {/* Coupons List */}
          <div className="px-4 pb-8">
            <div className="text-sm font-medium text-gray-500 mb-3 px-2 print:hidden">
              Tap the circle to redeem
            </div>
            <div className="space-y-3">
              {coupons.map(coupon => {
                const colors = colorMap[coupon.color] || colorMap.rose;
                const Icon = coupon.icon || Gift;
                const gifter = gifters.find(g => g.id === coupon.gifterId);
                return (
                  <div 
                    key={coupon.id}
                    className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all print:break-inside-avoid ${
                      coupon.redeemed ? 'border-green-200 bg-green-50/50' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${colors.badge} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-6 h-6 ${coupon.redeemed ? 'text-green-500' : colors.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${coupon.redeemed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {coupon.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <div className={`w-5 h-5 ${gifter?.color || 'bg-gray-300'} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                            {gifter?.name[0] || '?'}
                          </div>
                          <span className="text-xs text-gray-400">from {gifter?.name || 'Unknown'}</span>
                          {coupon.redeemed && (
                            <span className="text-xs text-green-500 ml-auto">✓ {coupon.redeemedAt}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleRedeem(coupon.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all print:hidden ${
                          coupon.redeemed
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-rose-100 hover:text-rose-500'
                        }`}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      {/* Print version of checkmark */}
                      <div className="hidden print:flex w-8 h-8 border-2 border-gray-300 rounded-full items-center justify-center">
                        {coupon.redeemed && <Check className="w-5 h-5 text-green-500" />}
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 print:hidden">
                      <button
                        onClick={() => setScheduleModalCoupon(coupon)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors min-h-[44px]"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Schedule</span>
                      </button>
                      <button
                        onClick={() => handleShareCoupon(coupon)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors min-h-[44px]"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                      <button
                        onClick={() => handlePrintCoupon(coupon)}
                        className="flex items-center justify-center px-3 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors min-h-[44px] min-w-[44px]"
                        title="Print coupon"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {coupons.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <div className="text-gray-500">No coupons yet</div>
                <button
                  onClick={() => setCurrentView('add-coupons')}
                  className="mt-4 px-6 py-2 bg-rose-500 text-white rounded-full font-medium"
                >
                  Add Coupons
                </button>
              </div>
            )}
          </div>

          {/* Footer Message */}
          <div className="px-6 pb-8 print:hidden space-y-3">
            <div className="bg-gradient-to-r from-rose-100 to-amber-100 rounded-2xl p-4 text-center">
              <Heart className="w-6 h-6 text-rose-400 mx-auto mb-2" />
              <div className="text-sm text-gray-600">
                Made with love — redeem anytime throughout the year!
              </div>
            </div>

            {/* Suggestion Box */}
            <button
              onClick={() => setShowSuggestionModal(true)}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white border-2 border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors min-h-[44px]"
            >
              <MessageSquarePlus className="w-5 h-5" />
              <span className="font-medium">Have a suggestion? Let us know!</span>
            </button>
          </div>
        </div>

        {/* Suggestion Modal */}
        {showSuggestionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
                <h3 className="text-lg font-bold text-gray-800">Send Feedback</h3>
                <button
                  onClick={() => {
                    setShowSuggestionModal(false);
                    setSuggestionType('suggestion');
                    setSuggestionText('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">What type of feedback?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'suggestion', label: 'Suggestion' },
                      { value: 'recommendation', label: 'Recommendation' },
                      { value: 'update', label: 'Update Request' },
                      { value: 'edit', label: 'Edit/Fix' },
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setSuggestionType(type.value)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                          suggestionType === type.value
                            ? 'bg-rose-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your message</label>
                  <textarea
                    value={suggestionText}
                    onChange={(e) => setSuggestionText(e.target.value)}
                    placeholder="Tell us what you're thinking..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base resize-none"
                  />
                </div>

                {/* Send Button */}
                <a
                  href={`mailto:howdy@edinfinite.com?subject=${encodeURIComponent(
                    `${suggestionType.charAt(0).toUpperCase() + suggestionType.slice(1)} for ${booklet.title || 'Experience Gifts'}`
                  )}&body=${encodeURIComponent(
                    `Hi!\n\nType: ${suggestionType.charAt(0).toUpperCase() + suggestionType.slice(1)}\n\n${suggestionText || '[Your message here]'}\n\n---\nSent from ${booklet.title || 'Experience Gifts'}`
                  )}`}
                  onClick={() => {
                    setShowSuggestionModal(false);
                    setSuggestionType('suggestion');
                    setSuggestionText('');
                  }}
                  className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 min-h-[44px] ${
                    suggestionText.trim()
                      ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Send Feedback
                </a>

                <p className="text-xs text-gray-400 text-center">
                  Opens your email app with the message pre-filled
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Share Booklet</h3>
                <button onClick={() => setShowShareModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {bookletId ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Cloud className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">Cloud synced!</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Share this link with {booklet.recipient || 'the recipient'}. Changes sync automatically across all devices!
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500 mb-4">
                  Copy this link and send it to {booklet.recipient || 'the recipient'}. They can open it on any device!
                </p>
              )}

              <div className="bg-gray-100 rounded-xl p-3 mb-4">
                <div className="text-xs text-gray-600 break-all font-mono">
                  {shareUrl.length > 80 ? `${shareUrl.slice(0, 80)}...` : shareUrl}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Copy Link
                </button>
                <button
                  onClick={() => window.print()}
                  className="py-3 px-4 border-2 border-gray-200 rounded-xl font-medium text-gray-600"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coupon Help Modal - Feature Walkthrough */}
        {showCouponHelp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
                <h3 className="text-lg font-bold text-gray-800">Welcome! Try These Features</h3>
                <button onClick={() => setShowCouponHelp(false)} className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600 text-center">This is a demo booklet. Try each feature below!</p>

                {/* Step 1: Redeem */}
                <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                    <span className="font-bold text-green-800">Redeem a Coupon</span>
                  </div>
                  <p className="text-sm text-green-700">Tap the <strong>circle</strong> on the right side of any coupon to mark it as used.</p>
                </div>

                {/* Step 2: Schedule */}
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                    <span className="font-bold text-blue-800">Schedule to Calendar</span>
                  </div>
                  <p className="text-sm text-blue-700">Tap <strong>Schedule</strong> on any coupon. Pick a date, add location, invite family. Works with Google, Outlook, Apple Calendar.</p>
                </div>

                {/* Step 3: Share */}
                <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                    <span className="font-bold text-purple-800">Share a Coupon</span>
                  </div>
                  <p className="text-sm text-purple-700">Tap <strong>Share</strong> to send a single coupon via text, email, or other apps.</p>
                </div>

                {/* Step 4: Print */}
                <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
                    <span className="font-bold text-amber-800">Print a Coupon</span>
                  </div>
                  <p className="text-sm text-amber-700">Tap the <strong>printer icon</strong> to print a single coupon on paper.</p>
                </div>

                {/* Step 5: Share Booklet */}
                <div className="bg-rose-50 rounded-xl p-4 border-2 border-rose-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold">5</div>
                    <span className="font-bold text-rose-800">Share Entire Booklet</span>
                  </div>
                  <p className="text-sm text-rose-700">Tap <Share2 className="w-3 h-3 inline" /> in the top menu to get a link. Changes sync across all devices!</p>
                </div>

                {/* Step 6: Edit */}
                <div className="bg-gray-100 rounded-xl p-4 border-2 border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-bold">6</div>
                    <span className="font-bold text-gray-800">Edit Coupons</span>
                  </div>
                  <p className="text-sm text-gray-700">Tap <Edit3 className="w-3 h-3 inline" /> in the top menu to add or remove coupons.</p>
                </div>

                <button
                  onClick={() => setShowCouponHelp(false)}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-medium min-h-[44px]"
                >
                  Start Exploring!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {scheduleModalCoupon && (
          <ScheduleModal
            coupon={scheduleModalCoupon}
            gifterName={gifters.find(g => g.id === scheduleModalCoupon.gifterId)?.name || 'Someone Special'}
            bookletTitle={booklet.title || 'Coupon Book'}
            onClose={() => setScheduleModalCoupon(null)}
          />
        )}

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in">
            {toast}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Schedule Modal Component
function ScheduleModal({ coupon, gifterName, bookletTitle, onClose }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState('');
  const [note, setNote] = useState('');

  const getDateTime = () => {
    if (!date) return new Date();
    return new Date(`${date}T${time}:00`);
  };

  const getOptions = () => ({
    date: getDateTime(),
    duration,
    location,
    attendees: attendees.split(',').map(e => e.trim()).filter(Boolean),
    description: `Gift from ${gifterName}\n\n${coupon.description}${note ? `\n\nNote: ${note}` : ''}`
  });

  const handleDownloadICS = () => {
    downloadICS(coupon, getOptions());
  };

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarURL(coupon, getOptions()), '_blank');
  };

  const handleOutlookCalendar = () => {
    window.open(getOutlookCalendarURL(coupon, getOptions()), '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-bold text-gray-800">Schedule: {coupon.title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base min-h-[44px]"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base min-h-[44px]"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
              <option value={480}>All day</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Home, Restaurant name..."
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base min-h-[44px]"
            />
          </div>

          {/* Invite Others */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invite others (emails, comma-separated)
            </label>
            <input
              type="text"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="dad@email.com, grandma@email.com"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base min-h-[44px]"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any special plans or requests..."
              rows={2}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base resize-none"
            />
          </div>
        </div>

        {/* Calendar Buttons */}
        <div className="p-4 border-t space-y-3">
          <div className="text-sm font-medium text-gray-500 mb-2">Add to Calendar</div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleCalendar}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" />
              Google
            </button>
            <button
              onClick={handleOutlookCalendar}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" />
              Outlook
            </button>
          </div>

          <button
            onClick={handleDownloadICS}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            Download .ics (Apple Calendar, etc.)
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-medium min-h-[44px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
