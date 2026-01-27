import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';

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
            <p className="text-slate-600 dark:text-slate-400">
              AI Assistant features coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}