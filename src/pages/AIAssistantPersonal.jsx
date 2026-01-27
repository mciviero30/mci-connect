import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, FileText, Database } from 'lucide-react';

export default function AIAssistantPersonal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-blue-600" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                AI Assistant features coming soon...
              </p>
              
              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Job SSOT Documentation
                </h3>
                <div className="grid gap-3">
                  <a 
                    href="/components/docs/JOB_SSOT_COMPLETE_DISCOVERY.md" 
                    target="_blank"
                    className="block"
                  >
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <Database className="w-4 h-4 text-purple-600" />
                      <div className="text-left">
                        <div className="font-semibold">Job SSOT Discovery Report</div>
                        <div className="text-xs text-slate-500">Complete structural analysis</div>
                      </div>
                    </Button>
                  </a>
                  
                  <a 
                    href="/components/docs/JOB_SSOT_BACKFILL_STRATEGY.md" 
                    target="_blank"
                    className="block"
                  >
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <Database className="w-4 h-4 text-emerald-600" />
                      <div className="text-left">
                        <div className="font-semibold">Job SSOT Backfill Strategy</div>
                        <div className="text-xs text-slate-500">5-phase implementation plan</div>
                      </div>
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}