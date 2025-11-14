import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/shared/PageHeader";
import { Users, RefreshCw, CheckCircle } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function ResetStatus() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const data = await base44.entities.User.list('full_name');
      return data;
    },
    initialData: []
  });

  const activeEmployees = employees.filter(emp => {
    const status = emp.employment_status;
    return status !== 'deleted' && status !== 'archived';
  });

  const toggleEmployee = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) 
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const selectAll = () => {
    setSelectedEmployees(activeEmployees.map(e => e.id));
  };

  const deselectAll = () => {
    setSelectedEmployees([]);
  };

  const handleReset = async () => {
    if (selectedEmployees.length === 0) {
      toast.error(language === 'es' ? '⚠️ Selecciona al menos un empleado' : '⚠️ Select at least one employee');
      return;
    }

    const selectedNames = activeEmployees
      .filter(e => selectedEmployees.includes(e.id))
      .map(e => e.full_name)
      .join('\n- ');

    if (!window.confirm(
      language === 'es'
        ? `¿Cambiar ${selectedEmployees.length} empleados a pending_registration?\n\nEmpleados seleccionados:\n- ${selectedNames}`
        : `Change ${selectedEmployees.length} employees to pending_registration?\n\nSelected employees:\n- ${selectedNames}`
    )) {
      return;
    }

    setProcessing(true);
    const results = {
      success: [],
      failed: []
    };

    for (const empId of selectedEmployees) {
      const emp = employees.find(e => e.id === empId);
      if (!emp) continue;

      try {
        await base44.entities.User.update(empId, {
          employment_status: 'pending_registration'
        });
        results.success.push(emp.full_name);
      } catch (error) {
        results.failed.push({ name: emp.full_name, error: error.message });
      }
    }

    setProcessing(false);
    setResults(results);
    setSelectedEmployees([]);
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    
    toast.success(
      language === 'es' 
        ? `✅ ${results.success.length} empleados cambiados a pending`
        : `✅ ${results.success.length} employees changed to pending`
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-white">{language === 'es' ? 'Cargando empleados...' : 'Loading employees...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title={language === 'es' ? "Cambiar Estado de Empleados" : "Change Employee Status"}
          description={language === 'es' ? "Selecciona empleados para cambiar a pending" : "Select employees to change to pending"}
          icon={Users}
        />

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-6 text-center">
              <p className="text-blue-400 text-sm mb-1">
                {language === 'es' ? 'Total Disponibles' : 'Total Available'}
              </p>
              <p className="text-4xl font-bold text-white">{activeEmployees.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-6 text-center">
              <p className="text-amber-400 text-sm mb-1">
                {language === 'es' ? 'Seleccionados' : 'Selected'}
              </p>
              <p className="text-4xl font-bold text-white">{selectedEmployees.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-6 text-center">
              <p className="text-green-400 text-sm mb-1">
                {language === 'es' ? 'Sin Cambios' : 'No Changes'}
              </p>
              <p className="text-4xl font-bold text-white">
                {activeEmployees.length - selectedEmployees.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/90 shadow-lg border-slate-200 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Users className="w-5 h-5 text-blue-600" />
                {language === 'es' ? 'Todos los Empleados' : 'All Employees'} ({activeEmployees.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={selectAll} 
                  variant="outline" 
                  size="sm"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  {language === 'es' ? 'Seleccionar Todos' : 'Select All'}
                </Button>
                <Button 
                  onClick={deselectAll} 
                  variant="outline" 
                  size="sm"
                  className="text-slate-600 border-slate-300 hover:bg-slate-50"
                >
                  {language === 'es' ? 'Deseleccionar Todos' : 'Deselect All'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeEmployees.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-2">
                  {language === 'es' ? 'No hay empleados disponibles' : 'No employees available'}
                </p>
                <p className="text-sm text-slate-400">
                  Total empleados en sistema: {employees.length}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {activeEmployees.map(emp => {
                  const isSelected = selectedEmployees.includes(emp.id);
                  
                  return (
                    <div
                      key={emp.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                        isSelected
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => {
                        console.log('Click en empleado:', emp.full_name);
                        toggleEmployee(emp.id);
                      }}
                    >
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEmployee(emp.id)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                      </div>
                      
                      {emp.profile_photo_url ? (
                        <img
                          src={emp.profile_photo_url}
                          alt={emp.full_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-300"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {emp.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{emp.full_name}</p>
                          {emp.employment_status && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                emp.employment_status === 'active' 
                                  ? 'bg-green-50 text-green-700 border-green-300'
                                  : emp.employment_status === 'pending_registration'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : 'bg-slate-50 text-slate-700 border-slate-300'
                              }`}
                            >
                              {emp.employment_status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{emp.email}</p>
                        {emp.position && (
                          <p className="text-xs text-slate-500">{emp.position}</p>
                        )}
                      </div>

                      {isSelected && (
                        <div className="text-amber-600 font-semibold text-sm">
                          {language === 'es' ? '→ Cambiar a Pending' : '→ Change to Pending'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/90 shadow-lg border-slate-200 mb-6">
          <CardContent className="p-6">
            <Button
              onClick={handleReset}
              disabled={processing || selectedEmployees.length === 0}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-lg py-6 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    ? `Cambiar ${selectedEmployees.length} empleados a Pending`
                    : `Change ${selectedEmployees.length} employees to Pending`
                  }
                </>
              )}
            </Button>
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