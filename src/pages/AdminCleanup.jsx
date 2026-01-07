import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Users, Receipt, Clock, Link as LinkIcon, Loader2 } from 'lucide-react'; // Added icons, including Loader2
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns'; // Import format for date handling

// A simple PageHeader component mock for demonstration. In a real app, this would be a shared component.
function PageHeader({ title, description, icon: Icon }) {
  return (
    <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-slate-200 flex items-center gap-4">
      {Icon && <Icon className="w-8 h-8 text-blue-600" />}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-600">{description}</p>
      </div>
    </div>
  );
}

export default function AdminCleanup() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState('');
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  // NEW: Prompt #65 - Duplicate Detection and Orphaned Records
  const [duplicates, setDuplicates] = useState({ customers: [], employees: [] });
  const [orphanedRecords, setOrphanedRecords] = useState({ timeEntries: [], expenses: [] });
  const [scanningDuplicates, setScanningDuplicates] = useState(false);
  const [scanningOrphans, setScanningOrphans] = useState(false);

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      setIsCleaningUp(true);
      const results = [];

      // Clean TimeEntries
      setProgress('Limpiando registros de horas...');
      const timeEntries = await base44.entities.TimeEntry.list();
      for (const entry of timeEntries) {
        await base44.entities.TimeEntry.delete(entry.id);
      }
      results.push(`✅ ${timeEntries.length} registros de horas eliminados`);

      // Clean DrivingLogs
      setProgress('Limpiando registros de manejo...');
      const drivingLogs = await base44.entities.DrivingLog.list();
      for (const log of drivingLogs) {
        await base44.entities.DrivingLog.delete(log.id);
      }
      results.push(`✅ ${drivingLogs.length} registros de manejo eliminados`);

      // Clean Expenses
      setProgress('Limpiando gastos...');
      const expenses = await base44.entities.Expense.list();
      for (const expense of expenses) {
        await base44.entities.Expense.delete(expense.id);
      }
      results.push(`✅ ${expenses.length} gastos eliminados`);

      // Clean WeeklyPayrolls
      setProgress('Limpiando nóminas...');
      const payrolls = await base44.entities.WeeklyPayroll.list();
      for (const payroll of payrolls) {
        await base44.entities.WeeklyPayroll.delete(payroll.id);
      }
      results.push(`✅ ${payrolls.length} nóminas eliminadas`);

      // Clean JobAssignments
      setProgress('Limpiando asignaciones de trabajo...');
      const assignments = await base44.entities.JobAssignment.list();
      for (const assignment of assignments) {
        await base44.entities.JobAssignment.delete(assignment.id);
      }
      results.push(`✅ ${assignments.length} asignaciones eliminadas`);

      // Clean ChatMessages
      setProgress('Limpiando mensajes de chat...');
      const messages = await base44.entities.ChatMessage.list();
      for (const message of messages) {
        await base44.entities.ChatMessage.delete(message.id);
      }
      results.push(`✅ ${messages.length} mensajes eliminados`);

      // Clean TimeOffRequests
      setProgress('Limpiando solicitudes de tiempo libre...');
      const timeOffRequests = await base44.entities.TimeOffRequest.list();
      for (const request of timeOffRequests) {
        await base44.entities.TimeOffRequest.delete(request.id);
      }
      results.push(`✅ ${timeOffRequests.length} solicitudes de tiempo libre eliminadas`);

      // Clean FormSubmissions
      setProgress('Limpiando envíos de formularios...');
      const submissions = await base44.entities.FormSubmission.list();
      for (const submission of submissions) {
        await base44.entities.FormSubmission.delete(submission.id);
      }
      results.push(`✅ ${submissions.length} envíos de formularios eliminados`);

      // Clean Posts (Announcements)
      setProgress('Limpiando anuncios...');
      const posts = await base44.entities.Post.list();
      for (const post of posts) {
        await base44.entities.Post.delete(post.id);
      }
      results.push(`✅ ${posts.length} anuncios eliminados`);

      // Clean Recognitions
      setProgress('Limpiando reconocimientos...');
      const recognitions = await base44.entities.Recognition.list();
      for (const recognition of recognitions) {
        await base44.entities.Recognition.delete(recognition.id);
      }
      results.push(`✅ ${recognitions.length} reconocimientos eliminados`);

      // Clean Jobs
      setProgress('Limpiando trabajos...');
      const jobs = await base44.entities.Job.list();
      for (const job of jobs) {
        await base44.entities.Job.delete(job.id);
      }
      results.push(`✅ ${jobs.length} trabajos eliminados`);

      // Clean Quotes
      setProgress('Limpiando estimados...');
      const quotes = await base44.entities.Quote.list();
      for (const quote of quotes) {
        await base44.entities.Quote.delete(quote.id);
      }
      results.push(`✅ ${quotes.length} estimados eliminados`);

      // Clean Invoices
      setProgress('Limpiando facturas...');
      const invoices = await base44.entities.Invoice.list();
      for (const invoice of invoices) {
        await base44.entities.Invoice.delete(invoice.id);
      }
      results.push(`✅ ${invoices.length} facturas eliminadas`);

      // Clean Transactions (Accounting)
      setProgress('Limpiando transacciones contables...');
      const transactions = await base44.entities.Transaction.list();
      for (const transaction of transactions) {
        await base44.entities.Transaction.delete(transaction.id);
      }
      results.push(`✅ ${transactions.length} transacciones contables eliminadas`);

      setProgress('¡Limpieza completada!');
      setIsCleaningUp(false);
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries();
      alert('✅ Limpieza completada exitosamente!\n\n' + results.join('\n'));
    },
    onError: (error) => {
      setIsCleaningUp(false);
      alert('❌ Error durante la limpieza: ' + error.message);
    }
  });

  const scanForDuplicates = async () => {
    setScanningDuplicates(true);
    try {
      const customers = await base44.entities.Customer.list();
      const employees = await base44.entities.User.list(); // Assuming 'User' entity represents employees

      // Find duplicate customers by email or phone
      const customerDuplicates = [];
      const customerEmailMap = {};
      const customerPhoneMap = {};

      for (const customer of customers) {
        if (customer.email) {
          if (!customerEmailMap[customer.email]) {
            customerEmailMap[customer.email] = [];
          }
          customerEmailMap[customer.email].push(customer);
        }

        if (customer.phone) {
          const cleanPhone = customer.phone.replace(/\D/g, ''); // Remove non-digits for comparison
          if (cleanPhone) { // Only add if phone exists after cleaning
            if (!customerPhoneMap[cleanPhone]) {
              customerPhoneMap[cleanPhone] = [];
            }
            customerPhoneMap[cleanPhone].push(customer);
          }
        }
      }

      // Add duplicates found for customers
      for (const email in customerEmailMap) {
        if (customerEmailMap[email].length > 1) {
          customerDuplicates.push({
            type: 'email',
            value: email,
            records: customerEmailMap[email]
          });
        }
      }

      for (const phone in customerPhoneMap) {
        if (customerPhoneMap[phone].length > 1) {
          customerDuplicates.push({
            type: 'phone',
            value: phone,
            records: customerPhoneMap[phone]
          });
        }
      }

      // Find duplicate employees by email
      const employeeDuplicates = [];
      const employeeEmailMap = {};

      for (const employee of employees) {
        if (employee.email) {
          if (!employeeEmailMap[employee.email]) {
            employeeEmailMap[employee.email] = [];
          }
          employeeEmailMap[employee.email].push(employee);
        }
      }

      // Add duplicates found for employees
      for (const email in employeeEmailMap) {
        if (employeeEmailMap[email].length > 1) {
          employeeDuplicates.push({
            type: 'email',
            value: email,
            records: employeeEmailMap[email]
          });
        }
      }

      setDuplicates({
        customers: customerDuplicates,
        employees: employeeDuplicates
      });

      alert(`✅ Scan complete!\n\nCustomer Duplicates: ${customerDuplicates.length}\nEmployee Duplicates: ${employeeDuplicates.length}`);
    } catch (error) {
      alert('❌ Error scanning for duplicates: ' + error.message);
    } finally {
      setScanningDuplicates(false);
    }
  };

  const scanForOrphanedRecords = async () => {
    setScanningOrphans(true);
    try {
      const timeEntries = await base44.entities.TimeEntry.list();
      const expenses = await base44.entities.Expense.list();
      const jobs = await base44.entities.Job.list();
      
      const jobIds = new Set(jobs.map(j => j.id));

      // Find orphaned time entries (has job_id but job doesn't exist)
      const orphanedTimeEntries = timeEntries.filter(entry => 
        entry.job_id && !jobIds.has(entry.job_id)
      );

      // Find orphaned expenses (has job_id but job doesn't exist)
      const orphanedExpenses = expenses.filter(expense => 
        expense.job_id && !jobIds.has(expense.job_id)
      );

      setOrphanedRecords({
        timeEntries: orphanedTimeEntries,
        expenses: orphanedExpenses
      });

      alert(`✅ Scan complete!\n\nOrphaned Time Entries: ${orphanedTimeEntries.length}\nOrphaned Expenses: ${orphanedExpenses.length}`);
    } catch (error) {
      alert('❌ Error scanning for orphaned records: ' + error.message);
    } finally {
      setScanningOrphans(false);
    }
  };

  const assignOrphanedRecord = async (recordType, recordId, newJobId) => {
    try {
      const entity = recordType === 'timeEntry' ? base44.entities.TimeEntry : base44.entities.Expense;
      const jobs = await base44.entities.Job.list();
      const selectedJob = jobs.find(j => j.id === newJobId);
      
      if (selectedJob) {
        await entity.update(recordId, {
          job_id: newJobId,
          job_name: selectedJob.name // Assuming entities have a job_name field
        });

        alert('✅ Record assigned successfully!');
        await scanForOrphanedRecords(); // Refresh the list
      } else {
        alert('❌ Invalid Job ID provided.');
      }
    } catch (error) {
      alert('❌ Error assigning record: ' + error.message);
    }
  };

  const deleteOrphanedRecord = async (recordType, recordId) => {
    if (!window.confirm('¿Estás seguro que quieres eliminar este registro huérfano permanentemente?')) return;

    try {
      const entity = recordType === 'timeEntry' ? base44.entities.TimeEntry : base44.entities.Expense;
      await entity.delete(recordId);
      
      alert('✅ Registro huérfano eliminado!');
      await scanForOrphanedRecords(); // Refresh the list
    } catch (error) {
      alert('❌ Error deleting record: ' + error.message);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 bg-gradient-to-br from-slate-50 to-white min-h-screen">
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            Solo administradores pueden acceder a esta página.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Limpieza de Datos"
          description="Herramientas de auditoría y limpieza de datos"
          icon={AlertTriangle}
        />

        {/* Existing Cleanup Functionality */}
        <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl border-red-200 dark:border-red-800 mb-8">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
              <Trash2 className="w-6 h-6 text-red-500 dark:text-red-400" />
              Limpiar Datos de Prueba
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <strong>⚠️ ADVERTENCIA:</strong> Esta acción eliminará TODOS los datos de prueba:
                <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                  <li>Registros de horas de trabajo</li>
                  <li>Registros de horas de manejo y millas</li>
                  <li>Todos los gastos y per diem</li>
                  <li>Nóminas semanales</li>
                  <li>Asignaciones de trabajo</li>
                  <li>Mensajes de chat</li>
                  <li>Solicitudes de tiempo libre</li>
                  <li>Envíos de formularios</li>
                  <li>Anuncios</li>
                  <li>Reconocimientos</li>
                  <li>Trabajos (Jobs)</li>
                  <li>Estimados (Quotes)</li>
                  <li>Facturas (Invoices)</li>
                  <li>Transacciones contables</li>
                </ul>
                <p className="mt-3 font-bold text-green-600">✅ NO se eliminarán: Empleados y Clientes</p>
              </AlertDescription>
            </Alert>

            {isCleaningUp && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700 font-medium">{progress}</p>
              </div>
            )}

            <div className="flex gap-4 justify-end">
              <Button
                onClick={() => cleanupMutation.mutate()}
                disabled={isCleaningUp}
                className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isCleaningUp ? 'Limpiando...' : 'Limpiar Todos los Datos'}
              </Button>
            </div>

            <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-2">📋 Después de limpiar:</h3>
              <ol className="list-decimal ml-4 space-y-2 text-slate-700 text-sm">
                <li>Crear un trabajo de prueba nuevo</li>
                <li>Los empleados ya invitados pueden empezar a registrar datos</li>
                <li>Pedirles que registren horas, gastos, millas, etc.</li>
                <li>Verificar que todo funcione correctamente</li>
                <li>Revisar aprobaciones y nómina</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* NEW: Prompt #65 - Duplicate Detection Section */}
        <Card className="bg-white dark:bg-[#282828] shadow-xl border-slate-200 dark:border-slate-700 mb-8">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Users className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
              Detección de Duplicados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6">
              <Button
                onClick={scanForDuplicates}
                disabled={scanningDuplicates}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
              >
                {scanningDuplicates ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                {scanningDuplicates ? 'Escaneando...' : 'Escanear Duplicados'}
              </Button>
            </div>

            {(duplicates.customers.length > 0 || duplicates.employees.length > 0) && (
              <div className="space-y-6">
                {/* Customer Duplicates */}
                {duplicates.customers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Clientes Duplicados ({duplicates.customers.length})
                    </h3>
                    {duplicates.customers.map((dup, idx) => (
                      <Alert key={idx} className="mb-4 bg-amber-50 border-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <AlertDescription>
                          <p className="font-semibold text-amber-900">
                            ⚠️ Posible Duplicado ({dup.type === 'email' ? 'Email' : 'Teléfono'}): {dup.value}
                          </p>
                          <div className="mt-2 space-y-2">
                            {dup.records.map(record => (
                              <div key={record.id} className="p-2 bg-white rounded border border-amber-200">
                                <p className="text-sm">
                                  <strong>{record.first_name} {record.last_name}</strong>
                                  <br />
                                  {record.company} - {record.email} - {record.phone}
                                </p>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-slate-600 mt-2">
                            Acción Requerida: Revise estos registros y combine o elimine duplicados manualmente.
                          </p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Employee Duplicates */}
                {duplicates.employees.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Empleados Duplicados ({duplicates.employees.length})
                    </h3>
                    {duplicates.employees.map((dup, idx) => (
                      <Alert key={idx} className="mb-4 bg-red-50 border-red-300">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <AlertDescription>
                          <p className="font-semibold text-red-900">
                            ⚠️ Posible Duplicado ({dup.type === 'email' ? 'Email' : 'Teléfono'}): {dup.value}
                          </p>
                          <div className="mt-2 space-y-2">
                            {dup.records.map(record => (
                              <div key={record.id} className="p-2 bg-white rounded border border-red-200">
                                <p className="text-sm">
                                  <strong>{record.full_name}</strong>
                                  <br />
                                  {record.position} - {record.email}
                                </p>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-slate-600 mt-2">
                            Acción Requerida: Revise estos registros. Use Dashboard → Data → User para combinar o eliminar duplicados.
                          </p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            )}

            {scanningDuplicates === false && duplicates.customers.length === 0 && duplicates.employees.length === 0 && (
              <p className="text-slate-500 text-center py-8">
                No se encontraron duplicados. Haga clic en "Escanear Duplicados" para verificar sus datos.
              </p>
            )}
          </CardContent>
        </Card>

        {/* NEW: Prompt #65 - Orphaned Records Section */}
        <Card className="bg-white dark:bg-[#282828] shadow-xl border-slate-200 dark:border-slate-700 mb-8">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <LinkIcon className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
              Registros Huérfanos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6">
              <Button
                onClick={scanForOrphanedRecords}
                disabled={scanningOrphans}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                {scanningOrphans ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                {scanningOrphans ? 'Escaneando...' : 'Escanear Registros Huérfanos'}
              </Button>
            </div>

            {(orphanedRecords.timeEntries.length > 0 || orphanedRecords.expenses.length > 0) && (
              <div className="space-y-6">
                {/* Orphaned Time Entries */}
                {orphanedRecords.timeEntries.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      <Clock className="w-5 h-5 inline mr-2" />
                      Registros de Horas Huérfanos ({orphanedRecords.timeEntries.length})
                    </h3>
                    {orphanedRecords.timeEntries.map(entry => (
                      <Alert key={entry.id} className="mb-4 bg-blue-50 border-blue-300">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <AlertDescription>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-blue-900">
                                {entry.employee_name} - {format(new Date(entry.date), 'MMM dd, yyyy')}
                              </p>
                              <p className="text-sm text-slate-600">
                                {entry.hours_worked}h trabajadas - Job ID: {entry.job_id} (No Encontrado)
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const newJobId = prompt('Ingrese un ID de Trabajo válido para asignar:');
                                  if (newJobId) {
                                    assignOrphanedRecord('timeEntry', entry.id, newJobId);
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Asignar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteOrphanedRecord('timeEntry', entry.id)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Orphaned Expenses */}
                {orphanedRecords.expenses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      <Receipt className="w-5 h-5 inline mr-2" />
                      Gastos Huérfanos ({orphanedRecords.expenses.length})
                    </h3>
                    {orphanedRecords.expenses.map(expense => (
                      <Alert key={expense.id} className="mb-4 bg-amber-50 border-amber-300">
                        <Receipt className="w-4 h-4 text-amber-600" />
                        <AlertDescription>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-amber-900">
                                {expense.employee_name} - ${expense.amount.toFixed(2)}
                              </p>
                              <p className="text-sm text-slate-600">
                                {expense.description} - {format(new Date(expense.date), 'MMM dd, yyyy')}
                              </p>
                              <p className="text-xs text-slate-500">
                                Job ID: {expense.job_id} (No Encontrado)
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const newJobId = prompt('Ingrese un ID de Trabajo válido para asignar:');
                                  if (newJobId) {
                                    assignOrphanedRecord('expense', expense.id, newJobId);
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Asignar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteOrphanedRecord('expense', expense.id)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            )}

            {scanningOrphans === false && orphanedRecords.timeEntries.length === 0 && orphanedRecords.expenses.length === 0 && (
              <p className="text-slate-500 text-center py-8">
                No se encontraron registros huérfanos. Haga clic en "Escanear Registros Huérfanos" para verificar sus datos.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}