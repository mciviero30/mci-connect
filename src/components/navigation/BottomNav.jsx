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
      {/* Bottom Navigation Bar - Fixed at bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg pb-safe">
        <div className="grid grid-cols-5 h-14 px-0.5">
          {mainNavItems.map((item) => {
            const active = isActive(item.url);
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex flex-col items-center justify-center gap-0.5 relative transition-all min-w-0 ${
                  active 
                    ? 'text-[#507DB4] dark:text-[#6B9DD8]' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] rounded-b-full" />
                )}
                <div className="relative">
                  <item.icon className={`w-4.5 h-4.5 ${active ? 'scale-110' : ''} transition-transform`} />
                  {item.badge && (
                    <Badge className="absolute -top-1 -right-1 h-3 min-w-3 px-0.5 text-[8px] bg-red-500 text-white border-0 flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className={`text-[8.5px] font-medium ${active ? 'font-bold' : ''} truncate max-w-full px-0.5 text-center`}>
                  {item.title}
                </span>
              </Link>
            );
          })}

          {/* More Menu */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0.5 text-slate-500 dark:text-slate-400 min-w-0">
                <Menu className="w-4.5 h-4.5" />
                <span className="text-[8.5px] font-medium truncate max-w-full px-0.5">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-white dark:bg-slate-900 h-[85vh] rounded-t-2xl">
              <SheetHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                <SheetTitle className="text-slate-900 dark:text-white text-base">All Sections</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(85vh-70px)] mt-3">
                <div className="space-y-4 pb-6">
                  {navigation.map((section, idx) => (
                    <div key={idx}>
                      <div className="flex items-center gap-1.5 mb-2 px-3">
                        {section.icon && <section.icon className="w-3 h-3 text-[#507DB4] dark:text-[#6B9DD8]" />}
                        <h3 className="text-[10px] font-bold text-[#507DB4] dark:text-[#6B9DD8] tracking-wider uppercase">
                          {section.section}
                        </h3>
                      </div>
                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          const active = isActive(item.url);
                          return (
                            <Link
                              key={item.title}
                              to={item.url}
                              onClick={() => setSheetOpen(false)}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-lg mx-2 transition-all ${
                                active
                                  ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <item.icon className="w-4 h-4" />
                                <span className="font-medium text-sm">{item.title}</span>
                              </div>
                              {active && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
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
      <div className="md:hidden h-14" />
    </>
  );
};

export default BottomNav;