import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Search, Wrench, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const FixEmployeeDialog = ({ employee, onClose }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    first_name: employee.suggested_fix?.first_name || employee.first_name || '',
    last_name: employee.suggested_fix?.last_name || employee.last_name || '',
    full_name: employee.suggested_fix?.full_name || employee.full_name || ''
  });

  const fixMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('fixEmployeeData', {
        employeeId: employee.id,
        type: employee.type,
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: formData.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeAudit'] });
      alert('✅ Employee data corrected successfully');
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <Alert className="bg-red-50 border-red-200">
        <AlertDescription className="text-red-800 text-sm">
          <strong>Current Issues:</strong> {employee.problems.join(', ')}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        <div>
          <Label>Email (read-only)</Label>
          <Input value={employee.email} disabled className="bg-slate-100" />
        </div>

        <div>
          <Label>First Name</Label>
          <Input 
            value={formData.first_name}
            onChange={(e) => setFormData({...formData, first_name: e.target.value})}
            placeholder="Enter correct first name"
          />
        </div>

        <div>
          <Label>Last Name</Label>
          <Input 
            value={formData.last_name}
            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            placeholder="Enter correct last name"
          />
        </div>

        <div>
          <Label>Full Name</Label>
          <Input 
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            placeholder="Auto-generated from first + last"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={() => fixMutation.mutate()}
          disabled={fixMutation.isPending || !formData.first_name || !formData.last_name}
          className="bg-green-600 hover:bg-green-700"
        >
          {fixMutation.isPending ? 'Fixing...' : 'Fix Data'}
        </Button>
      </div>
    </div>
  );
};

export default function EmployeeDataAudit() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const hasAccess = currentUser?.role === 'admin' || currentUser?.position === 'CEO';

  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['employeeAudit'],
    queryFn: async () => {
      const response = await base44.functions.invoke('auditEmployeeData');
      return response.data;
    },
    enabled: hasAccess,
    staleTime: 30000
  });

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-slate-600">Only admins can access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredIssues = auditData?.issues?.filter(issue => 
    !searchTerm || 
    issue.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-md">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            Employee Data Audit
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 ml-[60px]">
            Review and fix incorrect employee information
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-slate-600">Running audit...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-slate-600">Total Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{auditData?.total_users + auditData?.total_pending || 0}</p>
                </CardContent>
              </Card>

              <Card className={auditData?.issues_found > 0 ? "border-red-500" : "border-green-500"}>
                <CardHeader>
                  <CardTitle className="text-sm text-slate-600">Issues Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${auditData?.issues_found > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {auditData?.issues_found || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-center justify-center">
                  <Button 
                    onClick={() => refetch()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Re-run Audit
                  </Button>
                </CardContent>
              </Card>
            </div>

            {auditData?.issues_found > 0 ? (
              <>
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        placeholder="Search by email or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {filteredIssues.map((issue) => (
                    <Card key={issue.id} className="border-red-200">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Badge variant="outline" className="bg-slate-100">
                                {issue.type}
                              </Badge>
                              <Badge className="bg-red-100 text-red-800">
                                {issue.problems.length} issue{issue.problems.length > 1 ? 's' : ''}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-sm font-semibold text-slate-700">Current Data</p>
                                <p className="text-xs text-slate-500">Email: {issue.email}</p>
                                <p className="text-xs text-slate-500">First: {issue.first_name || '(empty)'}</p>
                                <p className="text-xs text-slate-500">Last: {issue.last_name || '(empty)'}</p>
                                <p className="text-xs text-slate-500">Full: {issue.full_name || '(empty)'}</p>
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-green-700">Suggested Fix</p>
                                <p className="text-xs text-slate-500">First: {issue.suggested_fix?.first_name || '(empty)'}</p>
                                <p className="text-xs text-slate-500">Last: {issue.suggested_fix?.last_name || '(empty)'}</p>
                                <p className="text-xs text-slate-500">Full: {issue.suggested_fix?.full_name || '(empty)'}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {issue.problems.map((problem) => (
                                <Badge key={problem} variant="destructive" className="text-xs">
                                  {problem.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <Button
                            onClick={() => setSelectedEmployee(issue)}
                            className="bg-green-600 hover:bg-green-700 ml-4"
                          >
                            <Wrench className="w-4 h-4 mr-2" />
                            Fix
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">All Clear!</h3>
                  <p className="text-slate-600">No data issues found in employee records.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fix Employee Data: {selectedEmployee?.email}</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <FixEmployeeDialog 
              employee={selectedEmployee} 
              onClose={() => setSelectedEmployee(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}