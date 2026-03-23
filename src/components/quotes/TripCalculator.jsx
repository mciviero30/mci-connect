import React, { useState, useEffect } from 'react';
import UnifiedOutOfAreaCalculator from './UnifiedOutOfAreaCalculator';

// TripCalculator is a thin wrapper around UnifiedOutOfAreaCalculator
// that manages internal state for techCount, roomsPerNight, and stayConfig
export default function TripCalculator({ jobAddress, selectedTeamIds, onAddAllItems, totalLaborHours }) {
  const [techCount, setTechCount] = useState(2);
  const [roomsPerNight, setRoomsPerNight] = useState(1);
  const [stayConfig, setStayConfig] = useState({ roundTrips: 1, daysPerTrip: 2, nightsPerTrip: 2 });

  useEffect(() => {
    setRoomsPerNight(Math.ceil(techCount / 2));
  }, [techCount]);

  // Build a minimal derivedValues shape if totalLaborHours is provided
  const derivedValues = totalLaborHours > 0 ? { totalLaborHours } : null;

  return (
    <UnifiedOutOfAreaCalculator
      jobAddress={jobAddress}
      selectedTeamIds={selectedTeamIds}
      onAddAllItems={onAddAllItems}
      derivedValues={derivedValues}
      techCount={techCount}
      onTechCountChange={setTechCount}
      roomsPerNight={roomsPerNight}
      onRoomsPerNightChange={setRoomsPerNight}
      onStayConfigChange={setStayConfig}
    />
  );
}