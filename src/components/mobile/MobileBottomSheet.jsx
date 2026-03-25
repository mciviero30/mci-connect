import React from 'react';
import { Drawer } from 'vaul';

/**
 * MobileBottomSheet — replaces dropdown menus on mobile with a native-feel bottom sheet.
 * Uses vaul (already installed) under the hood.
 *
 * Usage:
 *   <MobileBottomSheet trigger={<Button>Open</Button>} title="Options">
 *     <div>...content...</div>
 *   </MobileBottomSheet>
 */
export default function MobileBottomSheet({
  trigger,
  title,
  children,
  snapPoints = [0.5, 1],
  defaultSnap = 0.5,
  open,
  onOpenChange,
}) {
  return (
    <Drawer.Root
      snapPoints={snapPoints}
      defaultSnapPoint={defaultSnap}
      open={open}
      onOpenChange={onOpenChange}
    >
      {trigger && (
        <Drawer.Trigger asChild>
          {trigger}
        </Drawer.Trigger>
      )}

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 max-h-[90vh] outline-none">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>

          {/* Title */}
          {title && (
            <div className="px-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <Drawer.Title className="text-sm font-bold text-slate-900 dark:text-white text-center">
                {title}
              </Drawer.Title>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-safe">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/**
 * MobileBottomSheetItem — a styled list item for use inside MobileBottomSheet.
 */
export function MobileBottomSheetItem({ icon: Icon, label, onClick, destructive = false, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-left transition-colors active:scale-[0.98]
        ${destructive
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }
        ${disabled ? 'opacity-40 pointer-events-none' : ''}
      `}
    >
      {Icon && <Icon className="w-5 h-5 shrink-0" />}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}