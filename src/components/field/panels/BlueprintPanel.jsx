import React from 'react';
import FieldPlansView from '../FieldPlansView.jsx';

export default function BlueprintPanel({ job, plans, tasks }) {
  return (
    <FieldPlansView 
      jobId={job.id} 
      plans={plans} 
      tasks={tasks}
    />
  );
}