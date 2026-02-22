import React from 'react';
import { motion } from 'framer-motion';
import FocusModeIndicator from '@/components/shared/FocusModeIndicator';
import AIAssistant from '@/components/ai/AIAssistant';
import EnhancedOfflineSync from '@/components/offline/EnhancedOfflineSync';
import BottomNav from '@/components/navigation/BottomNav';
import GlobalSearch from '@/components/search/GlobalSearch';
import KeyboardShortcuts from '@/components/navigation/KeyboardShortcuts';

export function LayoutMainContent({
  children,
  currentPageName,
  isFocusMode,
  isFieldMode,
  toggleFocusMode,
  shouldHideSidebar,
  user,
  pendingExpenses,
  navigation,
  globalSearchOpen,
  setGlobalSearchOpen
}) {
  return (
    <main className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden ${shouldHideSidebar ? 'w-full' : ''}`}>
      {isFocusMode && !isFieldMode && (
        <FocusModeIndicator isActive={true} onExit={toggleFocusMode} />
      )}

      <div 
        data-main-content 
        className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F1F5F9] dark:bg-[#181818]" 
        style={{ 
          WebkitOverflowScrolling: 'touch', 
          touchAction: 'auto',
          overscrollBehavior: 'auto'
        }}
      >
        <div className="min-h-full w-full max-w-screen-2xl mx-auto px-safe md:p-0 p-0 pb-20 md:pb-0">
          {children}
        </div>
      </div>

      <AIAssistant currentPage={currentPageName} />
      <EnhancedOfflineSync />

      {!shouldHideSidebar && (
        <BottomNav user={user} pendingExpenses={pendingExpenses} navigation={navigation} />
      )}

      <GlobalSearch open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />
      <KeyboardShortcuts onOpenGlobalSearch={() => setGlobalSearchOpen(true)} />
    </main>
  );
}