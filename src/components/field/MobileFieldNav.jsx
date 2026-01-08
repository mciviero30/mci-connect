import React from 'react';
import { 
  LayoutDashboard, Map, CheckSquare, Camera, FileText, 
  MessageSquare, Users, BarChart3, Flag, ClipboardCheck, 
  CheckCircle2, Activity, Brain, Menu, X, ClipboardList, MapPin, Mic, Ruler
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'plans', label: 'Plans', icon: Map },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'dimensions', label: 'Dimensions', icon: Ruler },
  { id: 'milestones', label: 'Milestones', icon: Flag },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'voice', label: 'Voice Notes', icon: Mic },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle2 },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'members', label: 'Team', icon: Users },
  { id: 'forms', label: 'Forms', icon: ClipboardList },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Brain, badge: '✨' },
];

// Quick action items for bottom nav
const quickNavItems = [
  { id: 'overview', label: 'Home', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'dimensions', label: 'Dimensions', icon: Ruler },
  { id: 'photos', label: 'Photos', icon: Camera },
];

export function MobileBottomNav({ activeTab, onTabChange, taskCount, planCount }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-slate-800 border-t-2 border-slate-700 px-2 py-3 z-50 md:hidden safe-area-bottom shadow-2xl">
      {/* CRITICAL: Clear active state, generous touch targets (72x64px), haptic feedback */}
      <div className="flex justify-around items-center">
        {quickNavItems.map((item) => {
          const isActive = activeTab === item.id;
          const count = item.id === 'tasks' ? taskCount : item.id === 'plans' ? planCount : null;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                onTabChange(item.id);
              }}
              className={`flex flex-col items-center py-3 px-3 rounded-xl transition-all min-w-[72px] min-h-[64px] touch-manipulation active:scale-95 ${
                isActive 
                  ? 'text-[#FFB800] bg-orange-500/20 shadow-lg' 
                  : 'text-slate-400 active:bg-slate-800'
              }`}
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                minHeight: '64px',  // Exceeds 44px
              }}
              aria-label={`${item.label}${isActive ? ' (active)' : ''}`}
            >
              <div className="relative">
                <item.icon className={`w-7 h-7 ${isActive ? 'scale-110' : ''} transition-transform`} strokeWidth={isActive ? 2.5 : 2} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-gradient-to-r from-orange-600 to-yellow-500 text-white text-[10px] min-w-[20px] h-5 rounded-full flex items-center justify-center font-bold shadow-md px-1">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1.5 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </button>
          );
        })}
        <MobileMenuSheet 
          activeTab={activeTab} 
          onTabChange={onTabChange} 
          taskCount={taskCount}
          planCount={planCount}
        />
      </div>
    </div>
  );
}

export function MobileMenuSheet({ activeTab, onTabChange, taskCount, planCount }) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (id) => {
    if (navigator.vibrate) navigator.vibrate(10);
    onTabChange(id);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button 
          className="flex flex-col items-center py-3 px-3 rounded-xl text-slate-400 active:bg-slate-800 min-w-[72px] min-h-[64px] touch-manipulation active:scale-95 transition-all"
          style={{ 
            WebkitTapHighlightColor: 'transparent',
            minHeight: '64px',
          }}
          aria-label="More panels"
        >
          <Menu className="w-6 h-6" />
          <span className="text-[11px] mt-1.5 font-medium">More</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] bg-slate-900 border-slate-700 rounded-t-2xl">
        <div className="py-4">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-lg font-semibold text-white">All Panels</h3>
            <button 
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          {/* CRITICAL: 56px touch targets, clear active state, organized grid */}
          <div className="grid grid-cols-3 gap-3">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const count = item.id === 'tasks' ? taskCount : item.id === 'plans' ? planCount : null;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`flex flex-col items-center p-4 rounded-xl transition-all min-h-[72px] touch-manipulation active:scale-95 ${
                    isActive 
                      ? 'bg-gradient-to-br from-orange-600 to-yellow-500 text-white shadow-lg' 
                      : 'bg-slate-800 text-slate-400 active:bg-slate-700'
                  }`}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    minHeight: '72px',  // Glove-safe
                  }}
                  aria-label={`${item.label}${isActive ? ' (active)' : ''}`}
                >
                  <div className="relative">
                    <item.icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
                    {count > 0 && (
                      <span className="absolute -top-1 -right-2 bg-white text-slate-900 text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold shadow-md">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'} text-center leading-tight`}>
                    {item.label}
                  </span>
                  {item.badge && <span className="text-xs mt-0.5">{item.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function MobileHeader({ job, onBack }) {
  return (
    <div className="md:hidden bg-gradient-to-br from-slate-900 to-black border-b border-slate-700 px-3 py-3 sticky top-0 z-40 shadow-lg">
      {/* DEPRECATED: Replaced by FieldContextBar */}
      {/* Header kept for legacy compatibility but hidden when FieldContextBar present */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-white text-base leading-tight mb-1">
            {job?.name || job?.job_name_field || 'Project'}
          </h1>
          <Badge className={`text-xs px-2.5 py-1 font-bold ${
            job?.status === 'active' 
              ? 'bg-green-500/20 text-green-400 border-green-500/40'
              : job?.status === 'completed'
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
              : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
          }`}>
            {job?.status === 'active' ? '🟢 Active' : 
             job?.status === 'completed' ? '✅ Completed' : 
             job?.status}
          </Badge>
        </div>
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/5dcd95f71_Screenshot2025-12-01at21824PM.png"
          alt="MCI Field"
          className="w-8 h-8 object-contain"
        />
      </div>
    </div>
  );
}