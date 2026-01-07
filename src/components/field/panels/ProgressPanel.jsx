import React from 'react';
import FieldProjectOverview from '../FieldProjectOverview.jsx';

export default function ProgressPanel({ job, tasks, plans, onOpenDailyReport }) {
  return (
    <FieldProjectOverview 
      job={job} 
      tasks={tasks} 
      plans={plans}
      onOpenDailyReport={onOpenDailyReport}
    />
  );
}