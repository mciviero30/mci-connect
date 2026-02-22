import React from 'react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { Settings, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { clearAllFieldData } from '@/components/field/services/FieldCleanupService';
import SidebarNavigation from './SidebarNavigation';
import LanguageThemeSelector from './LanguageThemeSelector';

export function LayoutSidebar({
  navigation,
  location,
  pendingExpenses,
  sidebarContentRef,
  user,
  theme,
  setTheme,
  language,
  changeLanguage,
  profileImage,
  imageKey
}) {
  if (!navigation) return null;

  return (
    <Sidebar className="border-r border-[#E0E7FF] dark:border-slate-800 shadow-lg bg-gradient-to-b from-[#F0F4FF] to-[#EBF2FF] dark:from-slate-900 dark:to-slate-900/50 [&_[data-sidebar=close-button]]:w-10 [&_[data-sidebar=close-button]]:h-10 [&_[data-sidebar=close-button]]:rounded-full [&_[data-sidebar=close-button]]:bg-white [&_[data-sidebar=close-button]]:dark:bg-slate-800 [&_[data-sidebar=close-button]]:shadow-md [&_[data-sidebar=close-button]]:border [&_[data-sidebar=close-button]]:border-slate-200 [&_[data-sidebar=close-button]]:dark:border-slate-700 [&_[data-sidebar=close-button]]:hover:bg-red-50 [&_[data-sidebar=close-button]]:dark:hover:bg-red-900/20 [&_[data-sidebar=close-button]]:hover:border-red-300 [&_[data-sidebar=close-button]]:dark:hover:border-red-700 [&_[data-sidebar=close-button]]:transition-all [&_[data-sidebar=close-button]_svg]:text-slate-600 [&_[data-sidebar=close-button]_svg]:dark:text-slate-400 [&_[data-sidebar=close-button]_svg]:hover:text-red-600 [&_[data-sidebar=close-button]_svg]:dark:hover:text-red-400">
      <SidebarHeader className="px-0 py-0 flex-shrink-0 overflow-hidden h-auto bg-transparent">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/2372f6478_Screenshot2025-12-24at13539AM.png"
          alt="MCI Connect"
          className="w-full h-full object-contain"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </SidebarHeader>

      <SidebarContent 
        ref={sidebarContentRef} 
        data-sidebar-scroll="true"
      >
        <SidebarNavigation 
          navigation={navigation} 
          location={location} 
          pendingExpenses={pendingExpenses} 
          sidebarContentRef={sidebarContentRef} 
        />
      </SidebarContent>

      <SidebarFooter className="p-4 flex-shrink-0 border-t border-[#E0E7FF] dark:border-slate-700/50 bg-gradient-to-br from-[#F8FAFF] to-[#F0F4FF] dark:from-slate-900 dark:to-slate-800/50">
        <LanguageThemeSelector 
          language={language}
          changeLanguage={changeLanguage}
          theme={theme}
          setTheme={setTheme}
        />

        <div className="flex items-center justify-between rounded-2xl p-3 border bg-white dark:bg-slate-800 border-[#1E3A8A]/20 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {profileImage ? (
              <img
                src={`${profileImage}?v=${imageKey}`}
                alt={user?.full_name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-[#1E3A8A]/30 shadow-md"
              />
            ) : (
              <div className="w-11 h-11 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center ring-2 ring-[#507DB4]/30 shadow-md">
                <span className="text-white font-bold text-base">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate text-slate-900 dark:text-slate-100">
                {user?.full_name || user?.email || 'User'}
              </p>
              <p className="text-xs truncate text-[#507DB4] dark:text-[#6B9DD8] font-medium">
                {user?.position || (user?.role === 'admin' ? 'Admin' : 'User')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link to={createPageUrl("Configuracion")} className="p-2 rounded-xl transition-all hover:bg-[#EBF2FF] dark:hover:bg-slate-700/50 hover:scale-110" title="Settings">
              <Settings className="w-4 h-4 text-[#507DB4] dark:text-[#6B9DD8]" />
            </Link>
            <button
              onClick={async () => {
                await clearAllFieldData();
                base44.auth.logout();
              }}
              className="p-2 rounded-xl transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-110"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}