import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import AutoPayrollCalculator from '@/components/payroll/AutoPayrollCalculator';
import PaystubGenerator from '@/components/payroll/PaystubGenerator';
import CashFlowForecast from '@/components/financial/CashFlowForecast';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  TrendingUp, 
  FileText,
  Zap,
  Brain
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export default function PayrollAutoFlow() {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showPaystub, setShowPaystub] = useState(false);
  const [payrollData, setPayrollData] = useState(null);

  const weekStart = format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: employees = [] } = useQuery({
    queryKey: ['payrollAutoFlowEmployees'],
    queryFn: () => base44.entities.EmployeeDirectory.filter({ status: 'active' }, 'full_name', 200),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const handleGeneratePaystub = (employee, data) => {
    setPayrollData({
      employee,
      ...data
    });
    setShowPaystub(true);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Payroll Auto-Flow"
          description="Zero manual entry - intelligent payroll calculation"
          icon={Zap}
          appBadge="AI-POWERED"
        />

        {/* Week Selector */}
        <Card className="mb-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Calendar className="w-5 h-5 text-blue-600" />
              Select Pay Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                type="week"
                value={format(selectedWeek, 'yyyy-\'W\'ww')}
                onChange={(e) => setSelectedWeek(new Date(e.target.value))}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <Badge className="bg-blue-100 text-blue-700">
                {weekStart} → {weekEnd}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Forecast */}
        <div className="mb-8">
          <CashFlowForecast days={30} />
        </div>

        {/* Employee Payroll Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Employee Payroll ({employees.length})
            </h2>
            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
              <Brain className="w-3 h-3 mr-1" />
              Auto-Calculated
            </Badge>
          </div>

          {employees.map(employee => (
            <Card key={employee.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {employee.profile_photo_url || employee.avatar_image_url ? (
                      <img
                        src={employee.preferred_profile_image === 'avatar' && employee.avatar_image_url 
                          ? employee.avatar_image_url 
                          : employee.profile_photo_url}
                        alt={employee.full_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-400/30"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold">
                        {employee.full_name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{employee.full_name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{employee.position || 'Employee'}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedEmployee(employee);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Paystub
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <AutoPayrollCalculator
                  employeeEmail={employee.email}
                  weekStart={weekStart}
                  weekEnd={weekEnd}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Paystub Generator */}
      {selectedEmployee && payrollData && (
        <PaystubGenerator
          open={showPaystub}
          onOpenChange={setShowPaystub}
          payrollData={payrollData}
          weekStart={weekStart}
          weekEnd={weekEnd}
        />
      )}
    </div>
  );
}