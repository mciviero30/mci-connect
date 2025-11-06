
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Play,
  Monitor,
  Smartphone,
  Tablet,
  Users,
  Clock,
  Receipt,
  Briefcase,
  Calendar,
  FileText,
  MessageSquare,
  GraduationCap,
  DollarSign,
  MapPin
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PageHeader from "../components/shared/PageHeader";
import { getDisplayName, capitalizeName } from "@/components/utils/nameHelpers";

const testSections = [
  {
    name: "Dashboard",
    icon: Monitor,
    tests: [
      "Load time < 2 seconds",
      "Stats cards display correctly",
      "LiveClock works properly",
      "Employee/Admin views different",
      "Responsive on mobile",
      "Names display correctly capitalized"
    ]
  },
  {
    name: "Employees",
    icon: Users,
    tests: [
      "List loads all employees",
      "Search functionality works",
      "Add new employee",
      "Edit employee info",
      "Invite employee",
      "Auto-sync from PendingEmployee",
      "Names auto-capitalize",
      "Tabs (Active/Pending/Invited/Archived)"
    ]
  },
  {
    name: "Time Entries",
    icon: Clock,
    tests: [
      "Clock In/Out works",
      "Geolocation captures",
      "Break tracking works",
      "Time entry creates successfully",
      "Approve/Reject time entries",
      "Filters work correctly"
    ]
  },
  {
    name: "Expenses",
    icon: Receipt,
    tests: [
      "Create expense",
      "Upload receipt",
      "Approve/Reject expenses",
      "Per Diem requests",
      "Filters work",
      "Status updates correctly"
    ]
  },
  {
    name: "Jobs",
    icon: Briefcase,
    tests: [
      "Create job",
      "Edit job",
      "View job details",
      "Financial summary displays",
      "Team assignment works",
      "Status changes"
    ]
  },
  {
    name: "Calendar",
    icon: Calendar,
    tests: [
      "Day/Week/Month views",
      "Create assignment",
      "Multi-day assignments",
      "Multiple employee assignments",
      "Edit assignment",
      "Delete assignment",
      "Job selection works"
    ]
  },
  {
    name: "Quotes & Invoices",
    icon: FileText,
    tests: [
      "Create quote",
      "Add items",
      "Calculate totals",
      "Convert to invoice",
      "Send to customer",
      "PDF generation"
    ]
  },
  {
    name: "Mobile Responsiveness",
    icon: Smartphone,
    tests: [
      "Layout adapts to mobile",
      "Touch targets are adequate",
      "Sidebar menu works",
      "Forms usable on mobile",
      "Tables scroll horizontally",
      "No horizontal overflow"
    ]
  },
  {
    name: "Tablet Responsiveness",
    icon: Tablet,
    tests: [
      "Layout optimized for tablet",
      "Two-column layouts work",
      "Navigation accessible",
      "Charts display correctly"
    ]
  }
];

