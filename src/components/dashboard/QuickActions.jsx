import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Clock, MapPin, ShieldCheck, QrCode } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { motion } from 'framer-motion';

export default function QuickActions({ user, certifications = [] }) {
  const { t } = useLanguage();

  const quickActions = [
    {
      title: 'Clock-In / Out',
      subtitle: 'Track your work hours',
      icon: Clock,
      url: createPageUrl('TimeTracking'),
      gradient: 'soft-blue-gradient',
      delay: 0.1
    },
    {
      title: 'My Field',
      subtitle: 'Active jobs & field work',
      icon: MapPin,
      url: createPageUrl('Field'),
      gradient: 'soft-green-gradient',
      delay: 0.2
    },
    {
      title: 'My QR Pass',
      subtitle: 'Digital credentials & certifications',
      icon: ShieldCheck,
      url: createPageUrl('MyProfile'),
      gradient: 'soft-amber-gradient',
      delay: 0.3
    }
  ];

  // Calculate certifications status
  const activeCerts = certifications.filter(c => c.status === 'active').length;
  const expiringSoon = certifications.filter(c => c.status === 'expiring_soon').length;
  const expired = certifications.filter(c => c.status === 'expired').length;

  return (
    <div className="space-y-6">
      {/* Quick Actions Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Quick Actions</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Fast access to your most used features</p>
      </motion.div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action, idx) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: action.delay }}
          >
            <Link to={action.url}>
              <Card className={`${action.gradient} border-2 p-6 hover:scale-105 transition-all duration-300 shadow-lg cursor-pointer group`}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <action.icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">{action.title}</h3>
                    <p className="text-xs opacity-80">{action.subtitle}</p>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Certifications Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Link to={createPageUrl('MyProfile')}>
          <Card className="border-2 border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <QrCode className="w-10 h-10 text-slate-700 dark:text-slate-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Certifications & QR Pass</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {user?.full_name} • Digital Credentials
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Scan QR code to verify credentials
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {activeCerts > 0 && (
                      <Badge className="badge-soft-green text-xs">
                        {activeCerts} Active
                      </Badge>
                    )}
                    {expiringSoon > 0 && (
                      <Badge className="badge-soft-amber text-xs">
                        {expiringSoon} Expiring Soon
                      </Badge>
                    )}
                    {expired > 0 && (
                      <Badge className="badge-soft-red text-xs">
                        {expired} Expired
                      </Badge>
                    )}
                    {certifications.length === 0 && (
                      <Badge className="badge-soft-slate text-xs">
                        No certifications yet
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>
    </div>
  );
}