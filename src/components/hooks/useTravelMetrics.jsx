import { useState } from 'react';
import { calculateTravelMetrics } from '@/functions/calculateTravelMetrics';

export const useTravelMetrics = () => {
  const [travelMetrics, setTravelMetrics] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  const calculateMetrics = async (selectedTeamIds, jobAddress) => {
    if (!jobAddress || selectedTeamIds.length === 0) {
      setError('Please select teams and enter job address');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const response = await calculateTravelMetrics({
        team_ids: selectedTeamIds,
        job_address: jobAddress,
      });

      if (response.data?.error) {
        setError(response.data.error);
        setTravelMetrics([]);
      } else {
        setTravelMetrics(response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to calculate travel metrics');
      setTravelMetrics([]);
    } finally {
      setIsCalculating(false);
    }
  };

  const resetMetrics = () => {
    setTravelMetrics([]);
    setError(null);
  };

  return {
    travelMetrics,
    isCalculating,
    error,
    calculateMetrics,
    resetMetrics,
  };
};