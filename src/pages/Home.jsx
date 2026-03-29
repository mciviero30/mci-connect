import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';

export default function Home() {
  const navigate = useNavigate();
  const { data: user, isLoading } = useQuery({ queryKey: CURRENT_USER_QUERY_KEY });

  useEffect(() => {
    if (isLoading) return;
    const role = user?.role?.toLowerCase?.() || 'employee';
    if (role === 'foreman') {
      navigate('/ForemanDashboard', { replace: true });
    } else if (role === 'supervisor') {
      navigate('/SupervisorDashboard', { replace: true });
    } else {
      navigate('/Dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  return null;
}