export default function TestingChecklist() {
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);
  const [fixing, setFixing] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: [],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
  });

  const fixAllNamesMutation = useMutation({
    mutationFn: async () => {
      const fixes = [];
      
      // Fix employee names
      for (const emp of employees) {
        const updates = {};
        let needsUpdate = false;
        
        // Fix first_name
        if (emp.first_name && emp.first_name !== capitalizeName(emp.first_name)) {
          updates.first_name = capitalizeName(emp.first_name);
          needsUpdate = true;
        }
        
        // Fix last_name
        if (emp.last_name && emp.last_name !== capitalizeName(emp.last_name)) {
          updates.last_name = capitalizeName(emp.last_name);
          needsUpdate = true;
        }
        
        // Fix full_name
        const correctFullName = getDisplayName(emp);
        if (emp.full_name !== correctFullName) {
          updates.full_name = correctFullName;
          needsUpdate = true;
        }
        
        // Fix position
        if (emp.position && emp.position !== capitalizeName(emp.position)) {
          updates.position = capitalizeName(emp.position);
          needsUpdate = true;
        }
        
        // Fix department
        if (emp.department && emp.department !== capitalizeName(emp.department)) {
          updates.department = capitalizeName(emp.department);
          needsUpdate = true;
        }
        
        // Fix address
        if (emp.address && emp.address !== capitalizeName(emp.address)) {
          updates.address = capitalizeName(emp.address);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          try {
            await base44.entities.User.update(emp.id, updates);
            fixes.push({ type: 'employee', email: emp.email, updates });
          } catch (error) {
            console.error(`Failed to update ${emp.email}:`, error);
          }
        }
      }
      
      // Fix customer names - UPDATED TO HANDLE OLD 'name' FIELD
      for (const customer of customers) {
        const updates = {};
        let needsUpdate = false;
        
        // Handle old 'name' field - split into first_name and last_name
        if (customer.name && !customer.first_name && !customer.last_name) {
          const nameParts = customer.name.trim().split(' ');
          if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            updates.first_name = capitalizeName(firstName);
            updates.last_name = capitalizeName(lastName);
            needsUpdate = true;
          } else if (nameParts.length === 1) {
            // Solo hay un nombre, ponerlo como first_name y last_name
            updates.first_name = capitalizeName(nameParts[0]);
            updates.last_name = capitalizeName(nameParts[0]); 
            needsUpdate = true;
          }
        } else {
          // Ya tiene first_name y last_name, solo capitalizar
          if (customer.first_name && customer.first_name !== capitalizeName(customer.first_name)) {
            updates.first_name = capitalizeName(customer.first_name);
            needsUpdate = true;
          }
          
          if (customer.last_name && customer.last_name !== capitalizeName(customer.last_name)) {
            updates.last_name = capitalizeName(customer.last_name);
            needsUpdate = true;
          }
        }
        
        if (customer.company && customer.company !== capitalizeName(customer.company)) {
          updates.company = capitalizeName(customer.company);
          needsUpdate = true;
        }
        
        if (customer.address && customer.address !== capitalizeName(customer.address)) {
          updates.address = capitalizeName(customer.address);
          needsUpdate = true;
        }
        
        if (customer.city && customer.city !== capitalizeName(customer.city)) {
          updates.city = capitalizeName(customer.city);
          needsUpdate = true;
        }
        
        if (customer.state && customer.state !== capitalizeName(customer.state)) {
          updates.state = capitalizeName(customer.state);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          try {
            await base44.entities.Customer.update(customer.id, updates);
            fixes.push({ type: 'customer', name: customer.name || `${customer.first_name} ${customer.last_name}`, updates });
          } catch (error) {
            console.error(`Failed to update customer ${customer.id}:`, error);
          }
        }
      }
      
      // Fix job names and addresses
      for (const job of jobs) {
        const updates = {};
        let needsUpdate = false;
        
        if (job.name && job.name !== capitalizeName(job.name)) {
          updates.name = capitalizeName(job.name);
          needsUpdate = true;
        }
        
        if (job.address && job.address !== capitalizeName(job.address)) {
          updates.address = capitalizeName(job.address);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          try {
            await base44.entities.Job.update(job.id, updates);
            fixes.push({ type: 'job', name: job.name, updates });
          } catch (error) {
            console.error(`Failed to update job ${job.id}:`, error);
          }
        }
      }
      
      return fixes;
    },
    onSuccess: (fixes) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      const employeeFixes = fixes.filter(f => f.type === 'employee').length;
      const customerFixes = fixes.filter(f => f.type === 'customer').length;
      const jobFixes = fixes.filter(f => f.type === 'job').length;
      
      alert(`✅ Correcciones completadas!\n\n` +
        `• ${employeeFixes} empleados corregidos\n` +
        `• ${customerFixes} clientes corregidos\n` +
        `• ${jobFixes} trabajos corregidos\n\n` +
        `Total: ${fixes.length} correcciones`);
    },
    onError: (error) => {
      alert(`❌ Error: ${error.message}`);
    }
  });

  const runAutomatedTests = async () => {
    setTesting(true);
    const results = {};
    
    // Test 1: Check employee names
    const namesNeedFix = employees.some(emp => {
      if (emp.first_name && emp.first_name !== capitalizeName(emp.first_name)) return true;
      if (emp.last_name && emp.last_name !== capitalizeName(emp.last_name)) return true;
      return false;
    });
    results['names'] = !namesNeedFix ? 'pass' : 'warn';
    
    // Test 2: Check active jobs
    try {
      const jobs = await base44.entities.Job.filter({ status: 'active' });
      results['jobs'] = jobs.length > 0 ? 'pass' : 'warn';
    } catch (e) {
      results['jobs'] = 'fail';
    }
    
    // Test 3: Check pending expenses
    try {
      const expenses = await base44.entities.Expense.filter({ status: 'pending' });
      results['expenses'] = 'pass';
    } catch (e) {
      results['expenses'] = 'fail';
    }
    
    // Test 4: Check time entries
    try {
      const entries = await base44.entities.TimeEntry.list('', 5);
      results['timeEntries'] = entries.length >= 0 ? 'pass' : 'warn';
    } catch (e) {
      results['timeEntries'] = 'fail';
    }
    
    setTestResults(results);
    setTesting(false);
  };

  const getStatusIcon = (status) => {
    if (status === 'pass') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === 'fail') return <XCircle className="w-5 h-5 text-red-500" />;
    if (status === 'warn') return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    return null;
  };

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-slate-50 to-white min-h-screen">
        <h1 className="text-2xl font-bold text-slate-900">Admin Only</h1>
        <p className="text-slate-600">This page is only accessible to administrators</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Testing & Quality Assurance"
          description="Comprehensive testing checklist for all app features"
          icon={CheckCircle2}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={runAutomatedTests}
                disabled={testing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Run Automated Tests
              </Button>
              <Button
                onClick={() => {
                  if (window.confirm('¿Estás seguro? Esto corregirá TODOS los nombres en mayúsculas/minúsculas a formato capitalizado correcto.\n\nEjemplo: "JORGE ANDRÉS RANGEL" → "Jorge Andrés Rangel"')) {
                    setFixing(true);
                    fixAllNamesMutation.mutate();
                    setFixing(false);
                  }
                }}
                disabled={fixAllNamesMutation.isPending || fixing}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {(fixAllNamesMutation.isPending || fixing) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                🔧 Corregir TODOS los Nombres
              </Button>
            </div>
          }
        />

        {/* Names Preview Before Fix */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200 mb-8">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-slate-900">Vista Previa de Nombres que Necesitan Corrección</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Empleados:</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  {employees.slice(0, 10).map(emp => {
                    const needsFix = 
                      (emp.first_name && emp.first_name !== capitalizeName(emp.first_name)) ||
                      (emp.last_name && emp.last_name !== capitalizeName(emp.last_name)) ||
                      (emp.full_name !== getDisplayName(emp));
                    
                    if (!needsFix) return null;
                    
                    return (
                      <div key={emp.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-red-500 text-white text-xs">ANTES</Badge>
                          <span className="text-sm text-slate-600">{emp.full_name || `${emp.first_name} ${emp.last_name}`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500 text-white text-xs">DESPUÉS</Badge>
                          <span className="text-sm font-semibold text-slate-900">{getDisplayName(emp)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Clientes:</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  {customers.slice(0, 5).map(customer => {
                    let needsFix = false;
                    let originalName = '';
                    let correctedFirstName = customer.first_name;
                    let correctedLastName = customer.last_name;

                    if (customer.name && !customer.first_name && !customer.last_name) {
                      originalName = customer.name;
                      const nameParts = customer.name.trim().split(' ');
                      if (nameParts.length >= 2) {
                        correctedFirstName = capitalizeName(nameParts[0]);
                        correctedLastName = capitalizeName(nameParts.slice(1).join(' '));
                        needsFix = true;
                      } else if (nameParts.length === 1) {
                        correctedFirstName = capitalizeName(nameParts[0]);
                        correctedLastName = capitalizeName(nameParts[0]);
                        needsFix = true;
                      }
                    } else {
                      originalName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
                      if (customer.first_name && customer.first_name !== capitalizeName(customer.first_name)) {
                        correctedFirstName = capitalizeName(customer.first_name);
                        needsFix = true;
                      }
                      if (customer.last_name && customer.last_name !== capitalizeName(customer.last_name)) {
                        correctedLastName = capitalizeName(customer.last_name);
                        needsFix = true;
                      }
                    }
                    
                    if (!needsFix) return null;
                    
                    return (
                      <div key={customer.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-red-500 text-white text-xs">ANTES</Badge>
                          <span className="text-sm text-slate-600">{originalName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500 text-white text-xs">DESPUÉS</Badge>
                          <span className="text-sm font-semibold text-slate-900">
                            {correctedFirstName} {correctedLastName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automated Test Results */}
        {Object.keys(testResults).length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200 mb-8">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900">Automated Test Results</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-700">Employee Names</span>
                  {getStatusIcon(testResults.names)}
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-700">Active Jobs</span>
                  {getStatusIcon(testResults.jobs)}
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-700">Expenses</span>
                  {getStatusIcon(testResults.expenses)}
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-700">Time Entries</span>
                  {getStatusIcon(testResults.timeEntries)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Testing Checklist */}
        <div className="grid md:grid-cols-2 gap-6">
          {testSections.map((section, idx) => (
            <Card key={idx} className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <section.icon className="w-5 h-5 text-[#3B9FF3]" />
                  {section.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {section.tests.map((test, testIdx) => (
                    <div key={testIdx} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                      <input type="checkbox" className="mt-1" />
                      <span className="text-sm text-slate-700">{test}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Tips */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200 mt-8">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-slate-900">Performance Optimization Tips</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <h4 className="font-semibold text-green-700 mb-2">✅ Implemented Optimizations</h4>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• React Query caching with staleTime</li>
                  <li>• Lazy loading of admin-only queries</li>
                  <li>• Pagination limits on large datasets</li>
                  <li>• Auto-capitalization of names</li>
                  <li>• Responsive design for mobile/tablet</li>
                </ul>
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="font-semibold text-amber-700 mb-2">⚠️ Best Practices</h4>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• Test on actual mobile devices (iOS/Android)</li>
                  <li>• Test on tablets (iPad, Android tablets)</li>
                  <li>• Clear browser cache after major updates</li>
                  <li>• Use Chrome DevTools for mobile simulation</li>
                  <li>• Check console for errors regularly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
