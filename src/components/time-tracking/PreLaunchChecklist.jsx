import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, Wifi, Smartphone, MapPin, Users, Power, MessageSquare, Settings } from 'lucide-react';

/**
 * PRE-LAUNCH CHECKLIST - Time Tracking Module
 * Verifica 15 puntos críticos antes de lanzar
 */

const CHECKLIST_ITEMS = [
  {
    id: 1,
    title: '✅ Offline Sync',
    description: 'Verifica que las horas se sincronizan cuando vuelve la conexión',
    icon: Wifi,
    critical: true,
    testSteps: [
      '1. Activa sesión de trabajo',
      '2. Desconecta internet (modo avión)',
      '3. Haz clock-out offline',
      '4. Vuelve a conectar',
      '5. Verifica que se envíe a base de datos'
    ]
  },
  {
    id: 2,
    title: '✅ Break Math',
    description: 'Las pausas se restan correctamente del total de horas',
    icon: Clock,
    critical: true,
    testSteps: [
      '1. Clock in a las 8:00',
      '2. Break 30 min (8:30-9:00)',
      '3. Break 60 min (11:00-12:00)',
      '4. Clock out a las 17:00',
      '5. Debería mostrar 8.5 horas (no 9)'
    ]
  },
  {
    id: 3,
    title: '✅ Midnight Crossing',
    description: 'Calcula correctamente si trabaja de 10pm a 2am',
    icon: Clock,
    critical: true,
    testSteps: [
      '1. Clock in a las 22:00 (10pm)',
      '2. Clock out a las 02:00 (2am)',
      '3. Debería mostrar 4 horas exactas',
      '4. Verificar en TimeEntry.date (debe ser del día de inicio)'
    ]
  },
  {
    id: 4,
    title: '✅ Geofence Validation',
    description: 'Backend valida la ubicación correctamente',
    icon: MapPin,
    critical: true,
    testSteps: [
      '1. Configurar job con GPS + geofence_radius',
      '2. Intentar clock in desde fuera del radio',
      '3. Debe bloquearse en frontend',
      '4. Verificar en admin_audit que se registre el intento',
      '5. Clock in correcto dentro del área'
    ]
  },
  {
    id: 5,
    title: '✅ Duplicate Prevention',
    description: 'Debounce evita entradas duplicadas en conexiones lentas',
    icon: AlertCircle,
    critical: true,
    testSteps: [
      '1. Simular conexión lenta (DevTools throttle)',
      '2. Hacer double-tap rápido en botón Clock In',
      '3. Verificar en BD que hay SOLO 1 TimeEntry',
      '4. Verificar console que clockInProgressRef bloquea segundo call'
    ]
  },
  {
    id: 6,
    title: '⚠️ Session Recovery',
    description: 'Si app se cierra, sesión se recupera al reabrir',
    icon: Power,
    critical: true,
    testSteps: [
      '1. Clock in y espera 5 min',
      '2. Cierra completamente el navegador/app',
      '3. Reabre la app',
      '4. Debería mostrar sesión activa con tiempo correcto',
      '5. Clock out debería calcular horas desde inicio'
    ]
  },
  {
    id: 7,
    title: '⚠️ Break State Persistence',
    description: 'Si app se cierra en pausa, mantiene el estado',
    icon: Clock,
    critical: true,
    testSteps: [
      '1. Clock in',
      '2. Inicia pausa',
      '3. Cierra app completamente',
      '4. Reabre app',
      '5. Debe mostrar pausa activa, no sesión trabajando'
    ]
  },
  {
    id: 8,
    title: '⚠️ Scheduled Shifts',
    description: 'enforce_scheduled_hours y grace_minutes funcionan',
    icon: Clock,
    critical: true,
    testSteps: [
      '1. JobAssignment con enforce_scheduled_hours=true',
      '2. scheduled_start_time=08:00, scheduled_end_time=17:00',
      '3. Clock in a las 07:30 → debe ajustarse a 08:00',
      '4. Clock out a las 17:30 → debe ajustarse a 17:00 (sin grace)',
      '5. Clock out a las 16:57 (dentro de grace) → mantiene hora real'
    ]
  },
  {
    id: 9,
    title: '⚠️ Hour Limits',
    description: 'Limits correctos: 10h work / 16h driving / 12h combined',
    icon: AlertCircle,
    critical: true,
    testSteps: [
      '1. Clock work a las 08:00',
      '2. Intenta clock out a las 20:00 (12h)',
      '3. Debe auto-capearse a 10h y mostrar "exceeds_max_hours"',
      '4. Driving: intenta 18h, debe capearse a 16h',
      '5. Admins deben recibir notificación urgente'
    ]
  },
  {
    id: 10,
    title: '🔒 Manager Approvals',
    description: 'Managers ven y aprueban horas correctamente',
    icon: Users,
    critical: true,
    testSteps: [
      '1. Employee clock out (horas pending)',
      '2. Manager accede a Horarios tab',
      '3. Debe ver horas en pending (status="pending")',
      '4. Click aprobar → status cambia a "approved"',
      '5. Verificar que solo manager puede aprobar sus empleados'
    ]
  },
  {
    id: 11,
    title: '🔒 TimeEntry Creation SSOT',
    description: 'Se guarda con user_id correctamente (no email)',
    icon: Settings,
    critical: true,
    testSteps: [
      '1. Clock in/out',
      '2. Verifica base de datos TimeEntry record',
      '3. Campo "user_id" DEBE estar poblado (user UUID)',
      '4. Campo "employee_email" es legacy (puede estar vacío)',
      '5. Validar: WHERE user_id = "uuid" debe retornar entrada'
    ]
  },
  {
    id: 12,
    title: '📱 Mobile UX',
    description: 'Botón clock in/out fácil de pulsar con una mano',
    icon: Smartphone,
    critical: false,
    testSteps: [
      '1. Abre en móvil (iOS/Android)',
      '2. Intenta pulsar botón Clock In con pulgar',
      '3. Debe ser accesible sin dos manos',
      '4. Touch feedback (haptic) debe funcionar',
      '5. Sin accidentes por double-tap'
    ]
  },
  {
    id: 13,
    title: '🔋 Battery Drain',
    description: 'GPS continuo no drena batería excesivamente',
    icon: Battery,
    critical: false,
    testSteps: [
      '1. Activa sesión de 1 hora',
      '2. Observa battery drain en DevTools/Settings',
      '3. Debería ser < 5% por hora (normal GPS)',
      '4. Si > 10%, revisar EnhancedGeolocation loops',
      '5. Mostrar aviso a usuario sobre consumo'
    ]
  },
  {
    id: 14,
    title: '🌍 Error Messages i18n',
    description: 'Todos los errores están en inglés/español',
    icon: MessageSquare,
    critical: false,
    testSteps: [
      '1. Intenta clock in sin GPS',
      '2. Cambia language a "es"',
      '3. Mensaje debe ser en español',
      '4. Intenta geofence error',
      '5. Verificar TODOS los error messages en ambos idiomas'
    ]
  },
  {
    id: 15,
    title: '⏳ Loading States',
    description: 'Hay loading spinner durante GPS acquisition',
    icon: Clock,
    critical: false,
    testSteps: [
      '1. Clock in',
      '2. Debe mostrar "Acquiring GPS..."',
      '3. Si demora > 2 seg, mostrar spinner',
      '4. Si falla GPS, mostrar error con retry',
      '5. Clock out: mismo spinner, mismo timeout'
    ]
  }
];

