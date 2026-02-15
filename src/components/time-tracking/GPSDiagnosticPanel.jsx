import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Satellite, Navigation, Activity, RefreshCw, 
  CheckCircle, XCircle, AlertTriangle, Zap 
} from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * GPS Diagnostic Panel for Troubleshooting
 * Helps users and admins diagnose GPS/location issues
 */
export default function GPSDiagnosticPanel({ language = 'en' }) {
  const [diagnostics, setDiagnostics] = useState({
    permission: 'checking',
    accuracy: null,
    speed: null,
    heading: null,
    altitude: null,
    satellites: null,
    provider: null,
    timestamp: null,
    battery: null
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [watchId, setWatchId] = useState(null);

  const checkDiagnostics = async () => {
    setIsRefreshing(true);

    try {
      // Check permission
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setDiagnostics(prev => ({ ...prev, permission: permission.state }));

      // Get high-accuracy position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDiagnostics(prev => ({
            ...prev,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            altitude: position.coords.altitude,
            timestamp: position.timestamp,
            provider: 'HTML5 Geolocation API'
          }));
          setIsRefreshing(false);
        },
        (error) => {
          console.error('Diagnostic error:', error);
          setDiagnostics(prev => ({ ...prev, permission: 'denied' }));
          setIsRefreshing(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      // Battery info (if available)
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        setDiagnostics(prev => ({
          ...prev,
          battery: Math.round(battery.level * 100)
        }));
      }

    } catch (error) {
      console.error('Diagnostics error:', error);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkDiagnostics();
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const getPermissionBadge = () => {
    switch (diagnostics.permission) {
      case 'granted':
        return <Badge className="bg-green-500 text-white">✓ {language === 'es' ? 'Permitido' : 'Granted'}</Badge>;
      case 'denied':
        return <Badge className="bg-red-500 text-white">✗ {language === 'es' ? 'Denegado' : 'Denied'}</Badge>;
      case 'prompt':
        return <Badge className="bg-amber-500 text-white">? {language === 'es' ? 'Pendiente' : 'Prompt'}</Badge>;
      default:
        return <Badge className="bg-slate-500 text-white">{language === 'es' ? 'Verificando...' : 'Checking...'}</Badge>;
    }
  };

  const getAccuracyBadge = (accuracy) => {
    if (!accuracy) return null;
    if (accuracy <= 20) return <Badge className="bg-green-500 text-white">Excelente</Badge>;
    if (accuracy <= 50) return <Badge className="bg-blue-500 text-white">{language === 'es' ? 'Bueno' : 'Good'}</Badge>;
    if (accuracy <= 100) return <Badge className="bg-amber-500 text-white">{language === 'es' ? 'Aceptable' : 'Fair'}</Badge>;
    return <Badge className="bg-red-500 text-white">{language === 'es' ? 'Pobre' : 'Poor'}</Badge>;
  };

  return (
    <Card className="border-2 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Satellite className="w-5 h-5 text-blue-600" />
            {language === 'es' ? 'Diagnóstico GPS' : 'GPS Diagnostics'}
          </CardTitle>
          <Button
            onClick={checkDiagnostics}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {language === 'es' ? 'Actualizar' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Permiso de Ubicación' : 'Location Permission'}
            </span>
          </div>
          {getPermissionBadge()}
        </div>

        {/* Accuracy */}
        {diagnostics.accuracy !== null && (
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {language === 'es' ? 'Precisión GPS' : 'GPS Accuracy'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                ±{Math.round(diagnostics.accuracy)}m
              </span>
              {getAccuracyBadge(diagnostics.accuracy)}
            </div>
          </div>
        )}

        {/* Speed (if available) */}
        {diagnostics.speed !== null && diagnostics.speed !== undefined && (
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {language === 'es' ? 'Velocidad' : 'Speed'}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {(diagnostics.speed * 3.6).toFixed(1)} km/h
            </span>
          </div>
        )}

        {/* Battery (if available) */}
        {diagnostics.battery !== null && (
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {language === 'es' ? 'Batería' : 'Battery'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {diagnostics.battery}%
              </span>
              {diagnostics.battery < 20 && (
                <Badge className="bg-red-500 text-white text-xs">
                  {language === 'es' ? 'Baja' : 'Low'}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Last Update */}
        {diagnostics.timestamp && (
          <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500">
              {language === 'es' ? 'Última actualización' : 'Last updated'}: {' '}
              {new Date(diagnostics.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Recommendations */}
        {diagnostics.accuracy > 100 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">
                  {language === 'es' ? 'Precisión mejorable:' : 'Accuracy can be improved:'}
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>{language === 'es' ? 'Muévete al aire libre' : 'Move outdoors'}</li>
                  <li>{language === 'es' ? 'Aléjate de edificios altos' : 'Move away from tall buildings'}</li>
                  <li>{language === 'es' ? 'Espera 30 segundos' : 'Wait 30 seconds'}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}