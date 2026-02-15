import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, PlayCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Automated Test Runner for Critical Flows
 * Run tests directly from the UI
 */

const TEST_SUITES = {
  'Clock In/Out': async () => {
    const tests = [];
    
    // Test 1: Create time entry
    try {
      const entry = await base44.entities.TimeEntry.create({
        employee_email: 'test@mci-us.com',
        employee_name: 'Test User',
        date: new Date().toISOString().split('T')[0],
        check_in: '08:00:00',
        job_id: 'test_job',
        job_name: 'Test Job'
      });
      tests.push({ name: 'Create time entry', passed: !!entry.id });
    } catch (error) {
      tests.push({ name: 'Create time entry', passed: false, error: error.message });
    }
    
    // Test 2: GPS validation
    try {
      const { validateTimeEntryGeofence } = await import('@/functions/validateTimeEntryGeofence');
      const result = await validateTimeEntryGeofence({
        time_entry_id: 'test_id',
        job_latitude: 33.7490,
        job_longitude: -84.3880,
        check_in_latitude: 33.7491,
        check_in_longitude: -84.3881,
        geofence_radius: 100
      });
      tests.push({ name: 'GPS geofence validation', passed: result.data?.validated === true });
    } catch (error) {
      tests.push({ name: 'GPS geofence validation', passed: false, error: error.message });
    }
    
    return tests;
  },
  
  'Invoice Flow': async () => {
    const tests = [];
    
    // Test 1: Generate invoice number
    try {
      const { generateInvoiceNumber } = await import('@/functions/generateInvoiceNumber');
      const result = await generateInvoiceNumber({});
      tests.push({ name: 'Generate invoice number', passed: result.data?.invoice_number?.startsWith('INV-') });
    } catch (error) {
      tests.push({ name: 'Generate invoice number', passed: false, error: error.message });
    }
    
    // Test 2: Calculate totals
    try {
      const items = [
        { quantity: 2, unit_price: 100 },
        { quantity: 3, unit_price: 50 }
      ];
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = (subtotal * 7) / 100;
      const total = subtotal + taxAmount;
      
      tests.push({ 
        name: 'Calculate invoice totals', 
        passed: subtotal === 350 && taxAmount === 24.5 && total === 374.5 
      });
    } catch (error) {
      tests.push({ name: 'Calculate invoice totals', passed: false, error: error.message });
    }
    
    return tests;
  },
  
  'Quote to Invoice': async () => {
    const tests = [];
    
    // Test 1: Quote number generation
    try {
      const { generateQuoteNumber } = await import('@/functions/generateQuoteNumber');
      const result = await generateQuoteNumber({});
      tests.push({ name: 'Generate quote number', passed: !!result.quote_number || !!result.data?.quote_number });
    } catch (error) {
      tests.push({ name: 'Generate quote number', passed: false, error: error.message });
    }
    
    return tests;
  }
};

export const TestRunner = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState({});

  const runAllTests = async () => {
    setRunning(true);
    const allResults = {};
    
    for (const [suiteName, testFn] of Object.entries(TEST_SUITES)) {
      try {
        allResults[suiteName] = await testFn();
      } catch (error) {
        allResults[suiteName] = [{ name: 'Suite execution', passed: false, error: error.message }];
      }
    }
    
    setResults(allResults);
    setRunning(false);
  };

  const totalTests = Object.values(results).flat().length;
  const passedTests = Object.values(results).flat().filter(t => t.passed).length;

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Automated Tests</span>
          <Button
            onClick={runAllTests}
            disabled={running}
            size="sm"
            className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalTests > 0 && (
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <p className="text-sm font-semibold">
              {passedTests}/{totalTests} tests passed
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          {Object.entries(results).map(([suiteName, tests]) => (
            <div key={suiteName}>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">{suiteName}</h3>
              <div className="space-y-1">
                {tests.map((test, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {test.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={test.passed ? 'text-slate-700 dark:text-slate-300' : 'text-red-600'}>
                      {test.name}
                    </span>
                    {test.error && (
                      <span className="text-xs text-red-500">({test.error})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};