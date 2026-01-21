import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Activity, Trash2, Shield } from "lucide-react";
import { telemetry } from "./TelemetryService";

/**
 * Debug panel for telemetry (admin-only)
 * Shows recent errors and allows toggling telemetry
 * 
 * Usage: <TelemetryDebugPanel /> (only visible to admins)
 */
export default function TelemetryDebugPanel() {
  const [enabled, setEnabled] = useState(telemetry.enabled);
  const [recentErrors, setRecentErrors] = useState([]);

  useEffect(() => {
    // Capture console.error calls to show in debug panel
    const originalError = console.error;
    console.error = (...args) => {
      originalError(...args);
      
      // Only capture telemetry logs
      if (args[0] === '[Telemetry]') {
        setRecentErrors(prev => [
          { timestamp: new Date().toISOString(), data: args[1] },
          ...prev.slice(0, 9) // Keep last 10
        ]);
      }
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const handleToggle = (checked) => {
    setEnabled(checked);
    telemetry.setEnabled(checked);
  };

  const handleClearCache = () => {
    telemetry.clearCache();
    setRecentErrors([]);
  };

  return (
    <Card className="border-purple-200 dark:border-purple-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">Telemetry Monitor</CardTitle>
          </div>
          <Badge variant="outline" className="border-purple-300 text-purple-700">
            Admin Only
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              Telemetry Enabled
            </span>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Cache Size</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{telemetry.errorCache.size}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Recent Errors</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{recentErrors.length}</p>
          </div>
        </div>

        {/* Recent Errors */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Recent Events</h4>
            <Button onClick={handleClearCache} size="sm" variant="ghost">
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentErrors.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No errors logged</p>
            ) : (
              recentErrors.map((log, idx) => (
                <div key={idx} className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">{log.data.type}</Badge>
                    <span className="text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-red-800 dark:text-red-300 truncate">{log.data.error}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{log.data.pathname}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Telemetry logs errors to console. Future integration: Sentry, LogRocket, etc.
        </p>
      </CardContent>
    </Card>
  );
}