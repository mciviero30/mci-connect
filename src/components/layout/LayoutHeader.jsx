import React, { useState, useEffect } from 'react';
import { Menu, Moon, Sun } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import NetworkSpeedIndicator from '@/components/mobile/NetworkSpeedIndicator';
import RecentlyViewed from '@/components/shared/RecentlyViewed';
import { Maximize2 } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';

export function LayoutHeader({ user, theme, setTheme, toggleFocusMode, isFieldMode, isFocusMode, shouldHideSidebar }) {
  if (shouldHideSidebar) return null;

  return (
    <header className="p-0 md:hidden flex-shrink-0 h-28 relative overflow-hidden bg-gradient-to-b from-[#F0F4FF] to-[#EBF2FF] dark:from-slate-900 dark:to-slate-900/50">
      <img
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/2372f6478_Screenshot2025-12-24at13539AM.png"
        alt="MCI Connect"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
        <SidebarTrigger className="p-2 rounded-lg transition-all hover:bg-white/40 dark:hover:bg-slate-800/40 flex-shrink-0 min-w-[40px] min-h-[40px]">
          <Menu className="w-5 h-5 text-[#1E3A8A]" />
        </SidebarTrigger>
        <div className="flex-shrink-0 flex items-center gap-2">
          <NetworkSpeedIndicator />
          <RecentlyViewed />
          {!isFieldMode && !isFocusMode && (
            <button
              onClick={toggleFocusMode}
              className="p-2 rounded-lg transition-all hover:bg-white/40 dark:hover:bg-slate-800/40 min-w-[40px] min-h-[40px]"
              title="Focus Mode"
            >
              <Maximize2 className="w-5 h-5 text-[#1E3A8A]" />
            </button>
          )}
          <button
            onClick={() => {
              const newTheme = theme === 'light' ? 'dark' : 'light';
              setTheme(newTheme);
              if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
              localStorage.setItem('theme', newTheme);
            }}
            className="p-2 rounded-lg transition-all hover:bg-white/40 dark:hover:bg-slate-800/40 min-w-[40px] min-h-[40px]"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-[#1E3A8A]" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
          </button>
          <NotificationBell user={user} />
        </div>
      </div>
    </header>
  );
}