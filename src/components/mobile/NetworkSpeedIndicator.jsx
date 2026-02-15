import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Signal } from 'lucide-react';

/**
 * Network Speed Indicator for mobile users
 * Shows connection quality and adapts data fetching
 */
export default function NetworkSpeedIndicator() {
  const [speed, setSpeed] = useState('unknown');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const detectSpeed = () => {
      if (!navigator.onLine) {
        setSpeed('offline');
        setIsOnline(false);
        return;
      }

      setIsOnline(true);

      // Use Network Information API if available
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        
        switch (effectiveType) {
          case 'slow-2g':
          case '2g':
            setSpeed('slow');
            break;
          case '3g':
            setSpeed('medium');
            break;
          case '4g':
          case '5g':
            setSpeed('fast');
            break;
          default:
            setSpeed('unknown');
        }

        // Also consider downlink speed
        if (connection.downlink) {
          if (connection.downlink < 1) {
            setSpeed('slow');
          } else if (connection.downlink < 5) {
            setSpeed('medium');
          } else {
            setSpeed('fast');
          }
        }
      } else {
        // Fallback: Assume fast if online
        setSpeed('fast');
      }
    };

    detectSpeed();

    window.addEventListener('online', detectSpeed);
    window.addEventListener('offline', detectSpeed);

    // Re-check every 30 seconds
    const interval = setInterval(detectSpeed, 30000);

    return () => {
      window.removeEventListener('online', detectSpeed);
      window.removeEventListener('offline', detectSpeed);
      clearInterval(interval);
    };
  }, []);

  if (!isOnline) {
    return (
      <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700">
        <WifiOff className="w-3 h-3 mr-1" />
        Offline
      </Badge>
    );
  }

  if (speed === 'slow') {
    return (
      <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
        <Signal className="w-3 h-3 mr-1" />
        Slow Connection
      </Badge>
    );
  }

  return null; // Don't show anything if fast
}