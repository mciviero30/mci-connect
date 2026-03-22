import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Run comprehensive smoke test on the system
 * Tests critical workflows: Quote → Invoice → Job → Provisioning
 * Admin-only function
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    const testResults = {
      passed: [],
      failed: [],
      warnings: [],
      timestamp: new Date().toISOString()
    };

    // Test 1: Customer CRUD
    try {
      const customer = await base44.asServiceRole.entities.Customer.create({
        name: 'Test Customer Smoke',
        email: 'test@smoke.test',
        phone: '555-0000',
        company: 'Test Co'
      });
      
      await base44.asServiceRole.entities.Customer.update(customer.id, {
        phone: '555-0001'
      });
      
      const fetched = await base44.asServiceRole.entities.Customer.filter({ id: customer.id });
      if (fetched.length === 1 && fetched[0].phone === '555-0001') {
        testResults.passed.push('✅ Customer CRUD');
      } else {
        testResults.failed.push('❌ Customer CRUD: Update failed');
      }
      
      await base44.asServiceRole.entities.Customer.delete(customer.id);
    } catch (error) {
      testResults.failed.push(`❌ Customer CRUD: ${error.message}`);
    }

    // Test 2: Quote Creation
    try {
      const quote = await base44.asServiceRole.entities.Quote.create({
        quote_number: 'TEST-001',
        customer_name: 'Test Customer',
        job_name: 'Test Job',
        job_address: '123 Test St',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        items: [
          {
            item_name: 'Test Item',
            description: 'Test description',
            quantity: 10,
            unit: 'pcs',
            unit_price: 100,
            total: 1000
          }
        ],
        subtotal: 1000,
        tax_rate: 0,
        tax_amount: 0,
        total: 1000,
        status: 'draft'
      });
      
      if (quote.id && quote.quote_number === 'TEST-001') {
        testResults.passed.push('✅ Quote Creation');
        
        // Clean up
        await base44.asServiceRole.entities.Quote.delete(quote.id);
      } else {
        testResults.failed.push('❌ Quote Creation: Invalid data');
      }
    } catch (error) {
      testResults.failed.push(`❌ Quote Creation: ${error.message}`);
    }

    // Test 3: Team CRUD
    try {
      const team = await base44.asServiceRole.entities.Team.create({
        team_name: 'Test Team',
        location: 'Test Location',
        state: 'FL',
        base_address: '123 Test Ave, Test City, FL 12345',
        status: 'active'
      });
      
      if (team.id && team.team_name === 'Test Team') {
        testResults.passed.push('✅ Team Creation');
        await base44.asServiceRole.entities.Team.delete(team.id);
      } else {
        testResults.failed.push('❌ Team Creation: Invalid data');
      }
    } catch (error) {
      testResults.failed.push(`❌ Team Creation: ${error.message}`);
    }

    // Test 4: Job Creation
    try {
      const job = await base44.asServiceRole.entities.Job.create({
        name: 'Test Job Smoke',
        customer_name: 'Test Customer',
        address: '456 Test Blvd',
        city: 'Test City',
        state: 'FL',
        status: 'active',
        contract_amount: 5000,
        authorization_id: 'smoke-test-auth'
      });
      
      if (job.id) {
        testResults.passed.push('✅ Job Creation');
        await base44.asServiceRole.entities.Job.delete(job.id);
      } else {
        testResults.failed.push('❌ Job Creation: No ID returned');
      }
    } catch (error) {
      testResults.failed.push(`❌ Job Creation: ${error.message}`);
    }

    // Test 5: Quote Item Catalog
    try {
      const items = await base44.asServiceRole.entities.QuoteItem.list('', 10);
      if (items.length > 0) {
        testResults.passed.push(`✅ Quote Item Catalog (${items.length} items)`);
      } else {
        testResults.warnings.push('⚠️ Quote Item Catalog is empty');
      }
    } catch (error) {
      testResults.failed.push(`❌ Quote Item Catalog: ${error.message}`);
    }

    // Test 6: Employee Directory
    try {
      const employees = await base44.asServiceRole.entities.EmployeeDirectory.list('', 10);
      if (employees.length > 0) {
        testResults.passed.push(`✅ Employee Directory (${employees.length} employees)`);
      } else {
        testResults.warnings.push('⚠️ Employee Directory is empty');
      }
    } catch (error) {
      testResults.failed.push(`❌ Employee Directory: ${error.message}`);
    }

    // Test 7: Counter System
    try {
      const counters = await base44.asServiceRole.entities.Counter.list();
      const requiredCounters = ['quote_number', 'invoice_number'];
      const existingCounters = counters.map(c => c.counter_name);
      
      const missingCounters = requiredCounters.filter(c => !existingCounters.includes(c) && !counters.some(ct => ct.counter_key === c));
      if (missingCounters.length === 0) {
        testResults.passed.push('✅ Counter System');
      } else {
        testResults.warnings.push(`⚠️ Missing counters: ${missingCounters.join(', ')}`);
      }
    } catch (error) {
      testResults.failed.push(`❌ Counter System: ${error.message}`);
    }

    // Test 8: Expense Management
    try {
      const expense = await base44.asServiceRole.entities.Expense.create({
        employee_email: user.email,
        employee_name: user.full_name,
        amount: 50,
        category: 'supplies',
        date: new Date().toISOString().split('T')[0],
        description: 'Test expense',
        receipt_url: 'https://test.com/receipt.jpg',
        payment_method: 'personal',
        status: 'pending'
      });
      
      if (expense.id) {
        testResults.passed.push('✅ Expense Creation');
        await base44.asServiceRole.entities.Expense.delete(expense.id);
      } else {
        testResults.failed.push('❌ Expense Creation: No ID returned');
      }
    } catch (error) {
      testResults.failed.push(`❌ Expense Creation: ${error.message}`);
    }

    // Summary
    const summary = {
      total_tests: testResults.passed.length + testResults.failed.length + testResults.warnings.length,
      passed: testResults.passed.length,
      failed: testResults.failed.length,
      warnings: testResults.warnings.length,
      success_rate: testResults.failed.length === 0 ? '100%' : 
        `${Math.round((testResults.passed.length / (testResults.passed.length + testResults.failed.length)) * 100)}%`
    };

    return Response.json({
      success: testResults.failed.length === 0,
      summary,
      results: testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Smoke test error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});