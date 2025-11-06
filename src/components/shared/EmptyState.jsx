import React from 'react';
import { Button } from '@/components/ui/button';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actionLabel 
}) {
  return (
    <div className="text-center py-16">
      {Icon && <Icon className="w-20 h-20 text-slate-300 mx-auto mb-4" />}
      <h3 className="text-xl font-semibold text-slate-700 mb-2">{title}</h3>
      {description && <p className="text-slate-500 mb-6 max-w-md mx-auto">{description}</p>}
      {action && actionLabel && (
        <Button onClick={action} size="lg" className="bg-blue-600 hover:bg-blue-700">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}