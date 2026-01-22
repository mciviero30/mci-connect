import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trash2, AlertCircle, Clock, CheckCircle } from 'lucide-react';

/**
 * INTERNAL TOOL: Queue diagnostics (dev/admin only)
 * Not for regular users - shows queue internals
 */
export default function OfflineQueueDebugger() {
  const [queue, setQueue] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const loadQueue = () => {
      try {
        const q = JSON.parse(localStorage.getItem('offline_mutation_queue') || '[]');
        setQueue(q);
      } catch (e) {
        setQueue([]);
      }
    };

    loadQueue();
    const interval = setInterval(loadQueue, 2000);
    return () => clearInterval(interval);
  }, []);

  const retryAll = () => {
    const updated = queue.map(op => ({
      ...op,
      status: 'pending',
      retryCount: 0,
      lastRetryAt: null
    }));
    localStorage.setItem('offline_mutation_queue', JSON.stringify(updated));
    setQueue(updated);
  };

  const clearCompleted = () => {
    const filtered = queue.filter(op => op.status !== 'completed');
    localStorage.setItem('offline_mutation_queue', JSON.stringify(filtered));
    setQueue(filtered);
  };

  const clearAll = () => {
    if (confirm('Clear ALL queue items? This cannot be undone.')) {
      localStorage.setItem('offline_mutation_queue', '[]');
      setQueue([]);
    }
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3 text-amber-600" />;
      case 'pending_retry': return <RefreshCw className="w-3 h-3 text-orange-600" />;
      case 'failed_permanent': return <AlertCircle className="w-3 h-3 text-red-600" />;
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-600" />;
      default: return <Clock className="w-3 h-3 text-slate-400" />;
    }
  };

  if (queue.length === 0) return null;

  return (
    <Card className="fixed bottom-24 right-4 w-96 z-50 shadow-2xl">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Offline Queue ({queue.length})</span>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-xs">
              {queue.filter(q => q.status === 'pending').length} pending
            </Badge>
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
              {queue.filter(q => q.status === 'failed_permanent').length} failed
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 space-y-2">
          <div className="max-h-64 overflow-y-auto space-y-2">
            {queue.map((item, idx) => (
              <div key={item.queueId} className="text-xs p-2 bg-slate-50 rounded border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-slate-600">{item.entity}</span>
                  <div className="flex items-center gap-1">
                    {statusIcon(item.status)}
                    <Badge variant="outline" className="text-xs">
                      {item.operation}
                    </Badge>
                  </div>
                </div>
                {item.retryCount > 0 && (
                  <p className="text-xs text-orange-600">
                    Retries: {item.retryCount}/{item.maxRetries || 5}
                  </p>
                )}
                {item.lastError && (
                  <p className="text-xs text-red-600 truncate">
                    {item.lastError}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={retryAll}
              className="flex-1 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry All
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={clearCompleted}
              className="flex-1 text-xs"
            >
              Clear Done
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={clearAll}
              className="text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}