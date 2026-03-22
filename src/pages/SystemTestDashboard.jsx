import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Play, 
  RotateCw, 
  Shield,
  FileCheck,
  Users,
  Settings,
  Loader2
} from 'lucide-react';
import { testPhases1to4 } from '@/functions/testPhases1to4';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function SystemTestDashboard() {
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const runTests = async () => {
    setIsRunning(true);
    try {
      const response = await testPhases1to4({});
      setTestResults(response);
    } catch (error) {
      console.error('Test execution failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'FAIL':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'WARN':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      PASS: 'soft-green-gradient',
      FAIL: 'soft-red-gradient',
      WARN: 'soft-amber-gradient',
      ERROR: 'soft-red-gradient',
      PASS_WITH_WARNINGS: 'soft-amber-gradient'
    };
    return <Badge className={variants[status] || 'soft-slate-gradient'}>{status}</Badge>;
  };

  const phaseIcons = {
    'FASE 1: User Entity Role Enum': Shield,
    'FASE 2: Permission Helpers Centralization': FileCheck,
    'FASE 3: Role-Specific Dashboards': Users,
    'FASE 4: Backend Strict Role Enforcement': Settings
  };

  if (!user || !['admin', 'ceo'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-900 p-6 flex items-center justify-center">
        <Alert className="max-w-md border-red-200 dark:border-red-900/30">
          <Shield className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-600 dark:text-red-400">
            Admin access required to run system tests.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-900 p-6 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            System Test Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Comprehensive validation of Phases 1-4 security architecture
          </p>
        </div>

        {/* Test Control Panel */}
        <Card className="mb-6 border-2 border-blue-200 dark:border-blue-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-blue-600" />
              Test Suite Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                onClick={runTests}
                disabled={isRunning}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run All Tests
                  </>
                )}
              </Button>
              {testResults && !isRunning && (
                <Button
                  onClick={runTests}
                  variant="outline"
                  className="border-slate-300 dark:border-slate-600"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Re-run
                </Button>
              )}
              {testResults?.summary && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Overall Status:
                  </span>
                  {getStatusBadge(testResults.summary.overall_status)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults && !testResults.error && (
          <>
            {/* Summary Card */}
            <Card className="mb-6 border-2 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg">Test Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                      {testResults.summary.total_tests}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Total Tests
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {testResults.summary.passed}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Passed
                    </div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-amber-600">
                      {testResults.summary.warnings}
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Warnings
                    </div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-red-600">
                      {testResults.summary.failed}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Failed
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Success Rate: <span className="font-bold text-slate-900 dark:text-white">{testResults.summary.success_rate}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Executed at: {new Date(testResults.executed_at).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phase Results */}
            <div className="space-y-6">
              {testResults.tests.map((phase, idx) => {
                const PhaseIcon = phaseIcons[phase.name] || Shield;
                
                return (
                  <Card key={idx} className="border-2 border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <PhaseIcon className="w-6 h-6 text-blue-600" />
                          <CardTitle className="text-base">{phase.name}</CardTitle>
                        </div>
                        {getStatusBadge(phase.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {phase.error ? (
                        <Alert className="border-red-200 dark:border-red-900/30">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <AlertDescription className="text-red-600 dark:text-red-400">
                            {phase.error}
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-3">
                          {phase.details.map((test, testIdx) => (
                            <div 
                              key={testIdx} 
                              className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1">
                                  {getStatusIcon(test.status)}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-slate-900 dark:text-white mb-1">
                                      {test.test}
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                                      <span className="font-medium">Expected:</span> {test.expected}
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                      <span className="font-medium">Actual:</span> {test.actual}
                                    </div>
                                    {test.notes && (
                                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                        ℹ️ {test.notes}
                                      </div>
                                    )}
                                    {test.invalid_users && test.invalid_users.length > 0 && (
                                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-900/30">
                                        <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                                          ⚠️ Invalid Users Found:
                                        </div>
                                        <div className="space-y-1">
                                          {test.invalid_users.map((u, i) => (
                                            <div key={i} className="text-xs text-red-600 dark:text-red-400">
                                              {u.email} - Role: "{u.role}"
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {getStatusBadge(test.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Error State */}
        {testResults?.error && (
          <Alert className="border-red-200 dark:border-red-900/30">
            <XCircle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-600 dark:text-red-400">
              <div className="font-medium mb-1">Test Execution Failed</div>
              <div className="text-sm">{testResults.error}</div>
            </AlertDescription>
          </Alert>
        )}

        {/* Initial State */}
        {!testResults && !isRunning && (
          <Card className="border-2 border-blue-200 dark:border-blue-900/30">
            <CardContent className="py-12">
              <div className="text-center">
                <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Ready to Test
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Click "Run All Tests" to validate your security architecture
                </p>
                <div className="space-y-2 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Shield className="w-4 h-4 text-blue-600" />
                    FASE 1: User role enum validation
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    FASE 2: Permission helpers centralization
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Users className="w-4 h-4 text-blue-600" />
                    FASE 3: Role-specific dashboards
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Settings className="w-4 h-4 text-blue-600" />
                    FASE 4: Backend strict enforcement
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}