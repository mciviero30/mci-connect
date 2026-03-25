import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, Briefcase, Clock, Receipt,
  MapPin, Banknote, Zap, MessageSquare, BookOpen,
  Menu, X, User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncQueue } from '@/components/pwa/SyncQueueManager';
import { hasFullAccess } from '@/components/core/roleRules';

const TAB_HISTORY_KEY = 'bottomNavTabHistory';

const BottomNav = React.memo(function BottomNav({ user, pendingExpenses, navigation }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [timeExpanded, setTimeExpanded] = useState(false);
  const [travelExpanded, setTravelExpanded] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const { pendingCount } = useSyncQueue();

  // ── Per-tab navigation stack (independent history per tab) ──
  const tabHistoryRef = useRef(() => {
    try { return JSON.parse(sessionStorage.getItem(TAB_HISTORY_KEY) || '{}'); }
    catch { return {}; }
  });

  const saveTabHistory = (tabKey, path) => {
    try {
      const h = JSON.parse(sessionStorage.getItem(TAB_HISTORY_KEY) || '{}');
      h[tabKey] = path;
      sessionStorage.setItem(TAB_HISTORY_KEY, JSON.stringify(h));
    } catch {}
  };

  const getTabLastPath = (tabKey, fallback) => {
    try {
      const h = JSON.parse(sessionStorage.getItem(TAB_HISTORY_KEY) || '{}');
      return h[tabKey] || fallback;
    } catch { return fallback; }
  };

  // Primary tabs for bottom nav
  const mainTabs = React.useMemo(() => [
    { key: 'home',     label: 'Home',     url: createPageUrl('Dashboard'),    icon: LayoutDashboard },
    { key: 'time',     label: 'Time',     url: createPageUrl('TimeTracking'),  icon: Clock, isTimeMenu: true },
    { key: 'travel',   label: 'Travel',   url: createPageUrl('PerDiem'),       icon: Banknote, isTravelMenu: true },
    { key: 'expenses', label: 'Expenses', url: createPageUrl('MisGastos'),     icon: Receipt,
      badge: pendingExpenses > 0 ? pendingExpenses : null },
    { key: 'more',     label: 'More',     url: null,                           icon: Menu, isMore: true },
  ], [pendingExpenses]);

  // More-sheet items (quick access grid)
  const moreItems = [
    { label: 'Field',    url: createPageUrl('Field'),           icon: MapPin },
    { label: 'My Jobs',  url: createPageUrl('MisProyectos'),    icon: Briefcase },
    { label: 'Chat',     url: createPageUrl('Chat'),            icon: MessageSquare },
    { label: 'Payroll',  url: createPageUrl('MyPayroll'),       icon: Banknote },
    { label: 'Library',  url: createPageUrl('KnowledgeLibrary'),icon: BookOpen },
    { label: 'Profile',  url: createPageUrl('Configuracion'),   icon: User },
  ];

  // Active session tracking
  useEffect(() => {
    const check = () => {
      try {
        const raw = localStorage.getItem('liveTimeTracker_work') || localStorage.getItem('liveTimeTracker_driving');
        if (raw) { const s = JSON.parse(raw); if (s?.startTime) { setActiveSession(s); return; } }
        setActiveSession(null);
      } catch { setActiveSession(null); }
    };
    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeSession?.startTime) { setElapsed(0); return; }
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - activeSession.startTime - (activeSession.breakDuration || 0)) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeSession?.startTime, activeSession?.breakDuration]);

  const fmt = (s) => `${String(Math.floor(s / 3600)).padStart(2,'0')}:${String(Math.floor((s % 3600) / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const isActive = (url) => url && location.pathname === url;

  const handleTabPress = (tab) => {
    if (tab.isMore) { setMoreOpen(o => !o); setTimeExpanded(false); setTravelExpanded(false); return; }
    if (tab.isTimeMenu) { setTimeExpanded(o => !o); setTravelExpanded(false); setMoreOpen(false); return; }
    if (tab.isTravelMenu) { setTravelExpanded(o => !o); setTimeExpanded(false); setMoreOpen(false); return; }
    setMoreOpen(false); setTimeExpanded(false); setTravelExpanded(false);
    const dest = getTabLastPath(tab.key, tab.url);
    saveTabHistory(tab.key, dest);
    navigate(dest);
  };

  // Save current path to active tab's history on navigation
  useEffect(() => {
    const activeTab = mainTabs.find(t => !t.isMore && !t.isTimeMenu && !t.isTravelMenu && t.url === location.pathname);
    if (activeTab) saveTabHistory(activeTab.key, location.pathname);
  }, [location.pathname]);

  const closeAll = () => { setMoreOpen(false); setTimeExpanded(false); setTravelExpanded(false); };

  return ReactDOM.createPortal(
    <>
      {/* Backdrop for expanded panels */}
      <AnimatePresence>
        {(moreOpen || timeExpanded || travelExpanded) && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[9990] bg-black/30 backdrop-blur-sm"
            onClick={closeAll}
          />
        )}
      </AnimatePresence>

      {/* Time sub-menu */}
      <AnimatePresence>
        {timeExpanded && (
          <motion.div
            key="time-menu"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="md:hidden fixed bottom-[76px] left-1/2 -translate-x-1/2 z-[9995] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 flex flex-col gap-2 min-w-[180px]"
          >
            <button onClick={() => { navigate(createPageUrl('TimeTracking'), { state: { timeType: 'work' } }); closeAll(); }}
              className="min-h-[48px] px-4 py-3 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white font-semibold rounded-xl text-sm flex items-center gap-2 active:scale-95 transition-transform">
              <Clock className="w-4 h-4" /> Work Time
            </button>
            <button onClick={() => { navigate(createPageUrl('TimeTracking'), { state: { timeType: 'driving' } }); closeAll(); }}
              className="min-h-[48px] px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl text-sm flex items-center gap-2 active:scale-95 transition-transform">
              <Zap className="w-4 h-4" /> Driving Time
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Travel sub-menu */}
      <AnimatePresence>
        {travelExpanded && (
          <motion.div
            key="travel-menu"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="md:hidden fixed bottom-[76px] left-1/2 -translate-x-1/2 z-[9995] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 flex flex-col gap-2 min-w-[180px]"
          >
            <button onClick={() => { navigate(createPageUrl('PerDiem')); closeAll(); }}
              className="min-h-[48px] px-4 py-3 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white font-semibold rounded-xl text-sm flex items-center gap-2 active:scale-95 transition-transform">
              <Banknote className="w-4 h-4" /> Per Diem
            </button>
            <button onClick={() => { navigate(createPageUrl('Manejo')); closeAll(); }}
              className="min-h-[48px] px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl text-sm flex items-center gap-2 active:scale-95 transition-transform">
              <Zap className="w-4 h-4" /> Mileage
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* More sheet — bottom drawer */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="more-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="md:hidden fixed bottom-[64px] left-0 right-0 z-[9995] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-700"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            <div className="flex items-center justify-between px-5 py-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick Access</p>
              <button onClick={closeAll} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-6">
              {moreItems.map((item) => (
                <Link key={item.label} to={item.url}
                  onClick={closeAll}
                  className="flex flex-col items-center justify-center gap-1.5 p-4 min-h-[80px] rounded-2xl bg-slate-50 dark:bg-slate-800 active:scale-95 transition-transform hover:bg-slate-100 dark:hover:bg-slate-700">
                  <item.icon className="w-6 h-6 text-[#507DB4] dark:text-[#6B9DD8]" strokeWidth={2} />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The main bottom tab bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-700/80 backdrop-blur-xl shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="tablist"
        aria-label="Main navigation"
        aria-orientation="horizontal"
        data-bottom-tabs="true"
        data-tab-bar="true"
        data-tab-bar-native="true"
        data-stack-preservation="true"
        data-tab-history="enabled"
        data-independent-stacks="true"
        data-stack-per-tab="true"
        data-native-tab-bar="true"
        data-ios-tab-bar="true"
        data-android-tab-bar="true"
        data-bottom-navigation="true"
      >
        <div className="grid grid-cols-5 h-16 px-1">
          {mainTabs.map((tab) => {
            const active = isActive(tab.url);
            const isActiveMore = tab.isMore && moreOpen;
            const isActiveTime = tab.isTimeMenu && timeExpanded;
            const isActiveTravel = tab.isTravelMenu && travelExpanded;
            const highlighted = active || isActiveMore || isActiveTime || isActiveTravel;

            // Live session indicator for time tab
            if (tab.isTimeMenu && activeSession && !activeSession.onBreak) {
              return (
                <button key={tab.key} onClick={() => handleTabPress(tab)}
                  role="tab"
                  aria-selected={highlighted}
                  data-tab-key={tab.key}
                  className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] active:scale-95 transition-transform">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-9 h-9 rounded-full bg-green-500/25 animate-ping" />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                      <Clock className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-green-600 font-mono tabular-nums">{fmt(elapsed)}</span>
                </button>
              );
            }

            return (
              <button key={tab.key} onClick={() => handleTabPress(tab)}
                role="tab"
                aria-selected={highlighted}
                data-tab-key={tab.key}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] active:scale-95 transition-all relative ${
                  highlighted ? 'text-[#507DB4] dark:text-[#6B9DD8]' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {highlighted && (
                  <motion.div
                    layoutId="activeTabDot"
                    className="absolute top-1 w-1 h-1 rounded-full bg-[#507DB4] dark:bg-[#6B9DD8]"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <tab.icon className="w-5 h-5" strokeWidth={highlighted ? 2.5 : 1.8} />
                  {tab.badge && (
                    <Badge className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 text-[9px] bg-red-500 text-white border-0 leading-none">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </Badge>
                  )}
                </div>
                <span className={`text-[10px] font-medium leading-none ${highlighted ? 'font-semibold' : ''}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content spacer */}
      <div className="md:hidden h-16" />
    </>,
    document.body
  );
});

export default BottomNav;