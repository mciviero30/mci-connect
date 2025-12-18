import React from 'react';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-red-900/10 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800/50 border-2 border-red-200 dark:border-red-500/30 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/30">
            <ShieldAlert className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Access Denied
          </h1>
          
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You don't have permission to access this project. Please contact your administrator if you believe this is an error.
          </p>
          
          <Link to={createPageUrl('Field')}>
            <Button className="soft-blue-gradient text-white shadow-lg w-full">
              <Home className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}