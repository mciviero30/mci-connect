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
  Zap
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
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // STEP 2: Track pending sync operations count
  const { pendingCount } = useSyncQueue();

  // Memoize navigation items to prevent recreation
  const mainNavItems = React.useMemo(() => [
    { 
      title: 'Dashboard', 
      url: createPageUrl("Dashboard"), 
      icon: LayoutDashboard,
      color: 'from-[#507DB4] to-[#6B9DD8]'
    },
    { 
      title: hasFullAccess(user) ? 'Jobs' : 'Field', 
      url: createPageUrl(hasFullAccess(user) ? "Trabajos" : "Field"), 
      icon: hasFullAccess(user) ? Briefcase : MapPin,
      color: 'from-indigo-500 to-indigo-600'
    },
    { 
      title: 'Time', 
      url: createPageUrl("TimeTracking"), 
      icon: Clock,
      color: 'from-green-500 to-green-600'
    },
    { 
      title: hasFullAccess(user) ? 'Expenses' : 'Per Diem', 
      url: createPageUrl(hasFullAccess(user) ? "Gastos" : "PerDiem"), 
      icon: hasFullAccess(user) ? Receipt : Banknote,
      badge: hasFullAccess(user) && pendingExpenses > 0 ? pendingExpenses : null,
      color: hasFullAccess(user) ? 'from-amber-500 to-amber-600' : 'from-emerald-500 to-emerald-600'
    },
  ], [pendingExpenses, user]);

  // Memoize isActive to prevent recreation
  const isActive = React.useCallback((url) => location.pathname === url, [location.pathname]);

  return (
    <>
      {/* Bottom Navigation Bar - Fixed at bottom - OPTIMIZED */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[40] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 shadow-lg pb-safe">
        <div className="grid grid-cols-5 h-16 px-1">
          {mainNavItems.map((item) => {
            const active = isActive(item.url);
            return (
              <Link
                 key={item.title}
                 to={item.url}
                 className={`flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200 rounded-lg active:scale-95 ${
                   active 
                     ? 'text-[#507DB4] dark:text-[#6B9DD8]' 
                     : 'text-slate-600 dark:text-slate-400'
                 }`}
               >
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} strokeWidth={active ? 2.5 : 2} />
                  {item.badge && (
                    <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] bg-red-600 text-white border-0 flex items-center justify-center font-bold shadow-md">
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#507DB4] dark:bg-[#6B9DD8]" />
                  )}
                </div>
                <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'} truncate max-w-full text-center leading-tight`}>
                  {item.title}
                </span>
              </Link>
            );
          })}

          {/* Sync indicator - only when syncing */}
          {pendingCount > 0 && (
            <div className="flex flex-col items-center justify-center gap-0.5 relative">
              <div className="relative">
                <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" strokeWidth={2.5} />
                <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] bg-blue-600 text-white border-0 flex items-center justify-center font-bold shadow-md">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </Badge>
              </div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate max-w-full text-center leading-tight">
                Sync
              </span>
            </div>
          )}

          {/* More Menu */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0.5 text-slate-600 dark:text-slate-400 rounded-lg active:scale-95 transition-all duration-200">
                <Menu className="w-5 h-5" strokeWidth={2} />
                <span className="text-[10px] font-medium truncate max-w-full text-center leading-tight">More</span>
              </button>
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
      </div>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="md:hidden h-16" />
    </>
  );
});

export default BottomNav;