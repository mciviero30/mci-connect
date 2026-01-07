import React from 'react';
import { CloudOff, CheckCircle } from 'lucide-react';

export default function LocalSyncIndicator({ isPending }) {
  if (!isPending) return null;

  return (
    <div className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
      <CloudOff className="w-3 h-3" />
      <span>Syncing...</span>
    </div>
  );
}