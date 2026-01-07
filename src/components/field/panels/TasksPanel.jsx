import React from 'react';
import FieldTasksView from '../FieldTasksView.jsx';

export default function TasksPanel({ job, tasks, plans }) {
  return (
    <FieldTasksView 
      jobId={job.id} 
      tasks={tasks} 
      plans={plans}
    />
  );
}