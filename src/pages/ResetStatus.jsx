import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/shared/PageHeader";
import { Users, Trash2, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";

export default function ResetStatus() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  // Obtener el usuario actual
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const data = await base44.entities.User.list('full_name');
      return data;
    },
    initialData: []
  });

  // Filtrar SOLO por email del usuario actual - mucho más seguro
  const employeesToDelete = employees.filter(emp => 
    emp.email !== currentUser?.email &&
    emp.employment_status !== 'deleted'
  );

  const myAccount = employees.find(emp => emp.email === currentUser?.email);

  const handleDeleteAll = async () => {
    if (!currentUser) {
      toast.error(language === 'es' ? '⚠️ No se pudo identificar tu cuenta' : '⚠️ Could not identify your account');
      return;
    }

    if (employeesToDelete.length === 0) {
      toast.error(language === 'es' ? '⚠️ No hay empleados para eliminar' : '⚠️ No employees to delete');
      return;
    }

    const confirmMsg = language === 'es'
      ? `🚨 ADVERTENCIA 🚨\n\n¿Estás SEGURO que quieres ELIMINAR ${employeesToDelete.length} empleados?\n\nEsta acción cambiará su status a "deleted" y perderán acceso al sistema.\n\nSe mantendrá SOLO TU CUENTA:\n- ${myAccount?.full_name || currentUser.full_name} (${currentUser.email})\n\nEMPLEADOS A ELIMINAR:\n${employeesToDelete.slice(0, 10).map(e => `- ${e.full_name} (${e.email})`).join('\n')}${employeesToDelete.length > 10 ? `\n... y ${employeesToDelete.length - 10} más` : ''}\n\n⚠️ Esta acción NO se puede deshacer fácilmente ⚠️`
      : `🚨 WARNING 🚨\n\nAre you SURE you want to DELETE ${employeesToDelete.length} employees?\n\nThis will set their status to "deleted" and they will lose system access.\n\nWILL KEEP ONLY YOUR ACCOUNT:\n- ${myAccount?.full_name || currentUser.full_name} (${currentUser.email})\n\nEMPLOYEES TO DELETE:\n${employeesToDelete.slice(0, 10).map(e => `- ${e.full_name} (${e.email})`).join('\n')}${employeesToDelete.length > 10 ? `\n... and ${employeesToDelete.length - 10} more` : ''}\n\n⚠️ This action CANNOT be easily undone ⚠️`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    // Segunda confirmación
    if (!window.confirm(language === 'es' ? '¿REALMENTE SEGURO? Esta es tu última oportunidad para cancelar.' : 'REALLY SURE? This is your last chance to cancel.')) {
      return;
    }

    setProcessing(true);
    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const emp of employeesToDelete) {
      // Verificación extra por seguridad
      if (emp.email === currentUser.email) {
        results.skipped.push(emp.full_name);
        continue;
      }

      try {
        await base44.entities.User.update(emp.id, {
          employment_status: 'deleted'
        });
        results.success.push(`${emp.full_name} (${emp.email})`);
      } catch (error) {
        results.failed.push({ name: `${emp.full_name} (${emp.email})`, error: error.message });
      }
    }

    setProcessing(false);
    setResults(results);
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    
    const message = language === 'es' 
      ? `✅ ${results.success.length} empleados eliminados. Tu cuenta está segura.`
      : `✅ ${results.success.length} employees deleted. Your account is safe.`;
    
    toast.success(message);
  };

  if (isLoading || !currentUser) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-white">{language === 'es' ? 'Cargando...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title={language === 'es' ? "🚨 Eliminar Todos los Empleados" : "🚨 Delete All Employees"}
          description={language === 'es' ? "Zona de peligro - Elimina todos excepto tu cuenta" : "Danger zone - Delete all except your account"}
          icon={AlertTriangle}
        />

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-6">
              <h3 className="text-green-400 font-semibold mb-2">
                {language === 'es' ? '✅ SE MANTENDRÁ (TU CUENTA)' : '✅ WILL KEEP (YOUR ACCOUNT)'}
              </h3>
              {myAccount ? (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                  {myAccount.profile_photo_url ? (
                    <img
                      src={myAccount.profile_photo_url}
                      alt={myAccount.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      {myAccount.full_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{myAccount.full_name}</p>
                    <p className="text-sm text-green-300">{myAccount.email}</p>
                    <p className="text-xs text-green-400 mt-1">🔒 {language === 'es' ? 'Protegido - No se eliminará' : 'Protected - Will NOT be deleted'}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="text-white font-semibold">{currentUser.full_name}</p>
                  <p className="text-sm text-green-300">{currentUser.email}</p>
                  <p className="text-xs text-green-400 mt-1">🔒 {language === 'es' ? 'Tu cuenta - Protegida' : 'Your account - Protected'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-6">
              <h3 className="text-red-400 font-semibold mb-2">
                {language === 'es' ? '🗑️ SE ELIMINARÁN' : '🗑️ WILL DELETE'}
              </h3>
              <div className="text-center">
                <p className="text-5xl font-bold text-white mb-1">{employeesToDelete.length}</p>
                <p className="text-red-300 text-sm">
                  {language === 'es' ? 'empleados (todos menos tú)' : 'employees (all except you)'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-red-900/20 border-red-500/50 mb-6">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {language === 'es' ? 'Empleados que serán eliminados' : 'Employees to be deleted'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employeesToDelete.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">
                  {language === 'es' ? 'No hay empleados para eliminar (solo estás tú)' : 'No employees to delete (only you)'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {employeesToDelete.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    {emp.profile_photo_url ? (
                      <img
                        src={emp.profile_photo_url}
                        alt={emp.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-white font-bold">
                        {emp.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-white">{emp.full_name}</p>
                      <p className="text-sm text-slate-400">{emp.email}</p>
                    </div>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-red-900/30 border-red-500/50">
          <CardContent className="p-6">
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-300 text-sm mb-2 font-semibold">
                ⚠️ {language === 'es' ? 'ADVERTENCIA IMPORTANTE' : 'IMPORTANT WARNING'}
              </p>
              <ul className="text-red-200 text-xs space-y-1 list-disc list-inside">
                <li>{language === 'es' ? 'Los empleados NO podrán acceder al sistema' : 'Employees will NOT be able to access the system'}</li>
                <li>{language === 'es' ? 'Su status cambiará a "deleted"' : 'Their status will change to "deleted"'}</li>
                <li>{language === 'es' ? 'Tu cuenta está PROTEGIDA y NO será eliminada' : 'Your account is PROTECTED and will NOT be deleted'}</li>
                <li>{language === 'es' ? 'Identificación por EMAIL (más seguro que por nombre)' : 'Identified by EMAIL (safer than by name)'}</li>
              </ul>
            </div>

            <Button
              onClick={handleDeleteAll}
              disabled={processing || employeesToDelete.length === 0}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Trash2 className="w-5 h-5 mr-2 animate-pulse" />
                  {language === 'es' ? 'Eliminando...' : 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5 mr-2" />
                  {language === 'es' 
                    ? `🗑️ ELIMINAR ${employeesToDelete.length} EMPLEADOS (EXCEPTO TÚ)`
                    : `🗑️ DELETE ${employeesToDelete.length} EMPLOYEES (EXCEPT YOU)`
                  }
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card className="bg-white/90 shadow-lg border-slate-200 mt-6">
            <CardHeader>
              <CardTitle className="text-slate-900">
                {language === 'es' ? '📊 Resultados' : '📊 Results'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.success.length > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-900 mb-2">
                      ✅ {language === 'es' ? 'Eliminados exitosamente:' : 'Successfully deleted:'} {results.success.length}
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {results.success.map((name, idx) => (
                        <div key={idx} className="text-sm text-green-800">• {name}</div>
                      ))}
                    </div>
                  </div>
                )}

                {results.skipped.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-semibold text-blue-900 mb-2">
                      🔒 {language === 'es' ? 'Protegidos (tu cuenta):' : 'Protected (your account):'} {results.skipped.length}
                    </p>
                    <div className="space-y-1">
                      {results.skipped.map((name, idx) => (
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