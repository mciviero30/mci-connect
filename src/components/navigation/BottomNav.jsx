import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard,
  Briefcase,
  Clock,
  Receipt,
  Users,
  Menu
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

const BottomNav = ({ user, pendingExpenses, navigation }) => {
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Main navigation items for bottom bar
  const mainNavItems = [
    { 
      title: 'Dashboard', 
      url: createPageUrl("Dashboard"), 
      icon: LayoutDashboard,
      color: 'from-[#507DB4] to-[#6B9DD8]'
    },
    { 
      title: 'Jobs', 
      url: createPageUrl("Trabajos"), 
      icon: Briefcase,
      color: 'from-indigo-500 to-indigo-600'
    },
    { 
      title: 'Time', 
      url: createPageUrl("TimeTracking"), 
      icon: Clock,
      color: 'from-green-500 to-green-600'
    },
    { 
      title: 'Expenses', 
      url: createPageUrl("Gastos"), 
      icon: Receipt,
      badge: pendingExpenses > 0 ? pendingExpenses : null,
      color: 'from-amber-500 to-amber-600'
    },
  ];

  // Check if current page is active
  const isActive = (url) => location.pathname === url;

  return (
    <>
      {/* Bottom Navigation Bar - Fixed at bottom - FIELD OPTIMIZED */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[40] bg-white dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 shadow-2xl pb-safe">
        <div className="grid grid-cols-5 h-20 px-2">
          {mainNavItems.map((item) => {
            const active = isActive(item.url);
            return (
              <Link
                 key={item.title}
                 to={item.url}
                 className={`flex flex-col items-center justify-center gap-1 relative transition-all duration-150 min-h-[60px] min-w-[60px] rounded-xl active:scale-90 active:bg-blue-100/50 dark:active:bg-slate-800 ${
                   active 
                     ? 'text-[#507DB4] dark:text-[#6B9DD8] bg-blue-50/80 dark:bg-blue-900/30' 
                     : 'text-slate-700 dark:text-slate-400'
                 }`}
                 style={{ 
                   WebkitTapHighlightColor: 'transparent',
                   WebkitTouchCallout: 'none'
                 }}
               >
                <div className="relative">
                  <item.icon className={`w-6 h-6 ${active ? 'scale-110' : ''} transition-transform`} strokeWidth={active ? 2.5 : 2} />
                  {item.badge && (
                    <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1 text-[10px] bg-red-600 text-white border-0 flex items-center justify-center font-bold shadow-md">
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className={`text-[11px] ${active ? 'font-bold' : 'font-semibold'} truncate max-w-full px-1 text-center`}>
                  {item.title}
                </span>
              </Link>
            );
          })}

          {/* More Menu */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 text-slate-700 dark:text-slate-400 min-h-[60px] min-w-[60px] rounded-xl active:scale-90 active:bg-slate-100/50 dark:active:bg-slate-800 transition-all duration-150" style={{ 
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none'
              }}>
                <Menu className="w-6 h-6" strokeWidth={2} />
                <span className="text-[11px] font-semibold truncate max-w-full px-1">More</span>
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
                              className={`flex items-center justify-between px-4 py-4 rounded-xl mx-2 transition-all min-h-[56px] active:scale-95 ${
                                active
                                  ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-200'
                              }`}
                              style={{ WebkitTapHighlightColor: 'transparent' }}
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
      <div className="md:hidden h-20" />
    </>
  );
};

export default BottomNav;