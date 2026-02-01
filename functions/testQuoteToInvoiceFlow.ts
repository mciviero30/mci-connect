import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * COMPLETE END-TO-END TEST: Quote → WorkAuth → Invoice → Job → Drive
 * Tests the entire conversion pipeline to ensure no broken links
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const testResults = {
      phase: '',
      success: false,
      steps: [],
      errors: [],
      data: {}
    };

    // ========================================
    // STEP 1: Create test Quote
    // ========================================
    testResults.phase = 'Creating test quote';
    console.log('📝 Step 1: Creating test quote...');
    
    // Generate quote number manually to avoid 403 from function call
    const counters = await base44.asServiceRole.entities.Counter.filter({ counter_key: 'quote' });
    let nextQuoteNum = 1;
    if (counters.length > 0) {
      nextQuoteNum = counters[0].current_value + 1;
      await base44.asServiceRole.entities.Counter.update(counters[0].id, {
        current_value: nextQuoteNum,
        last_increment_date: new Date().toISOString()
      });
    }
    const quote_number = `EST-${String(nextQuoteNum).padStart(5, '0')}`;
    
    const testQuote = await base44.asServiceRole.entities.Quote.create({
      quote_number,
      customer_id: 'test_customer',
      customer_name: 'Test Customer Flow',
      customer_email: 'test@flow.com',
      customer_phone: '000-000-0000',
      job_name: 'Test Job Auto Flow',
      job_address: '123 Test Street',
      team_id: 'test_team',
      team_name: 'Test Team',
      quote_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{
        item_name: 'Test Item',
        description: 'Test installation',
        quantity: 10,
        unit: 'lf',
        unit_price: 100,
        total: 1000,
        installation_time: 5
      }],
      subtotal: 1000,
      tax_rate: 0,
      tax_amount: 0,
      total: 1000,
      status: 'approved',
      approval_status: 'approved',
      assigned_to_user_id: user.id
    });
    
    testResults.steps.push(`✅ Quote created: ${quote_number}`);
    testResults.data.quote_id = testQuote.id;
    testResults.data.quote_number = quote_number;

    // ========================================
    // STEP 2: Auto-create WorkAuthorization (simulating conversion)
    // ========================================
    testResults.phase = 'Creating WorkAuthorization';
    console.log('🔐 Step 2: Creating WorkAuthorization...');
    
    const authorization = await base44.asServiceRole.entities.WorkAuthorization.create({
      customer_id: testQuote.customer_id,
      customer_name: testQuote.customer_name,
      authorization_type: 'fixed',
      approval_source: 'signed_quote',
      authorization_number: testQuote.quote_number,
      approved_amount: testQuote.total,
      approved_at: new Date().toISOString(),
      verified_by_user_id: user.id,
      verified_by_email: user.email,
      verified_by_name: user.full_name,
      verification_notes: `Auto-generated from Quote ${testQuote.quote_number}`,
      linked_quote_id: testQuote.id,
      status: 'approved'
    });
    
    testResults.steps.push(`✅ WorkAuthorization created: ${authorization.id}`);
    testResults.data.authorization_id = authorization.id;

    // ========================================
    // STEP 3: Create Invoice with authorization_id
    // ========================================
    testResults.phase = 'Creating Invoice';
    console.log('📄 Step 3: Creating Invoice...');
    
    // Generate invoice number manually to avoid 403
    const invoiceCounters = await base44.asServiceRole.entities.Counter.filter({ counter_key: 'invoice' });
    let nextInvoiceNum = 1;
    if (invoiceCounters.length > 0) {
      nextInvoiceNum = invoiceCounters[0].current_value + 1;
      await base44.asServiceRole.entities.Counter.update(invoiceCounters[0].id, {
        current_value: nextInvoiceNum,
        last_increment_date: new Date().toISOString()
      });
    }
    const invoice_number = `INV-${String(nextInvoiceNum).padStart(5, '0')}`;
    
    const invoice = await base44.asServiceRole.entities.Invoice.create({
      invoice_number,
      quote_id: testQuote.id,
      authorization_id: authorization.id,
      customer_id: testQuote.customer_id,
      customer_name: testQuote.customer_name,
      customer_email: testQuote.customer_email,
      customer_phone: testQuote.customer_phone,
      job_name: testQuote.job_name,
      job_address: testQuote.job_address,
      team_id: testQuote.team_id,
      team_name: testQuote.team_name,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: testQuote.items,
      subtotal: testQuote.subtotal,
      tax_rate: testQuote.tax_rate,
      tax_amount: testQuote.tax_amount,
      total: testQuote.total,
      amount_paid: 0,
      balance: testQuote.total,
      notes: testQuote.notes,
      terms: testQuote.terms,
      status: 'draft',
      approval_status: 'approved',
      created_by_user_id: user.id
    });
    
    testResults.steps.push(`✅ Invoice created: ${invoice_number}`);
    testResults.data.invoice_id = invoice.id;
    testResults.data.invoice_number = invoice_number;

    // ========================================
    // STEP 4: Trigger provisioning (creates Job + Drive)
    // ========================================
    testResults.phase = 'Provisioning Job';
    console.log('🏗️ Step 4: Provisioning Job...');
    
    const provisioningResult = await base44.asServiceRole.functions.invoke('provisionJobFromInvoice', {
      invoice_id: invoice.id,
      mode: 'test'
    });
    
    if (!provisioningResult.ok) {
      testResults.errors.push(`Provisioning failed: ${provisioningResult.reason || provisioningResult.error}`);
      throw new Error('Provisioning failed');
    }
    
    testResults.steps.push(`✅ Job provisioned: ${provisioningResult.job_id}`);
    testResults.data.job_id = provisioningResult.job_id;

    // ========================================
    // STEP 5: Verify complete chain
    // ========================================
    testResults.phase = 'Verification';
    console.log('🔍 Step 5: Verifying complete chain...');
    
    // Reload entities to verify links
    const [finalQuote] = await base44.asServiceRole.entities.Quote.filter({ id: testQuote.id });
    const [finalInvoice] = await base44.asServiceRole.entities.Invoice.filter({ id: invoice.id });
    const [finalJob] = await base44.asServiceRole.entities.Job.filter({ id: provisioningResult.job_id });
    const [finalAuth] = await base44.asServiceRole.entities.WorkAuthorization.filter({ id: authorization.id });
    
    // Validate chain integrity
    const validations = [];
    
    if (finalQuote.invoice_id !== invoice.id) {
      validations.push('❌ Quote not linked to Invoice');
    } else {
      validations.push('✅ Quote → Invoice link OK');
    }
    
    if (finalInvoice.quote_id !== testQuote.id) {
      validations.push('❌ Invoice not linked to Quote');
    } else {
      validations.push('✅ Invoice → Quote link OK');
    }
    
    if (finalInvoice.authorization_id !== authorization.id) {
      validations.push('❌ Invoice not linked to WorkAuthorization');
    } else {
      validations.push('✅ Invoice → WorkAuthorization link OK');
    }
    
    if (!finalInvoice.job_id || finalInvoice.job_id !== provisioningResult.job_id) {
      validations.push('❌ Invoice not linked to Job');
    } else {
      validations.push('✅ Invoice → Job link OK');
    }
    
    if (finalJob.authorization_id !== authorization.id) {
      validations.push('❌ Job not linked to WorkAuthorization');
    } else {
      validations.push('✅ Job → WorkAuthorization link OK');
    }
    
    if (!finalJob.drive_folder_id) {
      validations.push('⚠️ Drive folder not created');
    } else {
      validations.push('✅ Drive folder created');
    }
    
    testResults.steps.push(...validations);
    
    // Check for any failures
    const hasErrors = validations.some(v => v.startsWith('❌'));
    testResults.success = !hasErrors;
    
    testResults.data.final_state = {
      quote: {
        id: finalQuote.id,
        invoice_id: finalQuote.invoice_id,
        job_id: finalQuote.job_id,
        status: finalQuote.status
      },
      authorization: {
        id: finalAuth.id,
        linked_quote_id: finalAuth.linked_quote_id,
        status: finalAuth.status
      },
      invoice: {
        id: finalInvoice.id,
        quote_id: finalInvoice.quote_id,
        authorization_id: finalInvoice.authorization_id,
        job_id: finalInvoice.job_id,
        status: finalInvoice.status
      },
      job: {
        id: finalJob.id,
        job_number: finalJob.job_number,
        authorization_id: finalJob.authorization_id,
        drive_folder_id: finalJob.drive_folder_id,
        provisioning_status: finalJob.provisioning_status
      }
    };

    return Response.json({
      test: 'Quote → Invoice → Job Flow',
      success: testResults.success,
      phase: testResults.phase,
      steps: testResults.steps,
      errors: testResults.errors,
      data: testResults.data,
      cleanup_ids: {
        quote_id: testQuote.id,
        authorization_id: authorization.id,
        invoice_id: invoice.id,
        job_id: provisioningResult.job_id
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    return Response.json({
      test: 'Quote → Invoice → Job Flow',
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});