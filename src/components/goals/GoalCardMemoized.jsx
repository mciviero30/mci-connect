import React from 'react';
import GoalCard from './GoalCard';

const GoalCardMemoized = React.memo(GoalCard, (prevProps, nextProps) => {
  return (
    prevProps.goal.id === nextProps.goal.id &&
    prevProps.goal.current_value === nextProps.goal.current_value &&
    prevProps.goal.status === nextProps.goal.status &&
    prevProps.goal.target_value === nextProps.goal.target_value
  );
});

GoalCardMemoized.displayName = 'GoalCardMemoized';

export default GoalCardMemoized;