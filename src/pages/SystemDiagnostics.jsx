import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import { TestRunner } from '@/components/testing/TestRunner';
import { PerformanceMonitor } from '@/components/monitoring/PerformanceMonitor';
import { AccessibilityChecker } from '@/components/accessibility/AccessibilityChecker';
import { Settings, Zap, ShieldCheck } from 'lucide-react';

/**
 * System Diagnostics Dashboard
 * Tests, Performance, Accessibility monitoring
 */

export default function SystemDiagnostics() {
  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title="System Diagnostics"
          description="Automated tests, performance monitoring, and accessibility checks"
          icon={Settings}
        />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Automated Tests */}
          <div>
            <TestRunner />
          </div>

          {/* Performance Monitoring */}
          <div>
            <PerformanceMonitor />
          </div>

          {/* Accessibility Checker */}
          <div className="md:col-span-2">
            <AccessibilityChecker />
          </div>
        </div>

        {/* System Info */}
        <Card className="mt-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">System Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600 dark:text-slate-400">Platform</p>
                <p className="font-semibold text-slate-900 dark:text-white">{navigator.platform}</p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">Browser</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {navigator.userAgent.includes('Chrome') ? 'Chrome' :
                   navigator.userAgent.includes('Safari') ? 'Safari' :
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other'}
                </p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">Online</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {navigator.onLine ? '✅ Yes' : '❌ No'}
                </p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">PWA Installed</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {window.matchMedia('(display-mode: standalone)').matches ? '✅ Yes' : '❌ No'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};