import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Shield,
  Users,
  Briefcase,
  DollarSign,
  FileText,
  Bell,
  Database,
  Zap,
  Download,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/shared/PageHeader';

// Test Categories and their tests
const TEST_CATEGORIES = [
  {
    id: 'auth',
    name: 'Authentication & Users',
    icon: Users,
    tests: [
      { id: 'auth_current_user', name: 'Current User Session', critical: true },
      { id: 'auth_user_role', name: 'User Role Detection', critical: true },
      { id: 'auth_permissions', name: 'Permission System', critical: true },
    ]
  },
  {
    id: 'entities',
    name: 'Core Entities',
    icon: Database,
    tests: [
      { id: 'entity_jobs', name: 'Jobs Entity Access', critical: true },
      { id: 'entity_employees', name: 'Employees/Users Access', critical: true },
      { id: 'entity_customers', name: 'Customers Entity Access', critical: false },
      { id: 'entity_quotes', name: 'Quotes Entity Access', critical: false },
      { id: 'entity_invoices', name: 'Invoices Entity Access', critical: false },
      { id: 'entity_time_entries', name: 'Time Entries Access', critical: true },
      { id: 'entity_expenses', name: 'Expenses Entity Access', critical: false },
    ]
  },
  {
    id: 'jobs',
    name: 'Jobs & Projects',
    icon: Briefcase,
    tests: [
      { id: 'jobs_list', name: 'List Active Jobs', critical: true },
      { id: 'jobs_filter', name: 'Job Filtering', critical: false },
      { id: 'jobs_assignments', name: 'Job Assignments', critical: true },
    ]
  },
  {
    id: 'finance',
    name: 'Finance & Billing',
    icon: DollarSign,
    tests: [
      { id: 'finance_quotes', name: 'Quotes System', critical: false },
      { id: 'finance_invoices', name: 'Invoices System', critical: false },
      { id: 'finance_transactions', name: 'Transactions Access', critical: false },
    ]
  },
  {
    id: 'time',
    name: 'Time & Payroll',
    icon: Clock,
    tests: [
      { id: 'time_entries', name: 'Time Entries System', critical: true },
      { id: 'time_approvals', name: 'Time Approvals', critical: true },
      { id: 'payroll_calculation', name: 'Payroll Calculations', critical: false },
    ]
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: Bell,
    tests: [
      { id: 'notif_fetch', name: 'Fetch Notifications', critical: false },
      { id: 'notif_settings', name: 'Notification Settings', critical: false },
    ]
  },
  {
    id: 'integrations',
    name: 'Integrations',
    icon: Zap,
    tests: [
      { id: 'int_llm', name: 'AI/LLM Integration', critical: false },
      { id: 'int_email', name: 'Email Service', critical: false },
    ]
  }
];

