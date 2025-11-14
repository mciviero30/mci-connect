import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/shared/PageHeader";
import { Users, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminEmployeeReset() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const keepActiveNames = ['Marzio Civiero', 'Yeraldin Ramirez'];

  const employeesToReset = employees.filter(emp => 
    emp.employment_status === 'active' && 
    !keepActiveNames.includes(emp.full_name)
  );

  const resetEmployeesMutation = useMutation({
    mutationFn: async () => {
      setProcessing(true);
      const results = {
        success: [],
        failed: [],
        kept: []
      };

      // Keep these active
      for (const name of keepActiveNames) {
        const emp = employees.find(e => e.full_name === name);
        if (emp) {
          results.kept.push(emp.full_name);
        }
      }

      // Reset others
      for (const emp of employeesToReset) {
        try {
          await base44.entities.User.update(emp.id, {
            employment_status: 'pending_registration'
          });
          results.success.push(emp.full_name);
        } catch (error) {
          results.failed.push({ name: emp.full_name, error: error.message });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setProcessing(false);
      setResults(results);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(
        language === 'es' 
          ? `${results.success.length} empleados cambiados a pending`
          : `${results.success.length} employees changed to pending`
      );
    },
    onError: (error) => {
      setProcessing(false);
      toast.error('Error: ' + error.message);
    }
  });

  const handleReset = () => {
    if (window.confirm(
      language === 'es'
        ? `¿Cambiar ${employeesToReset.length} empleados a pending_registration?\n\nSe mantendrán activos:\n- Marzio Civiero\n- Yeraldin Ramirez`
        : `Change ${employeesToReset.length} employees to pending_registration?\n\nWill stay active:\n- Marzio Civiero\n- Yeraldin Ramirez`
    )) {
      resetEmployeesMutation.mutate();
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title={language === 'es' ? "Reset de Empleados" : "Employee Reset"}
          description={language === 'es' ? "Cambiar empleados a pending excepto Marzio y Yeraldin" : "Change employees to pending except Marzio and Yeraldin"}
          icon={Users}
        />

        <Card className="bg-white/90 shadow-lg border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              {language === 'es' ? 'Vista Previa' : 'Preview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-semibold text-green-900 mb-2">
                  ✅ {language === 'es' ? 'Permanecerán ACTIVOS:' : 'Will stay ACTIVE:'}
                </p>
                {keepActiveNames.map(name => {
                  const emp = employees.find(e => e.full_name === name);
                  return (
                    <div key={name} className="text-sm text-green-800">
                      • {name} {emp ? `(${emp.email})` : '(no encontrado)'}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-semibold text-amber-900 mb-2">
                  ⚠️ {language === 'es' ? `Se cambiarán a PENDING (${employeesToReset.length}):` : `Will change to PENDING (${employeesToReset.length}):`}
                </p>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {employeesToReset.map(emp => (
                    <div key={emp.id} className="text-sm text-amber-800">
                      • {emp.full_name} ({emp.email})
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleReset}
                disabled={processing || employeesToReset.length === 0}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-lg py-6"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    {language === 'es' ? 'Procesando...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    {language === 'es' 
                      ? `Cambiar ${employeesToReset.length} empleados a Pending`
                      : `Change ${employeesToReset.length} employees to Pending`
                    }
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results && (
          <Card className="bg-white/90 shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <CheckCircle className="w-5 h-5 text-green-600" />
                {language === 'es' ? 'Resultados' : 'Results'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-green-900 mb-2">
                    ✅ {language === 'es' ? 'Exitosos:' : 'Success:'} {results.success.length}
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {results.success.map((name, idx) => (
                      <div key={idx} className="text-sm text-green-800">• {name}</div>
                    ))}
                  </div>
                </div>

                {results.kept.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-semibold text-blue-900 mb-2">
                      🔒 {language === 'es' ? 'Mantenidos Activos:' : 'Kept Active:'} {results.kept.length}
                    </p>
                    <div className="space-y-1">
                      {results.kept.map((name, idx) => (
                        <div key={idx} className="text-sm text-blue-800">• {name}</div>
                      ))}
                    </div>
                  </div>
                )}

                {results.failed.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-semibold text-red-900 mb-2">
                      ❌ {language === 'es' ? 'Errores:' : 'Failed:'} {results.failed.length}
                    </p>
                    <div className="space-y-1">
                      {results.failed.map((fail, idx) => (
                        <div key={idx} className="text-sm text-red-800">
                          • {fail.name}: {fail.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}