export default function PreLaunchChecklist() {
  const [completed, setCompleted] = useState(new Set());
  const [failedItems, setFailedItems] = useState(new Set());

  const toggleComplete = (id) => {
    const newCompleted = new Set(completed);
    if (newCompleted.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompleted(newCompleted);
  };

  const toggleFailed = (id) => {
    const newFailed = new Set(failedItems);
    if (newFailed.has(id)) {
      newFailed.delete(id);
    } else {
      newFailed.add(id);
    }
    setFailedItems(newFailed);
  };

  const criticalItems = CHECKLIST_ITEMS.filter(item => item.critical);
  const completedCritical = criticalItems.filter(item => completed.has(item.id)).length;
  const failedCritical = criticalItems.filter(item => failedItems.has(item.id)).length;

  const canLaunch = failedCritical === 0 && completedCritical === criticalItems.length;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">🚀 Pre-Launch Checklist</h1>
        <p className="text-blue-700">Verifica todos los 15 puntos antes de lanzar Time Tracking</p>
      </div>

      {/* Progress Summary */}
      <Card className="border-2 border-indigo-200 bg-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">📊 Progreso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{completedCritical}/{criticalItems.length}</div>
              <div className="text-sm text-blue-700">Críticos ✅</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{failedCritical}</div>
              <div className="text-sm text-red-700">Fallidos ❌</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${canLaunch ? 'text-green-600' : 'text-yellow-600'}`}>
                {canLaunch ? '✅' : '⏳'}
              </div>
              <div className={`text-sm ${can Launch ? 'text-green-700' : 'text-yellow-700'}`}>
                {canLaunch ? 'LISTO' : 'NO LISTO'}
              </div>
            </div>
          </div>
          {!canLaunch && failedCritical > 0 && (
            <div className="bg-red-100 border-l-4 border-red-500 p-3 text-sm text-red-700">
              ❌ {failedCritical} crítico(s) fallido(s) - FIX ANTES DE LANZAR
            </div>
          )}
          {!canLaunch && failedCritical === 0 && completedCritical < criticalItems.length && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 text-sm text-yellow-700">
              ⏳ Faltan {criticalItems.length - completedCritical} crítico(s) por verificar
            </div>
          )}
          {canLaunch && (
            <div className="bg-green-100 border-l-4 border-green-500 p-3 text-sm text-green-700">
              ✅ TODOS LOS CRÍTICOS PASADOS - LISTO PARA LANZAR
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <div className="space-y-3">
        {CHECKLIST_ITEMS.map(item => {
          const Icon = item.icon;
          const isCompleted = completed.has(item.id);
          const isFailed = failedItems.has(item.id);

          return (
            <Card key={item.id} className={`border-2 transition-all ${
              isFailed ? 'border-red-300 bg-red-50' : 
              isCompleted ? 'border-green-300 bg-green-50' : 
              'border-slate-200'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Icon className={`w-6 h-6 ${isFailed ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-slate-400'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                      {item.critical && <Badge className="bg-red-600 text-white text-xs">CRÍTICO</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{item.description}</p>

                    <div className="bg-white rounded-lg p-3 mb-3 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-2">TEST STEPS:</p>
                      <ul className="space-y-1">
                        {item.testSteps.map((step, idx) => (
                          <li key={idx} className="text-xs text-slate-600 pl-4">• {step}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => toggleComplete(item.id)}
                        variant={isCompleted ? "default" : "outline"}
                        size="sm"
                        className={isCompleted ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {isCompleted ? 'Completado' : 'Marcar Completado'}
                      </Button>
                      <Button
                        onClick={() => toggleFailed(item.id)}
                        variant={isFailed ? "destructive" : "outline"}
                        size="sm"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {isFailed ? 'Fallido' : 'Marcar Fallido'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card className={`border-2 ${canLaunch ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
        <CardHeader>
          <CardTitle className={canLaunch ? 'text-green-900' : 'text-yellow-900'}>
            {canLaunch ? '✅ LISTO PARA LANZAR' : '⏳ PENDIENTE'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={canLaunch ? 'text-green-700' : 'text-yellow-700'}>
            {canLaunch 
              ? 'Todos los puntos críticos han sido verificados. La aplicación está lista para lanzarse el próximo lunes.'
              : 'Completa todos los puntos críticos antes de lanzar. Revisa los fallidos y haz las correcciones necesarias.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}