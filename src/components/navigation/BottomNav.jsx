import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard,
  Briefcase,
  Clock,
  Receipt,
  Users,
  Menu,
  Cloud,
  MapPin,
  Banknote,
  ChevronUp,
  Zap,
  MessageSquare,
  BookOpen
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSyncQueue } from '@/components/pwa/SyncQueueManager';
import { hasFullAccess } from '@/components/core/roleRules';

const BottomNav = React.memo(function BottomNav({ user, pendingExpenses, navigation }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [timeExpanded, setTimeExpanded] = useState(false);
  const [travelExpanded, setTravelExpanded] = useState(false);

  // Active session tracking for live timer in bottom nav
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const checkSession = () => {
      try {
        const work = localStorage.getItem('liveTimeTracker_work');
        const driving = localStorage.getItem('liveTimeTracker_driving');
        const raw = work || driving;
        if (raw) {
          const s = JSON.parse(raw);
          if (s?.startTime) { setActiveSession(s); return; }
        }
        setActiveSession(null);
      } catch (e) { setActiveSession(null); }
    };
    checkSession();
    const interval = setInterval(checkSession, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeSession?.startTime) { setElapsed(0); return; }
    const update = () => {
      const secs = Math.floor((Date.now() - activeSession.startTime - (activeSession.breakDuration || 0)) / 1000);
      setElapsed(Math.max(0, secs));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.startTime, activeSession?.breakDuration]);

  const formatElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // STEP 2: Track pending sync operations count
  const { pendingCount } = useSyncQueue();

  // Memoize navigation items - consolidated: My Expenses, Travel (Per Diem + Mileage), Time, Field, More
  const mainNavItems = React.useMemo(() => {
    const items = [
      { 
        title: 'My Expenses', 
        url: createPageUrl("MisGastos"), 
        icon: Receipt,
        badge: pendingExpenses > 0 ? pendingExpenses : null,
      },
      { 
        title: 'Travel', 
        url: createPageUrl("PerDiem"), 
        icon: Banknote,
        isTravelMenu: true,
      },
      { 
        title: 'Time', 
        url: createPageUrl("TimeTracking"), 
        icon: Clock,
        isTimeMenu: true,
      },
      { 
        title: 'Field', 
        url: createPageUrl("Field"), 
        icon: MapPin,
      },
    ];
    return items;
  }, [pendingExpenses]);

  // Memoize isActive to prevent recreation
  const isActive = React.useCallback((url) => location.pathname === url, [location.pathname]);

  const handleTimeClick = (e) => {
    e.preventDefault();
    setTimeExpanded(!timeExpanded);
  };

  const handleTimeSubSelect = (type) => {
    // type can be 'work' or 'driving'
    const baseUrl = createPageUrl("TimeTracking");
    navigate(baseUrl, { state: { timeType: type } });
    setTimeExpanded(false);
  };

  const handleTravelClick = (e) => {
    e.preventDefault();
    setTravelExpanded(!travelExpanded);
  };

  const handleTravelSubSelect = (page) => {
    navigate(createPageUrl(page));
    setTravelExpanded(false);
  };

  // More menu with 6 quick access items
  const quickAccessItems = [
    { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
    { title: 'Calendar', url: createPageUrl("Calendario"), icon: Clock },
    { title: 'My Jobs', url: createPageUrl("MisProyectos"), icon: Briefcase },
    { title: 'My Payroll', url: createPageUrl("MyPayroll"), icon: Banknote },
    { title: 'Installation Library', url: createPageUrl("KnowledgeLibrary"), icon: BookOpen },
  ];

  const [moreExpanded, setMoreExpanded] = useState(false);

  // Render the fixed bar as a portal to document.body to escape any CSS transform containers
  return (
    <>
      {ReactDOM.createPortal(
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700 shadow-2xl" style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
          <div className="grid grid-cols-5 h-16 px-1 relative">
            {mainNavItems.map((item) => {
              const active = isActive(item.url);
              if (item.isTimeMenu) {
                if (activeSession && !activeSession.onBreak) {
                  return (
                  <button key={item.title} onClick={handleTimeClick}
                    className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                      active || timeExpanded ? 'text-[#507DB4]' : 'text-slate-500'
                    }`}>
                    <item.icon className="w-5 h-5" strokeWidth={active || timeExpanded ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">{item.title}</span>
                  </button>
                );
              }
              if (item.isTravelMenu) {
                return (
                  <button key={item.title} onClick={handleTravelClick}
                    className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                      travelExpanded ? 'text-[#507DB4]' : 'text-slate-500'
                    }`}>
                    <item.icon className="w-5 h-5" strokeWidth={travelExpanded ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">{item.title}</span>
                  </button>
                );
              }
              return (
                <Link key={item.title} to={item.url}
                  className={`flex flex-col items-center justify-center gap-0.5 relative transition-all active:scale-95 ${
                    active ? 'text-[#507DB4]' : 'text-slate-500'
                  }`}>
                  <div className="relative">
                    <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                    {item.badge && (
                      <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] bg-red-600 text-white border-0">
                        {item.badge > 9 ? '9+' : item.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{item.title}</span>
                </Link>
              );
            })}
            <button onClick={() => setMoreExpanded(!moreExpanded)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                moreExpanded ? 'text-[#507DB4]' : 'text-slate-500'
              }`}>
              <Menu className="w-5 h-5" strokeWidth={moreExpanded ? 2.5 : 2} />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>

          {timeExpanded && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 p-2 flex flex-col gap-2">
                <button onClick={() => handleTimeSubSelect('work')} className="px-4 py-2.5 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white font-semibold rounded-xl text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Work Time
                </button>
                <button onClick={() => handleTimeSubSelect('driving')} className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Driving Time
                </button>
              </div>
            </div>
          )}

          {travelExpanded && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 p-2 flex flex-col gap-2">
                <button onClick={() => handleTravelSubSelect('PerDiem')} className="px-4 py-2.5 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white font-semibold rounded-xl text-sm flex items-center gap-2">
                  <Banknote className="w-4 h-4" /> Per Diem
                </button>
                <button onClick={() => handleTravelSubSelect('Manejo')} className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Mileage
                </button>
              </div>
            </div>
          )}

          {moreExpanded && (
            <div className="absolute bottom-20 right-2 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 p-2 grid grid-cols-2 gap-2 w-64">
                {quickAccessItems.map((item) => (
                  <Link key={item.title} to={item.url} onClick={() => setMoreExpanded(false)}
                    className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
                    <item.icon className="w-5 h-5 text-[#507DB4]" strokeWidth={2.5} />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight text-center">{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
      {/* Spacer so content doesn't hide behind nav */}
      <div className="md:hidden h-16" />
    </>
  );
});

export default BottomNav;