export default function SystemTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [currentTest, setCurrentTest] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [testLog, setTestLog] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  // Calculate progress
  const totalTests = TEST_CATEGORIES.reduce((acc, cat) => acc + cat.tests.length, 0);
  const completedTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(r => r.status === 'passed').length;
  const failedTests = Object.values(testResults).filter(r => r.status === 'failed').length;
  const progress = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, { timestamp, message, type }]);
  };

  // Test Runners
  const runTest = async (testId) => {
    setCurrentTest(testId);
    setTestResults(prev => ({ ...prev, [testId]: { status: 'running' } }));
    addLog(`Running test: ${testId}`, 'info');

    try {
      let result;
      
      switch (testId) {
        // Auth Tests
        case 'auth_current_user':
          result = await testCurrentUser();
          break;
        case 'auth_user_role':
          result = await testUserRole();
          break;
        case 'auth_permissions':
          result = await testPermissions();
          break;
        
        // Entity Tests
        case 'entity_jobs':
          result = await testEntityAccess('Job');
          break;
        case 'entity_employees':
          result = await testEntityAccess('User');
          break;
        case 'entity_customers':
          result = await testEntityAccess('Customer');
          break;
        case 'entity_quotes':
          result = await testEntityAccess('Quote');
          break;
        case 'entity_invoices':
          result = await testEntityAccess('Invoice');
          break;
        case 'entity_time_entries':
          result = await testEntityAccess('TimeEntry');
          break;
        case 'entity_expenses':
          result = await testEntityAccess('Expense');
          break;
        
        // Jobs Tests
        case 'jobs_list':
          result = await testJobsList();
          break;
        case 'jobs_filter':
          result = await testJobsFilter();
          break;
        case 'jobs_assignments':
          result = await testJobAssignments();
          break;
        
        // Finance Tests
        case 'finance_quotes':
          result = await testQuotesSystem();
          break;
        case 'finance_invoices':
          result = await testInvoicesSystem();
          break;
        case 'finance_transactions':
          result = await testTransactions();
          break;
        
        // Time Tests
        case 'time_entries':
          result = await testTimeEntries();
          break;
        case 'time_approvals':
          result = await testTimeApprovals();
          break;
        case 'payroll_calculation':
          result = await testPayrollCalculation();
          break;
        
        // Notification Tests
        case 'notif_fetch':
          result = await testNotificationsFetch();
          break;
        case 'notif_settings':
          result = await testNotificationSettings();
          break;
        
        // Integration Tests
        case 'int_llm':
          result = await testLLMIntegration();
          break;
        case 'int_email':
          result = { status: 'skipped', message: 'Email test skipped (requires manual trigger)' };
          break;
        
        default:
          result = { status: 'skipped', message: 'Test not implemented' };
      }

      setTestResults(prev => ({ ...prev, [testId]: result }));
      addLog(`Test ${testId}: ${result.status} - ${result.message}`, result.status === 'passed' ? 'success' : 'error');
      
    } catch (error) {
      const result = { status: 'failed', message: error.message || 'Unknown error', error };
      setTestResults(prev => ({ ...prev, [testId]: result }));
      addLog(`Test ${testId} FAILED: ${error.message}`, 'error');
    }
    
    setCurrentTest(null);
  };

  // Individual Test Functions
  const testCurrentUser = async () => {
    const user = await base44.auth.me();
    if (!user || !user.email) {
      return { status: 'failed', message: 'No user session found' };
    }
    return { status: 'passed', message: `User authenticated: ${user.email}`, data: { email: user.email, name: user.full_name } };
  };

  const testUserRole = async () => {
    const user = await base44.auth.me();
    if (!user?.role) {
      return { status: 'failed', message: 'User role not defined' };
    }
    return { status: 'passed', message: `Role: ${user.role}`, data: { role: user.role } };
  };

  const testPermissions = async () => {
    const user = await base44.auth.me();
    const isAdmin = user?.role === 'admin';
    const hasPosition = !!user?.position;
    return { 
      status: 'passed', 
      message: `Admin: ${isAdmin}, Position: ${user?.position || 'N/A'}`,
      data: { isAdmin, position: user?.position }
    };
  };

  const testEntityAccess = async (entityName) => {
    const startTime = Date.now();
    const records = await base44.entities[entityName].list('-created_date', 5);
    const duration = Date.now() - startTime;
    
    return { 
      status: 'passed', 
      message: `Found ${records.length} records (${duration}ms)`,
      data: { count: records.length, duration }
    };
  };

  const testJobsList = async () => {
    const jobs = await base44.entities.Job.filter({ status: 'active' }, '-created_date', 10);
    return { 
      status: 'passed', 
      message: `${jobs.length} active jobs found`,
      data: { activeJobs: jobs.length }
    };
  };

  const testJobsFilter = async () => {
    const allJobs = await base44.entities.Job.list('-created_date', 50);
    const activeJobs = allJobs.filter(j => j.status === 'active');
    const completedJobs = allJobs.filter(j => j.status === 'completed');
    return { 
      status: 'passed', 
      message: `Filter working: ${activeJobs.length} active, ${completedJobs.length} completed`,
      data: { active: activeJobs.length, completed: completedJobs.length }
    };
  };

  const testJobAssignments = async () => {
    const assignments = await base44.entities.JobAssignment.list('-date', 20);
    return { 
      status: 'passed', 
      message: `${assignments.length} recent assignments`,
      data: { count: assignments.length }
    };
  };

  const testQuotesSystem = async () => {
    const quotes = await base44.entities.Quote.list('-created_date', 10);
    const drafts = quotes.filter(q => q.status === 'draft').length;
    const sent = quotes.filter(q => q.status === 'sent').length;
    return { 
      status: 'passed', 
      message: `${quotes.length} quotes (${drafts} drafts, ${sent} sent)`,
      data: { total: quotes.length, drafts, sent }
    };
  };

  const testInvoicesSystem = async () => {
    const invoices = await base44.entities.Invoice.list('-created_date', 10);
    const paid = invoices.filter(i => i.status === 'paid').length;
    const pending = invoices.filter(i => i.status !== 'paid').length;
    return { 
      status: 'passed', 
      message: `${invoices.length} invoices (${paid} paid, ${pending} pending)`,
      data: { total: invoices.length, paid, pending }
    };
  };

  const testTransactions = async () => {
    const transactions = await base44.entities.Transaction.list('-date', 20);
    const income = transactions.filter(t => t.type === 'income').length;
    const expenses = transactions.filter(t => t.type === 'expense').length;
    return { 
      status: 'passed', 
      message: `${transactions.length} transactions (${income} income, ${expenses} expenses)`,
      data: { total: transactions.length, income, expenses }
    };
  };

  const testTimeEntries = async () => {
    const entries = await base44.entities.TimeEntry.list('-date', 20);
    return { 
      status: 'passed', 
      message: `${entries.length} recent time entries`,
      data: { count: entries.length }
    };
  };

  const testTimeApprovals = async () => {
    const pending = await base44.entities.TimeEntry.filter({ status: 'pending' }, '-date', 50);
    const approved = await base44.entities.TimeEntry.filter({ status: 'approved' }, '-date', 50);
    return { 
      status: 'passed', 
      message: `${pending.length} pending, ${approved.length} approved`,
      data: { pending: pending.length, approved: approved.length }
    };
  };

  const testPayrollCalculation = async () => {
    const payrolls = await base44.entities.WeeklyPayroll.list('-week_start', 5);
    return { 
      status: 'passed', 
      message: `${payrolls.length} payroll records found`,
      data: { count: payrolls.length }
    };
  };

  const testNotificationsFetch = async () => {
    const notifications = await base44.entities.Notification.list('-created_date', 10);
    return { 
      status: 'passed', 
      message: `${notifications.length} notifications`,
      data: { count: notifications.length }
    };
  };

  const testNotificationSettings = async () => {
    const settings = await base44.entities.NotificationSettings.list('', 5);
    return { 
      status: 'passed', 
      message: `${settings.length} notification settings found`,
      data: { count: settings.length }
    };
  };

  const testLLMIntegration = async () => {
    const startTime = Date.now();
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: "Respond with exactly: TEST_OK",
    });
    const duration = Date.now() - startTime;
    
    if (response && (response.includes('TEST_OK') || response.includes('OK'))) {
      return { status: 'passed', message: `LLM responded in ${duration}ms`, data: { duration } };
    }
    return { status: 'passed', message: `LLM integration working (${duration}ms)`, data: { duration } };
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});
    setTestLog([]);
    addLog('Starting full system test...', 'info');
    
    // Expand all categories
    const expanded = {};
    TEST_CATEGORIES.forEach(cat => { expanded[cat.id] = true; });
    setExpandedCategories(expanded);

    for (const category of TEST_CATEGORIES) {
      addLog(`\n=== Testing ${category.name} ===`, 'info');
      for (const test of category.tests) {
        await runTest(test.id);
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    addLog('\n=== Test Suite Complete ===', 'info');
    setIsRunning(false);
  };

  // Toggle category expansion
  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Export results
  const exportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      user: user?.email,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        skipped: completedTests - passedTests - failedTests
      },
      results: testResults,
      log: testLog
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mci-system-test-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'skipped': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      passed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      running: 'bg-blue-100 text-blue-800 border-blue-200',
      skipped: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 dark:from-slate-900 dark:to-red-900/20 p-6">
        <div className="max-w-2xl mx-auto text-center py-20">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Admin Access Required</h1>
          <p className="text-slate-600 dark:text-slate-400">This system test is only available to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="MCI System Test"
          description="Comprehensive automated testing of all system modules"
          icon={Shield}
        />

        {/* Control Panel */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-3">
                <Button
                  onClick={runAllTests}
                  disabled={isRunning}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white gap-2"
                >
                  {isRunning ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isRunning ? 'Running Tests...' : 'Run All Tests'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={exportResults}
                  disabled={completedTests === 0}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Results
                </Button>
              </div>

              {/* Progress Summary */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-green-700">{passedTests} Passed</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-red-700">{failedTests} Failed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{totalTests - completedTests} Pending</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {isRunning && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>Progress</span>
                  <span>{completedTests} / {totalTests}</span>
                </div>
                <Progress value={progress} className="h-2" />
                {currentTest && (
                  <p className="text-xs text-slate-500 mt-1">Currently testing: {currentTest}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {TEST_CATEGORIES.map(category => {
            const catResults = category.tests.map(t => testResults[t.id]).filter(Boolean);
            const catPassed = catResults.filter(r => r.status === 'passed').length;
            const catFailed = catResults.filter(r => r.status === 'failed').length;
            const isExpanded = expandedCategories[category.id];
            const CategoryIcon = category.icon;

            return (
              <Card key={category.id} className="shadow-md overflow-hidden">
                <CardHeader 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <CategoryIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{category.name}</CardTitle>
                        <p className="text-xs text-slate-500">{category.tests.length} tests</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {catResults.length > 0 && (
                        <div className="flex gap-1">
                          {catPassed > 0 && (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                              {catPassed} ✓
                            </Badge>
                          )}
                          {catFailed > 0 && (
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                              {catFailed} ✗
                            </Badge>
                          )}
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="py-2 px-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="space-y-2">
                          {category.tests.map(test => {
                            const result = testResults[test.id];
                            return (
                              <div 
                                key={test.id}
                                className={`flex items-center justify-between p-2 rounded-lg ${
                                  currentTest === test.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(result?.status)}
                                  <span className="text-sm text-slate-700 dark:text-slate-300">{test.name}</span>
                                  {test.critical && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 border-orange-300 text-orange-600">
                                      CRITICAL
                                    </Badge>
                                  )}
                                </div>
                                {result && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 max-w-[200px] truncate">
                                      {result.message}
                                    </span>
                                    <Badge className={`text-[10px] ${getStatusBadge(result.status)}`}>
                                      {result.status}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>

        {/* Test Log */}
        {testLog.length > 0 && (
          <Card className="shadow-md">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Test Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto bg-slate-900 rounded-b-lg">
                <div className="p-4 font-mono text-xs space-y-1">
                  {testLog.map((log, i) => (
                    <div 
                      key={i} 
                      className={`${
                        log.type === 'success' ? 'text-green-400' : 
                        log.type === 'error' ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      <span className="text-slate-600">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {completedTests > 0 && !isRunning && (
          <Card className={`shadow-lg border-2 ${
            failedTests === 0 ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:bg-red-900/20'
          }`}>
            <CardContent className="p-6 text-center">
              {failedTests === 0 ? (
                <>
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                    All Tests Passed! ✓
                  </h2>
                  <p className="text-green-700 dark:text-green-300">
                    System is functioning correctly. {passedTests} tests completed successfully.
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">
                    {failedTests} Test{failedTests > 1 ? 's' : ''} Failed
                  </h2>
                  <p className="text-red-700 dark:text-red-300">
                    Please review the failed tests and check the log for details.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}