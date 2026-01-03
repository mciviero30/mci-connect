import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { GraduationCap, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function TrainingModeBanner() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = React.useState(
    sessionStorage.getItem('training_banner_dismissed') === 'true'
  );

  const { data: settings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const allSettings = await base44.entities.CompanySettings.list();
      return allSettings[0] || null;
    },
    staleTime: 30000,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdminOrCEO = user?.role === 'admin' || 
                       (user?.role || '').toLowerCase() === 'ceo';

  // Don't show if not in training mode or already dismissed
  if (!settings?.training_mode || dismissed || !isAdminOrCEO) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem('training_banner_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm sm:text-base">
              Training Mode Active
            </p>
            <p className="text-xs sm:text-sm text-white/90 hidden sm:block">
              System is in training mode. All data is marked for easy cleanup.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate(createPageUrl('GoLiveChecklist'))}
            size="sm"
            className="bg-white/20 hover:bg-white/30 border border-white/30 text-white backdrop-blur-sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Go Live
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}