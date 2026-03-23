import React, { useState } from 'react';
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

  // Hide BottomNav when a time tracking session is active (buttons must not be covered)
  const hasActiveSession = React.useMemo(() => {
    try {
      return !!JSON.parse(localStorage.getItem('liveTimeTracker_work'))?.startTime ||
             !!JSON.parse(localStorage.getItem('liveTimeTracker_driving'))?.startTime;
    } catch { return false; }
  }, []);

  // Re-check on every render tick so nav hides/shows as session changes
  const [sessionActive, setSessionActive] = useState(hasActiveSession);
  React.useEffect(() => {
    const interval = setInterval(() => {
      try {
        const active = !!JSON.parse(localStorage.getItem('liveTimeTracker_work'))?.startTime ||
                       !!JSON.parse(localStorage.getItem('liveTimeTracker_driving'))?.startTime;
        setSessionActive(active);
      } catch { setSessionActive(false); }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Don't render nav while a session is active — avoids covering clock-out buttons
  if (sessionActive) return <div className="md:hidden h-16" />;

  return (
    <>
      {/* Bottom Navigation Bar - Fixed at bottom - ANIMATED */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[40] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 shadow-lg pb-safe">
        <div className="grid grid-cols-5 h-16 px-1 relative">
          {mainNavItems.map((item) => {
            const active = isActive(item.url);

            // Time menu handler
            if (item.isTimeMenu) {
              return (
                <button
                  key={item.title}
                  onClick={handleTimeClick}
                  className={`flex flex-col items-center justify-center gap-0.5 relative transition-all duration-300 rounded-lg active:scale-95 ${
                    active || timeExpanded
                      ? 'text-[#507DB4] dark:text-[#6B9DD8] scale-125' 
                      : 'text-slate-600 dark:text-slate-400 scale-100'
                  }`}
                >
                  <div className="relative">
                    <item.icon className={`w-5 h-5 transition-all duration-300`} strokeWidth={active || timeExpanded ? 2.5 : 2} />
                    {active && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#507DB4] dark:bg-[#6B9DD8]" />
                    )}
                  </div>
                  <span className={`text-[10px] ${active || timeExpanded ? 'font-bold' : 'font-medium'} truncate max-w-full text-center leading-tight transition-all duration-300`}>
                    {item.title}
                  </span>
                </button>
              );
            }

            // Travel menu handler (Per Diem + Mileage)
            if (item.isTravelMenu) {
              return (
                <button
                  key={item.title}
                  onClick={handleTravelClick}
                  className={`flex flex-col items-center justify-center gap-0.5 relative transition-all duration-300 rounded-lg active:scale-95 ${
                    travelExpanded
                      ? 'text-[#507DB4] dark:text-[#6B9DD8] scale-125' 
                      : 'text-slate-600 dark:text-slate-400 scale-100'
                  }`}
                >
                  <div className="relative">
                    <item.icon className={`w-5 h-5 transition-all duration-300`} strokeWidth={travelExpanded ? 2.5 : 2} />
                    {travelExpanded && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#507DB4] dark:bg-[#6B9DD8]" />
                    )}
                  </div>
                  <span className={`text-[10px] ${travelExpanded ? 'font-bold' : 'font-medium'} truncate max-w-full text-center leading-tight transition-all duration-300`}>
                    {item.title}
                  </span>
                </button>
              );
            }

            // Regular link items
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex flex-col items-center justify-center gap-0.5 relative transition-all duration-300 rounded-lg active:scale-95 ${
                  active 
                    ? 'text-[#507DB4] dark:text-[#6B9DD8] scale-125' 
                    : 'text-slate-600 dark:text-slate-400 scale-100'
                }`}
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 transition-all duration-300`} strokeWidth={active ? 2.5 : 2} />
                  {item.badge && (
                    <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] bg-red-600 text-white border-0 flex items-center justify-center font-bold shadow-md">
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#507DB4] dark:bg-[#6B9DD8]" />
                  )}
                </div>
                <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'} truncate max-w-full text-center leading-tight transition-all duration-300`}>
                  {item.title}
                </span>
              </Link>
            );
          })}

          {/* More Menu - 6 Quick Access */}
          <button
            onClick={() => setMoreExpanded(!moreExpanded)}
            className={`flex flex-col items-center justify-center gap-0.5 relative transition-all duration-300 rounded-lg active:scale-95 ${
              moreExpanded
                ? 'text-[#507DB4] dark:text-[#6B9DD8] scale-125' 
                : 'text-slate-600 dark:text-slate-400 scale-100'
            }`}
          >
            <div className="relative">
              <Menu className={`w-5 h-5 transition-all duration-300`} strokeWidth={moreExpanded ? 2.5 : 2} />
              {pendingCount > 0 && (
                <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] bg-blue-600 text-white border-0 flex items-center justify-center font-bold shadow-md">
                  Syncing
                </Badge>
              )}
              {moreExpanded && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#507DB4] dark:bg-[#6B9DD8]" />
              )}
            </div>
            <span className={`text-[10px] ${moreExpanded ? 'font-bold' : 'font-medium'} truncate max-w-full text-center leading-tight transition-all duration-300`}>
              More
            </span>
          </button>

          {/* More Menu Sheet - kept for larger screens */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <div className="hidden" />
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-white dark:bg-slate-900 h-[85vh] rounded-t-3xl">
              <SheetHeader className="pb-4 border-b border-slate-200 dark:border-slate-800">
                <SheetTitle className="text-slate-900 dark:text-white">All Sections</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(85vh-80px)] mt-4">
                <div className="space-y-6 pb-6">
                  {navigation.map((section, idx) => (
                    <div key={idx}>
                      <div className="flex items-center gap-2 mb-3 px-4">
                        {section.icon && <section.icon className="w-4 h-4 text-[#507DB4] dark:text-[#6B9DD8]" />}
                        <h3 className="text-xs font-bold text-[#507DB4] dark:text-[#6B9DD8] tracking-wider">
                          {section.section}
                        </h3>
                      </div>
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const active = isActive(item.url);
                          return (
                            <Link
                              key={item.title}
                              to={item.url}
                              onClick={() => setSheetOpen(false)}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl mx-2 transition-all duration-150 min-h-[56px] active:scale-90 active:shadow-inner ${
                                active
                                  ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-200 active:bg-slate-100 dark:active:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon className="w-6 h-6" strokeWidth={2.5} />
                                <span className="font-semibold text-base">{item.title}</span>
                              </div>
                              {active && (
                                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Time Submenu - Animated popup above Time button */}
        {timeExpanded && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 origin-bottom">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 flex flex-col gap-2">
              <button
                onClick={() => handleTimeSubSelect('work')}
                className="px-4 py-2.5 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white font-semibold rounded-xl text-sm hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Work Time (Normal)
              </button>
              <button
                onClick={() => handleTimeSubSelect('driving')}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl text-sm hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Driving Time
              </button>
            </div>
          </div>
        )}

        {/* Travel Submenu - Animated popup above Travel button */}
        {travelExpanded && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 origin-bottom">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 flex flex-col gap-2">
              <button
                onClick={() => handleTravelSubSelect('PerDiem')}
                className="px-4 py-2.5 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white font-semibold rounded-xl text-sm hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <Banknote className="w-4 h-4" />
                Per Diem
              </button>
              <button
                onClick={() => handleTravelSubSelect('Manejo')}
                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl text-sm hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Mileage
              </button>
            </div>
          </div>
        )}

        {/* More Menu - 6 Quick Access Popup */}
        {moreExpanded && (
          <div className="absolute bottom-20 right-2 transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 origin-bottom z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 grid grid-cols-2 gap-2 w-64">
              {quickAccessItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setMoreExpanded(false)}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl text-center transition-all active:scale-95 ${
                      active
                        ? 'bg-gradient-to-r from-[#507DB4]/20 to-[#6B9DD8]/20 border border-[#507DB4]/30 dark:border-[#6B9DD8]/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent'
                    }`}
                  >
                    <item.icon className="w-5 h-5 text-[#507DB4] dark:text-[#6B9DD8]" strokeWidth={2.5} />
                    <span className={`text-[11px] font-semibold truncate max-w-full leading-tight ${active ? 'text-[#507DB4] dark:text-[#6B9DD8]' : 'text-slate-700 dark:text-slate-300'}`}>
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="md:hidden h-16" />
    </>
  );
});

export default BottomNav;