import React, { useState } from 'react';
import { MapPin, AlertCircle, ChevronDown, ChevronUp, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getGPSInstructions, detectPlatform } from '@/components/utils/geolocationPermissions';

/**
 * LocationPermissionPrompt - UX clara cuando GPS está denied
 * 
 * GEOFENCE HARDENING PASO 3
 * NO usar alert(), mostrar UI profesional
 */
export default function LocationPermissionPrompt({ 
  language = 'en',
  onDismiss,
  blocking = true // true = clock in/out (bloquea), false = breaks (no bloquea)
}) {
  const [showInstructions, setShowInstructions] = useState(false);
  const platform = detectPlatform();
  const instructions = getGPSInstructions(language);

  const platformLabels = {
    ios: 'iPhone/iPad',
    android: 'Android',
    desktop: 'Desktop'
  };

  return (
    <Card className="border-2 border-orange-500 shadow-2xl bg-white dark:bg-slate-800">
      <CardHeader className="text-center pb-4">
        <div className="w-20 h-20 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <MapPin className="w-12 h-12 text-orange-600" strokeWidth={2.5} />
        </div>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
          {language === 'es' ? 'Ubicación Deshabilitada' : 'Location Disabled'}
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          {language === 'es' 
            ? 'Necesitamos acceso a tu ubicación GPS para registrar tiempo en el sitio del proyecto.'
            : 'We need access to your GPS location to track time at the project site.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Severity indicator */}
        <div className={`p-3 rounded-xl border-2 flex items-start gap-3 ${
          blocking 
            ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
        }`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            blocking ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
          }`} />
          <div className="flex-1">
            <p className={`text-sm font-bold ${
              blocking ? 'text-red-900 dark:text-red-200' : 'text-amber-900 dark:text-amber-200'
            }`}>
              {blocking ? (
                language === 'es' 
                  ? '⛔ No puedes continuar sin GPS habilitado'
                  : '⛔ Cannot proceed without GPS enabled'
              ) : (
                language === 'es'
                  ? '⚠️ Ubicación no disponible - se registrará como desconocida'
                  : '⚠️ Location unavailable - will be recorded as unknown'
              )}
            </p>
          </div>
        </div>

        {/* Platform badge */}
        <div className="flex items-center justify-center gap-2">
          <Smartphone className="w-4 h-4 text-slate-500" />
          <Badge variant="outline" className="text-xs">
            {platformLabels[platform]}
          </Badge>
        </div>

        {/* Instructions toggle */}
        <Button
          variant="outline"
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {showInstructions ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
          {language === 'es' ? 'Cómo habilitar GPS' : 'How to Enable GPS'}
        </Button>

        {/* Step-by-step instructions */}
        {showInstructions && (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <ol className="space-y-2">
              {instructions.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {language === 'es' ? 'Recargar Página' : 'Reload Page'}
          </Button>
          
          {!blocking && onDismiss && (
            <Button
              variant="outline"
              onClick={onDismiss}
              className="w-full border-slate-300 dark:border-slate-700"
            >
              {language === 'es' ? 'Continuar Sin GPS' : 'Continue Without GPS'}
            </Button>
          )}
        </div>

        {/* Helper text */}
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">
          {language === 'es'
            ? 'Si ya habilitaste el GPS, recarga la página para que los cambios surtan efecto.'
            : 'If you already enabled GPS, reload the page for changes to take effect.'}
        </p>
      </CardContent>
    </Card>
  );
}