import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ClockInTestSuite from '@/components/testing/ClockInTestSuite';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';

export default function ClockInTests() {
  const { data: user } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me()
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading user...</p>
      </div>
    );
  }

  return <ClockInTestSuite user={user} />;
}