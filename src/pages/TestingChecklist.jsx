import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Clock,
  Globe,
  MapPin,
  Smartphone,
  Languages,
  Briefcase,
  DollarSign,
  Menu,
  Wifi,
  WifiOff,
  Download,
  FileText
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TestingChecklist() {
  const [testResults, setTestResults] = useState(() => {
    const saved = localStorage.getItem('mci_qa_results');
    return saved ? JSON.parse(saved) : {};
  });

  const [expandedTest, setExpandedTest] = useState(null);

  useEffect(() => {
    localStorage.setItem('mci_qa_results', JSON.stringify(testResults));
  }, [testResults]);

  const qaTests = [
    {
      id: 'offline_connectivity',
      category: 'Offline Functionality (P#85)',
      icon: WifiOff,
      color: 'from-red-500 to-orange-500',
      tests: [
        {
          id: 'offline_clock_in',
          title: 'Clock In en Modo Avión',
          steps: [
            '1. Activa Modo Avión en tu dispositivo',
            '2. Ve a Dashboard',
            '3. Selecciona un Job activo',
            '4. Haz clic en "Clock In"'
          ],
          expectedResult: '✅ Badge rojo 🚫 aparece en la esquina superior derecha\n✅ Mensaje "Guardado localmente" aparece\n✅ El Clock In queda registrado localmente',
          criticalIssues: [
            '❌ Si no aparece el badge rojo',
            '❌ Si aparece error de conexión',
            '❌ Si los datos se pierden al recargar'
          ]
        },
        {
          id: 'offline_expense',
          title: 'Crear Expense Offline',
          steps: [
            '1. Mantén Modo Avión activo',
            '2. Ve a "My Expenses" o "Mis Gastos"',
            '3. Crea un nuevo gasto con recibo',
            '4. Envía el formulario'
          ],
          expectedResult: '✅ Badge rojo muestra contador incrementado\n✅ Gasto guardado localmente\n✅ Aparece en la lista como pendiente de sincronización',
          criticalIssues: [
            '❌ Si el gasto no se guarda',
            '❌ Si la imagen del recibo no se guarda localmente'
          ]
        },
        {
          id: 'offline_job_update',
          title: 'Actualizar Job Status Offline',
          steps: [
            '1. Mantén Modo Avión activo',
            '2. Ve a "Jobs" o "Trabajos"',
            '3. Abre un Job activo',
            '4. Intenta cambiar el status o agregar nota'
          ],
          expectedResult: '✅ Cambio guardado localmente\n✅ Badge rojo incrementa',
          criticalIssues: [
            '❌ Si los cambios no se guardan'
          ]
        }
      ]
    },
    {
      id: 'sync',
      category: 'Sincronización (P#85)',
      icon: Wifi,
      color: 'from-green-500 to-emerald-500',
      tests: [
        {
          id: 'sync_recovery',
          title: 'Sincronización Automática',
          steps: [
            '1. Con acciones pendientes guardadas (del test anterior)',
            '2. Desactiva Modo Avión',
            '3. Espera 5-10 segundos',
            '4. Observa las notificaciones'
          ],
          expectedResult: '✅ Toast verde aparece: "Sync Complete! X items synced"\n✅ Badge rojo 🚫 desaparece\n✅ Time Entry aparece en "Horarios"\n✅ Expense aparece en "Gastos"\n✅ Datos persistidos en backend',
          criticalIssues: [
            '❌ Si no sincroniza automáticamente',
            '❌ Si los datos se duplican',
            '❌ Si el badge no desaparece',
            '❌ Si aparecen errores de sincronización'
          ]
        }
      ]
    },
    {
      id: 'bilingual',
      category: 'UX/UI y Bilingüismo (P#84)',
      icon: Languages,
      color: 'from-blue-500 to-indigo-500',
      tests: [
        {
          id: 'language_switch',
          title: 'Cambio de Idioma',
          steps: [
            '1. Ve al footer del menú lateral (abajo)',
            '2. Haz clic en el selector de idioma',
            '3. Selecciona "🇪🇸 Español"',
            '4. Navega por diferentes páginas'
          ],
          expectedResult: '✅ TODO el menú cambia a español instantáneamente\n✅ "Time Tracking" → "Horarios"\n✅ "Employees" → "Empleados"\n✅ "Dashboard" permanece en inglés\n✅ Todos los botones y textos traducidos\n✅ Preferencia se guarda (persiste al recargar)',
          criticalIssues: [
            '❌ Si algunos textos no se traducen',
            '❌ Si la preferencia no se guarda',
            '❌ Si hay textos rotos o keys sin traducir'
          ]
        }
      ]
    },
    {
      id: 'navigation',
      category: 'Navegación Limpia (P#84)',
      icon: Menu,
      color: 'from-purple-500 to-pink-500',
      tests: [
        {
          id: 'menu_hierarchy',
          title: 'Menú Lateral Limpio',
          steps: [
            '1. Abre el menú lateral',
            '2. Revisa todas las secciones',
            '3. Verifica la jerarquía visual'
          ],
          expectedResult: '✅ NO hay símbolos ├─, └─, etc.\n✅ Indentación visual clara (32px) en items anidados\n✅ Jerarquía limpia y profesional\n✅ Ejemplo correcto:\n  OPERATIONS\n    Jobs\n      Inventory\n      Job Analysis\n    Calendar',
          criticalIssues: [
            '❌ Si aparecen símbolos de árbol',
            '❌ Si la indentación no es clara',
            '❌ Si items anidados no se distinguen'
          ]
        }
      ]
    },
    {
      id: 'company_info',
      category: 'Integración Web (P#86)',
      icon: Globe,
      color: 'from-cyan-500 to-blue-500',
      tests: [
        {
          id: 'website_load',
          title: 'Carga de Company Info',
          steps: [
            '1. Ve al menú lateral → RESOURCES',
            '2. Haz clic en "Company Info"',
            '3. Observa si la página carga'
          ],
          expectedResult: '✅ OPCIÓN A (iframe funciona):\n  - La página https://mci-us.com se carga dentro de la app\n  - Puedes navegar por el sitio\n  - Footer muestra: "Navegando: https://mci-us.com"\n\n✅ OPCIÓN B (iframe bloqueado):\n  - Mensaje de error claro aparece\n  - Botón "Abrir en Nueva Pestaña" funciona\n  - Al hacer clic, se abre en navegador externo',
          criticalIssues: [
            '❌ Si aparece página en blanco sin error',
            '❌ Si el botón de nueva pestaña no funciona',
            '❌ Si no hay feedback al usuario'
          ]
        }
      ]
    },
    {
      id: 'geolocation',
      category: 'Geolocalización',
      icon: MapPin,
      color: 'from-green-500 to-teal-500',
      tests: [
        {
          id: 'clock_location',
          title: 'Captura de Ubicación',
          steps: [
            '1. Ve a "My Hours" o "Horarios"',
            '2. Asegúrate de tener permisos de ubicación',
            '3. Haz Clock In',
            '4. Espera unos segundos',
            '5. Haz Clock Out',
            '6. (Admin) Revisa el Time Entry creado'
          ],
          expectedResult: '✅ Sistema captura latitud/longitud al hacer Clock In\n✅ Sistema captura latitud/longitud al hacer Clock Out\n✅ Time Entry se guarda con coordenadas\n✅ Admin puede ver ubicación en aprobación\n✅ Aparece mensaje "Getting location..." durante captura',
          criticalIssues: [
            '❌ Si no solicita permisos de ubicación',
            '❌ Si las coordenadas son null',
            '❌ Si aparece error de geolocalización sin retry',
            '❌ Si funciona en desktop pero no en móvil'
          ]
        }
      ]
    },
    {
      id: 'data_optimization',
      category: 'Optimización de Datos (P#63)',
      icon: DollarSign,
      color: 'from-amber-500 to-orange-500',
      tests: [
        {
          id: 'job_profitability',
          title: 'Cálculo de Rentabilidad',
          steps: [
            '1. Como Admin, crea un Job de prueba',
            '2. Establece Contract Amount: $1000',
            '3. Agrega un Expense con foto ($100)',
            '4. Ve a Job Details del trabajo'
          ],
          expectedResult: '✅ KPI de Rentabilidad se actualiza automáticamente\n✅ El costo del expense ($100) se refleja en "Total Expenses"\n✅ Profit/Loss se calcula correctamente\n✅ No hay errores de cálculo\n✅ Los números tienen sentido',
          criticalIssues: [
            '❌ Si los gastos no se reflejan en el job',
            '❌ Si el profit/loss es incorrecto',
            '❌ Si los KPIs no se actualizan',
            '❌ Si hay errores de división por cero'
          ]
        }
      ]
    },
    {
      id: 'pwa_compatibility',
      category: 'Compatibilidad PWA',
      icon: Smartphone,
      color: 'from-indigo-500 to-purple-500',
      tests: [
        {
          id: 'ios_install',
          title: 'Instalación en iPhone (iOS)',
          steps: [
            '1. Abre la app en Safari (iPhone)',
            '2. Tap en el botón Compartir (cuadro con flecha ↑)',
            '3. Scroll down → "Add to Home Screen"',
            '4. Tap "Add"',
            '5. Abre el ícono desde la pantalla de inicio'
          ],
          expectedResult: '✅ El ícono aparece en tu pantalla de inicio\n✅ Se abre como app nativa (sin barra del navegador)\n✅ Funcionalidad offline disponible\n✅ Splash screen blanco aparece al abrir',
          criticalIssues: [
            '❌ Si no aparece opción "Add to Home Screen"',
            '❌ Si el ícono es genérico (no el logo de MCI)',
            '❌ Si se abre como página web normal',
            '❌ Si no funciona offline después de instalar'
          ]
        },
        {
          id: 'android_install',
          title: 'Instalación en Android',
          steps: [
            '1. Abre la app en Chrome (Android)',
            '2. Menú ⋮ → "Add to Home screen" o "Install app"',
            '3. Tap "Install" o "Add"',
            '4. Abre el ícono desde tu app drawer'
          ],
          expectedResult: '✅ Ícono con el logo de MCI Connect aparece\n✅ App se abre en pantalla completa\n✅ Funcionalidad offline disponible\n✅ Splash screen aparece al abrir',
          criticalIssues: [
            '❌ Si no aparece opción de instalación',
            '❌ Si el manifest.json está mal configurado',
            '❌ Si el ícono no aparece',
            '❌ Si no funciona como PWA real'
          ]
        }
      ]
    }
  ];

  const toggleTest = (testId, subTestId) => {
    const key = `${testId}_${subTestId}`;
    setTestResults(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: prev[key]?.status === 'passed' ? 'pending' : 'passed',
        completedAt: prev[key]?.status === 'passed' ? null : new Date().toISOString()
      }
    }));
  };

  const updateNotes = (testId, subTestId, notes) => {
    const key = `${testId}_${subTestId}`;
    setTestResults(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        notes
      }
    }));
  };

  const markAsFailed = (testId, subTestId) => {
    const key = `${testId}_${subTestId}`;
    setTestResults(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: 'failed',
        completedAt: new Date().toISOString()
      }
    }));
  };

  const calculateProgress = () => {
    let total = 0;
    let passed = 0;
    let failed = 0;

    qaTests.forEach(category => {
      category.tests.forEach(test => {
        total++;
        const key = `${category.id}_${test.id}`;
        const result = testResults[key];
        if (result?.status === 'passed') passed++;
        if (result?.status === 'failed') failed++;
      });
    });

    return { total, passed, failed, percentage: total > 0 ? (passed / total) * 100 : 0 };
  };

  const { total, passed, failed, percentage } = calculateProgress();

  const exportResults = () => {
    const report = {
      date: new Date().toISOString(),
      progress: { total, passed, failed, percentage },
      results: testResults
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mci-qa-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    if (confirm('¿Estás seguro de que quieres reiniciar todas las pruebas?')) {
      setTestResults({});
      localStorage.removeItem('mci_qa_results');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#3B9FF3] to-blue-600 bg-clip-text text-transparent mb-2">
                📋 QA Testing Checklist
              </h1>
              <p className="text-slate-600">
                Guía completa de pruebas de calidad para MCI Connect
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportResults} variant="outline" className="bg-white">
                <Download className="w-4 h-4 mr-2" />
                Exportar Resultados
              </Button>
              <Button onClick={resetAll} variant="outline" className="bg-white text-red-600 border-red-300">
                Reiniciar Todo
              </Button>
            </div>
          </div>

          {/* Progress Overview */}
          <Card className="bg-white shadow-xl border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Progreso General</h3>
                  <p className="text-sm text-slate-600">
                    {passed} de {total} pruebas completadas
                  </p>
                </div>
                <div className="flex gap-4">
                  <Badge className="bg-green-100 text-green-800 border-green-300 px-4 py-2">
                    ✅ {passed} Pasadas
                  </Badge>
                  {failed > 0 && (
                    <Badge className="bg-red-100 text-red-800 border-red-300 px-4 py-2">
                      ❌ {failed} Fallidas
                    </Badge>
                  )}
                  <Badge className="bg-slate-100 text-slate-800 border-slate-300 px-4 py-2">
                    ⏳ {total - passed - failed} Pendientes
                  </Badge>
                </div>
              </div>
              <Progress value={percentage} className="h-3" />
              <p className="text-xs text-slate-500 mt-2 text-right">
                {percentage.toFixed(0)}% completado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Important Notice */}
        <Alert className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-900 font-bold">
            ⚠️ Instrucciones Importantes
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Ejecuta las pruebas en el orden presentado</li>
              <li>Lee cuidadosamente los pasos antes de ejecutar</li>
              <li>Documenta cualquier error o comportamiento inesperado</li>
              <li>Usa dispositivos reales (móvil/tablet) para pruebas de PWA</li>
              <li>Los resultados se guardan automáticamente en tu navegador</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Test Categories */}
        <div className="space-y-6">
          {qaTests.map((category) => (
            <Card key={category.id} className="bg-white shadow-xl border-slate-200">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 bg-gradient-to-br ${category.color} rounded-xl shadow-md`}>
                      <category.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-900 text-xl">
                        {category.category}
                      </CardTitle>
                      <p className="text-sm text-slate-500">
                        {category.tests.length} prueba{category.tests.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-300">
                    {category.tests.filter(t => testResults[`${category.id}_${t.id}`]?.status === 'passed').length} / {category.tests.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {category.tests.map((test) => {
                  const key = `${category.id}_${test.id}`;
                  const result = testResults[key];
                  const isExpanded = expandedTest === key;
                  const isPassed = result?.status === 'passed';
                  const isFailed = result?.status === 'failed';

                  return (
                    <div
                      key={test.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isPassed
                          ? 'bg-green-50 border-green-300'
                          : isFailed
                          ? 'bg-red-50 border-red-300'
                          : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => toggleTest(category.id, test.id)}
                              className="flex-shrink-0"
                            >
                              {isPassed ? (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                              ) : isFailed ? (
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                              ) : (
                                <Circle className="w-6 h-6 text-slate-400" />
                              )}
                            </button>
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-900">{test.title}</h4>
                              {result?.completedAt && (
                                <p className="text-xs text-slate-500">
                                  Completado: {new Date(result.completedAt).toLocaleString('es-ES')}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedTest(isExpanded ? null : key)}
                              className="bg-white"
                            >
                              {isExpanded ? 'Colapsar' : 'Ver Detalles'}
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 space-y-4 pl-9">
                              {/* Steps */}
                              <div>
                                <h5 className="font-semibold text-slate-900 mb-2">📝 Pasos:</h5>
                                <div className="bg-white p-4 rounded-lg border border-slate-200">
                                  {test.steps.map((step, idx) => (
                                    <p key={idx} className="text-sm text-slate-700 mb-1">
                                      {step}
                                    </p>
                                  ))}
                                </div>
                              </div>

                              {/* Expected Result */}
                              <div>
                                <h5 className="font-semibold text-slate-900 mb-2">✅ Resultado Esperado:</h5>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                  <pre className="text-sm text-green-900 whitespace-pre-wrap font-sans">
                                    {test.expectedResult}
                                  </pre>
                                </div>
                              </div>

                              {/* Critical Issues */}
                              {test.criticalIssues && (
                                <div>
                                  <h5 className="font-semibold text-slate-900 mb-2">⚠️ Problemas Críticos a Verificar:</h5>
                                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    {test.criticalIssues.map((issue, idx) => (
                                      <p key={idx} className="text-sm text-red-800 mb-1">
                                        {issue}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              <div>
                                <h5 className="font-semibold text-slate-900 mb-2">📋 Notas y Observaciones:</h5>
                                <Textarea
                                  value={result?.notes || ''}
                                  onChange={(e) => updateNotes(category.id, test.id, e.target.value)}
                                  placeholder="Agrega notas sobre esta prueba: errores encontrados, comportamientos inesperados, etc..."
                                  className="bg-white border-slate-300 text-slate-900 h-24"
                                />
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => toggleTest(category.id, test.id)}
                                  className={isPassed ? 'bg-slate-600' : 'bg-green-600 hover:bg-green-700'}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  {isPassed ? 'Marcar como Pendiente' : 'Marcar como Pasada'}
                                </Button>
                                <Button
                                  onClick={() => markAsFailed(category.id, test.id)}
                                  variant="outline"
                                  className="bg-white text-red-600 border-red-300"
                                >
                                  <AlertTriangle className="w-4 h-4 mr-2" />
                                  Marcar como Fallida
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        {percentage === 100 && (
          <Alert className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-xl">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-900 font-bold text-xl">
              🎉 ¡Testing Completado!
            </AlertTitle>
            <AlertDescription className="text-green-800">
              <p className="mb-4">
                Has completado todas las pruebas del checklist de QA. Revisa los resultados y:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Exporta el reporte de resultados usando el botón "Exportar Resultados"</li>
                <li>Documenta cualquier error encontrado</li>
                <li>Comparte los resultados con el equipo</li>
                <li>Si hay pruebas fallidas, crea issues para corregir</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}