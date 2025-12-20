import React from 'react';
import { 
  LayoutDashboard, Map, CheckSquare, Camera, FileText, 
  MessageSquare, Users, BarChart3, Flag, ClipboardCheck, 
  CheckCircle2, Activity, Brain, Menu, X, ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'plans', label: 'Plans', icon: Map },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'dimensions', label: 'Site Dims', icon: FileText },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'before-after', label: 'Before/After', icon: Camera },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle2 },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'members', label: 'Team', icon: Users },
  { id: 'forms', label: 'Forms', icon: ClipboardList },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'budget', label: 'Budget', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Brain, badge: '✨' },
];

// Quick action items for bottom nav
const quickNavItems = [
  { id: 'overview', label: 'Home', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'plans', label: 'Plans', icon: Map },
  { id: 'photos', label: 'Photos', icon: Camera },
];

export function MobileBottomNav({ activeTab, onTabChange, taskCount, planCount }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-2 py-1 z-50 md:hidden safe-area-bottom">
      <div className="flex justify-around items-center">
        {quickNavItems.map((item) => {
          const isActive = activeTab === item.id;
          const count = item.id === 'tasks' ? taskCount : item.id === 'plans' ? planCount : null;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all min-w-[60px] ${
                isActive 
                  ? 'text-[#FFB800]' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className="relative">
                <item.icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#FFB800] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
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
    onTabChange(id);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex flex-col items-center py-2 px-3 rounded-lg text-slate-500 dark:text-slate-400">
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1">More</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-t-2xl">
        <div className="py-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 px-2">Menu</h3>
          <div className="grid grid-cols-3 gap-3">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const count = item.id === 'tasks' ? taskCount : item.id === 'plans' ? planCount : null;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`flex flex-col items-center p-4 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="relative">
                    <item.icon className="w-6 h-6 mb-1" />
                    {count > 0 && (
                      <span className="absolute -top-1 -right-2 bg-[#FFB800] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium">{item.label}</span>
                  {item.badge && <span className="text-xs">{item.badge}</span>}
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
    <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 dark:text-slate-400">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-slate-900 dark:text-white truncate text-sm">
            {job?.name || job?.job_name_field || 'Project'}
          </h1>
          <Badge className={`text-[10px] ${
            job?.status === 'active' 
              ? 'bg-green-500/20 text-green-500 border-green-500/30'
              : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
          }`}>
            {job?.status === 'active' ? 'Active' : job?.status}
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