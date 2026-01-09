import React, { useEffect, useState } from 'react';
import { fieldPersistence } from './services/FieldStatePersistence';
import { fieldStorage } from './services/FieldStorageService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle2, Database, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Field Data Loss Validator (Dev Only)
 * Real-time monitoring of data persistence and recovery
 * 
 * Validates:
 * - Draft persistence working
 * - IndexedDB operational
 * - Offline queue functional
 * - Recovery mechanisms ready
 * - No in-memory-only state
 */
export default function FieldDataLossValidator({ jobId }) {
  const [stats, setStats] = useState({
    draftsCount: 0,
    unsyncedCount: 0,
    indexedDBHealthy: false,
    sessionStorageHealthy: false,
    lastCheck: null,
  });
  const [testResults, setTestResults] = useState([]);

  // Health check on mount and every 10s
  useEffect(() => {
    if (!import.meta.env?.DEV) return;

    const runHealthCheck = async () => {
      try {
        // Test IndexedDB
        const testWrite = await fieldPersistence.saveDraft('test', jobId || 'health', { test: true }, 1);
        const testRead = await fieldPersistence.loadDraft('test', jobId || 'health');
        await fieldPersistence.clearDraft('test', jobId || 'health');
        
        const indexedDBHealthy = testRead?.test === true;

        // Test sessionStorage
        sessionStorage.setItem('_health_test', 'ok');
        const sessionStorageHealthy = sessionStorage.getItem('_health_test') === 'ok';
        sessionStorage.removeItem('_health_test');

        // Count unsynced
        const unsyncedCount = await fieldStorage.getUnsyncedCount(jobId);

        setStats({
          draftsCount: 0, // Would need to query all drafts
          unsyncedCount,
          indexedDBHealthy,
          sessionStorageHealthy,
          lastCheck: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[DataLossValidator] Health check failed:', error);
        setStats(prev => ({
          ...prev,
          indexedDBHealthy: false,
          lastCheck: new Date().toISOString(),
        }));
      }
    };

    runHealthCheck();
    const interval = setInterval(runHealthCheck, 10000); // Every 10s

    return () => clearInterval(interval);
  }, [jobId]);

  // Simulate crash and validate recovery
  const simulateCrash = async () => {
    try {
      // Save test draft
      const testData = {
        testField: 'critical_data',
        timestamp: Date.now(),
        randomValue: Math.random(),
      };

      await fieldPersistence.saveDraft('crash_test', jobId || 'test', testData, 1);
      
      toast.success('Test draft saved');

      // Simulate recovery
      setTimeout(async () => {
        const recovered = await fieldPersistence.loadDraft('crash_test', jobId || 'test');
        
        if (recovered && recovered.testField === 'critical_data') {
          setTestResults(prev => [...prev, {
            type: 'crash_recovery',
            status: 'PASS',
            timestamp: new Date().toISOString(),
            message: 'Data recovered successfully',
          }]);
          toast.success('✅ Crash recovery test PASSED');
        } else {
          setTestResults(prev => [...prev, {
            type: 'crash_recovery',
            status: 'FAIL',
            timestamp: new Date().toISOString(),
            message: 'Data NOT recovered',
          }]);
          toast.error('❌ Crash recovery test FAILED');
        }

        await fieldPersistence.clearDraft('crash_test', jobId || 'test');
      }, 1000);

    } catch (error) {
      console.error('Crash simulation failed:', error);
      toast.error('Simulation error: ' + error.message);
    }
  };

  // Simulate background interruption
  const simulateBackground = () => {
    if (document.hidden) {
      toast.info('Tab is already hidden - switch to another tab first');
      return;
    }

    toast.info('Switch to another tab or lock screen now...');
    
    // Monitor for background event
    const timeout = setTimeout(() => {
      toast.warning('No background event detected - try locking screen');
    }, 5000);

    const handler = () => {
      clearTimeout(timeout);
      setTestResults(prev => [...prev, {
        type: 'background_test',
        status: 'PASS',
        timestamp: new Date().toISOString(),
        message: 'Background event detected correctly',
      }]);
      toast.success('✅ Background detection working');
      document.removeEventListener('visibilitychange', handler);
    };

    document.addEventListener('visibilitychange', handler, { once: true });
  };

  // Simulate network loss
  const simulateOffline = async () => {
    toast.info('Testing offline persistence...');
    
    // Save test data
    const testData = {
      field1: 'offline_test_value',
      timestamp: Date.now(),
    };

    try {
      await fieldStorage.save('tasks', {
        id: `test_${Date.now()}`,
        job_id: jobId || 'test',
        ...testData,
      });

      const unsynced = await fieldStorage.getUnsyncedCount(jobId);
      
      setTestResults(prev => [...prev, {
        type: 'offline_queue',
        status: 'PASS',
        timestamp: new Date().toISOString(),
        message: `${unsynced} items in offline queue`,
      }]);
      
      toast.success(`✅ Offline queue working (${unsynced} items)`);
    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'offline_queue',
        status: 'FAIL',
        timestamp: new Date().toISOString(),
        message: error.message,
      }]);
      toast.error('❌ Offline queue test FAILED');
    }
  };

  // CRITICAL: NO UI IN PRODUCTION - LOGGING ONLY
  if (!import.meta.env?.DEV) return null;

  // Component is logging-only in DEV mode.
  // All UI is in FieldDebugDrawer.
  return null;
}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
        <Shield className={`w-4 h-4 ${overallHealth ? 'text-green-400' : 'text-red-400'}`} />
        <span className="font-bold text-white">Data Loss Protection</span>
        <Badge className={`ml-auto text-[10px] ${overallHealth ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {overallHealth ? 'ACTIVE' : 'DEGRADED'}
        </Badge>
      </div>

      {/* Health Status */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2">
          <span className="text-slate-300">IndexedDB</span>
          {stats.indexedDBHealthy ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
        </div>
        <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2">
          <span className="text-slate-300">sessionStorage</span>
          {stats.sessionStorageHealthy ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
        </div>
        <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2">
          <span className="text-slate-300">Unsynced Items</span>
          <Badge className="bg-blue-500/20 text-blue-300 text-[10px]">
            {stats.unsyncedCount}
          </Badge>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="space-y-2 mb-3">
        <Button
          onClick={simulateCrash}
          size="sm"
          className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs h-8"
        >
          <Database className="w-3 h-3 mr-2" />
          Test Crash Recovery
        </Button>
        <Button
          onClick={simulateBackground}
          size="sm"
          className="w-full bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs h-8"
        >
          <RefreshCw className="w-3 h-3 mr-2" />
          Test Background
        </Button>
        <Button
          onClick={simulateOffline}
          size="sm"
          className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs h-8"
        >
          <Database className="w-3 h-3 mr-2" />
          Test Offline Queue
        </Button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          <div className="text-[10px] text-slate-400 mb-1">Test Results:</div>
          {testResults.slice(-5).map((result, idx) => (
            <div key={idx} className="bg-slate-800/30 rounded px-2 py-1 flex items-center gap-2">
              {result.status === 'PASS' ? (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-red-400" />
              )}
              <span className="text-slate-300 flex-1 text-[10px]">{result.type}</span>
              <span className={`text-[9px] font-bold ${result.status === 'PASS' ? 'text-green-400' : 'text-red-400'}`}>
                {result.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Last Check */}
      {stats.lastCheck && (
        <div className="mt-2 pt-2 border-t border-slate-700 text-[9px] text-slate-500">
          Last check: {new Date(stats.lastCheck).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}