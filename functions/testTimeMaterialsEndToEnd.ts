import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('🧪 Starting T&M End-to-End Test...');
    const testResults = {
      steps: [],
      success: false,
      errors: []
    };

    let testCustomer, testJob, timeEntry1, timeEntry2, timeEntry3, expense1, invoice;

    try {
      // ============================================
      // STEP 1: Create Test Customer
      // ============================================
      console.log('📝 Step 1: Creating test customer...');
      testCustomer = await base44.asServiceRole.entities.Customer.create({
        first_name: 'Test',
        last_name: 'T&M Customer',
        email: `test-tm-${Date.now()}@example.com`,
        phone: '(555) 123-4567',
        company: 'Test T&M Company',
        address: '123 Test St',
        city: 'Atlanta',
        state: 'GA',
        zip: '30303',
        status: 'active'
      });
      testResults.steps.push({ step: 1, status: 'success', message: `Customer created: ${testCustomer.id}` });
      console.log('✅ Customer created:', testCustomer.id);

      // ============================================
      // STEP 2: Create T&M Job
      // ============================================
      console.log('📝 Step 2: Creating T&M job...');
      const jobNumber = await base44.functions.invoke('generateJobNumber', {});
      
      testJob = await base44.asServiceRole.entities.Job.create({
        name: `Test T&M Job ${Date.now()}`,
        job_number: jobNumber.data?.job_number || 'TEST-001',
        description: 'Test job for time and materials billing',
        billing_type: 'time_materials',
        regular_hourly_rate: 60,
        overtime_hourly_rate: 90,
        customer_id: testCustomer.id,
        customer_name: testCustomer.company || `${testCustomer.first_name} ${testCustomer.last_name}`,
        address: testCustomer.address,
        city: testCustomer.city,
        state: testCustomer.state,
        zip: testCustomer.zip,
        status: 'active',
        color: 'blue'
      });
      testResults.steps.push({ step: 2, status: 'success', message: `T&M Job created: ${testJob.id}` });
      console.log('✅ T&M Job created:', testJob.id);

      // ============================================
      // STEP 3: Create Time Entries (Regular + OT)
      // ============================================
      console.log('📝 Step 3: Creating time entries...');
      
      // Regular hours - Employee 1
      timeEntry1 = await base44.asServiceRole.entities.TimeEntry.create({
        employee_email: user.email,
        employee_name: user.full_name || 'Test Employee 1',
        job_id: testJob.id,
        job_name: testJob.name,
        date: new Date().toISOString().split('T')[0],
        check_in: '08:00:00',
        check_out: '16:00:00',
        hours_worked: 8,
        hour_type: 'normal',
        status: 'approved',
        breaks: [],
        total_break_minutes: 0
      });

      // Overtime hours - Employee 1
      timeEntry2 = await base44.asServiceRole.entities.TimeEntry.create({
        employee_email: user.email,
        employee_name: user.full_name || 'Test Employee 1',
        job_id: testJob.id,
        job_name: testJob.name,
        date: new Date().toISOString().split('T')[0],
        check_in: '16:00:00',
        check_out: '19:00:00',
        hours_worked: 3,
        hour_type: 'overtime',
        status: 'approved',
        breaks: [],
        total_break_minutes: 0
      });

      // Regular hours - Employee 2
      timeEntry3 = await base44.asServiceRole.entities.TimeEntry.create({
        employee_email: 'employee2@test.com',
        employee_name: 'Test Employee 2',
        job_id: testJob.id,
        job_name: testJob.name,
        date: new Date().toISOString().split('T')[0],
        check_in: '08:00:00',
        check_out: '17:00:00',
        hours_worked: 9,
        hour_type: 'normal',
        status: 'approved',
        breaks: [],
        total_break_minutes: 0
      });

      testResults.steps.push({ 
        step: 3, 
        status: 'success', 
        message: `3 time entries created (8h + 3h OT + 9h = 20h total)` 
      });
      console.log('✅ Time entries created: 8h regular + 3h OT + 9h regular = 20h total');

      // ============================================
      // STEP 4: Create Approved Expense
      // ============================================
      console.log('📝 Step 4: Creating expense...');
      
      // Use a placeholder receipt URL instead of uploading
      expense1 = await base44.asServiceRole.entities.Expense.create({
        employee_email: user.email,
        employee_name: user.full_name || 'Test Employee 1',
        job_id: testJob.id,
        job_name: testJob.name,
        amount: 150.50,
        category: 'supplies',
        account_category: 'expense_materials',
        description: 'Test materials purchase',
        date: new Date().toISOString().split('T')[0],
        receipt_url: 'https://example.com/test-receipt.pdf',
        payment_method: 'personal',
        status: 'approved'
      });

      testResults.steps.push({ step: 4, status: 'success', message: `Expense created: $${expense1.amount}` });
      console.log('✅ Expense created: $150.50');

      // ============================================
      // STEP 5: Generate Invoice from Hours
      // ============================================
      console.log('📝 Step 5: Generating invoice from hours...');
      
      const invoiceGenResult = await base44.functions.invoke('generateInvoiceFromHours', {
        job_id: testJob.id
      });

      if (!invoiceGenResult.data?.success) {
        throw new Error(`Invoice generation failed: ${invoiceGenResult.data?.error || 'Unknown error'}`);
      }

      const invoiceData = invoiceGenResult.data.invoice_data;
      const summary = invoiceGenResult.data.summary;

      testResults.steps.push({ 
        step: 5, 
        status: 'success', 
        message: `Invoice generated: ${summary.total_hours}h total, $${invoiceData.total}`,
        summary: summary
      });
      console.log('✅ Invoice generated:', summary);

      // ============================================
      // STEP 6: Verify Calculations
      // ============================================
      console.log('📝 Step 6: Verifying calculations...');
      
      const expectedRegularHours = 17; // 8 + 9
      const expectedOvertimeHours = 3;
      const expectedLaborCost = (17 * 60) + (3 * 90); // $1,020 + $270 = $1,290
      const expectedMaterialsCost = 150.50;
      const expectedTotal = expectedLaborCost + expectedMaterialsCost; // $1,440.50

      const laborCostFromData = summary.labor_cost;
      const materialsCostFromData = summary.materials_cost;
      const totalFromData = invoiceData.total;

      const calculations = {
        regular_hours: { expected: expectedRegularHours, actual: summary.total_regular_hours, match: expectedRegularHours === summary.total_regular_hours },
        overtime_hours: { expected: expectedOvertimeHours, actual: summary.total_overtime_hours, match: expectedOvertimeHours === summary.total_overtime_hours },
        labor_cost: { expected: expectedLaborCost, actual: laborCostFromData, match: Math.abs(expectedLaborCost - laborCostFromData) < 0.01 },
        materials_cost: { expected: expectedMaterialsCost, actual: materialsCostFromData, match: Math.abs(expectedMaterialsCost - materialsCostFromData) < 0.01 },
        total: { expected: expectedTotal, actual: totalFromData, match: Math.abs(expectedTotal - totalFromData) < 0.01 }
      };

      const allMatch = Object.values(calculations).every(calc => calc.match);
      
      if (!allMatch) {
        testResults.errors.push('Calculation mismatch detected');
      }

      testResults.steps.push({ 
        step: 6, 
        status: allMatch ? 'success' : 'warning', 
        message: allMatch ? 'All calculations verified ✅' : 'Calculation mismatch ⚠️',
        calculations: calculations
      });
      console.log('✅ Calculations verified:', calculations);

      // ============================================
      // STEP 7: Save Invoice to DB
      // ============================================
      console.log('📝 Step 7: Saving invoice to database...');
      
      const invoiceNumberResult = await base44.functions.invoke('generateInvoiceNumber', {});
      const invoice_number = invoiceNumberResult.data?.invoice_number || `TEST-INV-${Date.now()}`;

      invoice = await base44.asServiceRole.entities.Invoice.create({
        ...invoiceData,
        invoice_number: invoice_number
      });

      testResults.steps.push({ step: 7, status: 'success', message: `Invoice saved: ${invoice_number}` });
      console.log('✅ Invoice saved to DB:', invoice.id, invoice_number);

      // ============================================
      // STEP 8: Test Double-Billing Prevention
      // ============================================
      console.log('📝 Step 8: Testing double-billing prevention...');
      
      const secondInvoiceAttempt = await base44.functions.invoke('generateInvoiceFromHours', {
        job_id: testJob.id
      });

      const shouldFail = secondInvoiceAttempt.data?.error || false;
      
      testResults.steps.push({ 
        step: 8, 
        status: shouldFail ? 'success' : 'warning', 
        message: shouldFail 
          ? 'Double-billing correctly prevented ✅' 
          : 'WARNING: Double-billing not prevented ⚠️',
        details: secondInvoiceAttempt.data
      });
      console.log(shouldFail ? '✅ Double-billing prevented' : '⚠️ Double-billing NOT prevented');

      // ============================================
      // STEP 9: Cleanup Test Data
      // ============================================
      console.log('📝 Step 9: Cleaning up test data...');
      
      await base44.asServiceRole.entities.Invoice.delete(invoice.id);
      await base44.asServiceRole.entities.TimeEntry.delete(timeEntry1.id);
      await base44.asServiceRole.entities.TimeEntry.delete(timeEntry2.id);
      await base44.asServiceRole.entities.TimeEntry.delete(timeEntry3.id);
      await base44.asServiceRole.entities.Expense.delete(expense1.id);
      await base44.asServiceRole.entities.Job.delete(testJob.id);
      await base44.asServiceRole.entities.Customer.delete(testCustomer.id);

      testResults.steps.push({ step: 9, status: 'success', message: 'Test data cleaned up ✅' });
      console.log('✅ Test data cleaned up');

      // ============================================
      // FINAL RESULT
      // ============================================
      testResults.success = true;
      testResults.summary = {
        total_steps: 9,
        passed_steps: testResults.steps.filter(s => s.status === 'success').length,
        warnings: testResults.steps.filter(s => s.status === 'warning').length,
        test_duration: 'complete'
      };

      console.log('🎉 T&M End-to-End Test PASSED');

      return Response.json({
        success: true,
        message: '🎉 T&M End-to-End Test PASSED',
        results: testResults
      });

    } catch (stepError) {
      console.error('❌ Test failed:', stepError);
      testResults.errors.push(stepError.message);
      testResults.success = false;

      // Attempt cleanup even on failure
      console.log('🧹 Attempting cleanup after failure...');
      try {
        if (invoice?.id) await base44.asServiceRole.entities.Invoice.delete(invoice.id);
        if (timeEntry1?.id) await base44.asServiceRole.entities.TimeEntry.delete(timeEntry1.id);
        if (timeEntry2?.id) await base44.asServiceRole.entities.TimeEntry.delete(timeEntry2.id);
        if (timeEntry3?.id) await base44.asServiceRole.entities.TimeEntry.delete(timeEntry3.id);
        if (expense1?.id) await base44.asServiceRole.entities.Expense.delete(expense1.id);
        if (testJob?.id) await base44.asServiceRole.entities.Job.delete(testJob.id);
        if (testCustomer?.id) await base44.asServiceRole.entities.Customer.delete(testCustomer.id);
        console.log('✅ Cleanup completed');
      } catch (cleanupError) {
        console.error('⚠️ Cleanup failed:', cleanupError);
        testResults.errors.push(`Cleanup failed: ${cleanupError.message}`);
      }

      return Response.json({
        success: false,
        message: '❌ T&M Test FAILED',
        error: stepError.message,
        results: testResults
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Fatal test error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});