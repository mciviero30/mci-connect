import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ConflictBadge({ onClick }) {
  return (
    <Badge 
      onClick={onClick}
      className="bg-red-500/10 text-red-600 border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors"
    >
      <AlertTriangle className="w-3 h-3 mr-1" />
      Conflict
    </Badge>
  );
}