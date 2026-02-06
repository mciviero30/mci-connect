import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only demo users can seed their own demo data
    if (user?.role !== 'demo') {
      return Response.json({ error: 'Only demo users can seed demo data' }, { status: 403 });
    }

    const demoUserEmail = user.email;

    // Mark user as demo
    await base44.asServiceRole.entities.User.update(user.id, { is_demo_user: true });

    // Create 2 fake employees
    const employees = await base44.asServiceRole.entities.User.bulkCreate([
      {
        full_name: 'John Demo Technician',
        email: `demo-tech1-${user.id}@mci-demo.local`,
        role: 'user',
        position: 'technician',
        department: 'field',
        hourly_rate: 25,
        employment_status: 'active',
        onboarding_completed: true,
        is_demo_user: true,
      },
      {
        full_name: 'Maria Demo Foreman',
        email: `demo-foreman1-${user.id}@mci-demo.local`,
        role: 'user',
        position: 'foreman',
        department: 'field',
        hourly_rate: 35,
        employment_status: 'active',
        onboarding_completed: true,
        is_demo_user: true,
      }
    ]);

    // Create 2 fake customers
    const customers = await base44.asServiceRole.entities.Customer.bulkCreate([
      {
        name: 'Demo Construction LLC',
        email: 'demo-client1@example.com',
        phone: '(555) 123-4567',
        address: '123 Demo Street, Demo City, CA 90001',
        created_by: demoUserEmail,
      },
      {
        name: 'Sample Builders Inc',
        email: 'demo-client2@example.com',
        phone: '(555) 987-6543',
        address: '456 Sample Ave, Demo Town, CA 90002',
        created_by: demoUserEmail,
      }
    ]);

    // Create work authorizations for demo jobs
    const authorizations = await base44.asServiceRole.entities.WorkAuthorization.bulkCreate([
      {
        customer_name: customers[0].name,
        customer_email: customers[0].email,
        job_name: 'Demo Office Renovation',
        scope_of_work: 'Complete office renovation including drywall installation',
        authorized_amount: 15000,
        status: 'approved',
        created_by: demoUserEmail,
      },
      {
        customer_name: customers[1].name,
        customer_email: customers[1].email,
        job_name: 'Sample Retail Store',
        scope_of_work: 'New retail store drywall and finishing work',
        authorized_amount: 25000,
        status: 'approved',
        created_by: demoUserEmail,
      }
    ]);

    // Create 2 fake jobs
    const jobs = await base44.asServiceRole.entities.Job.bulkCreate([
      {
        name: 'Demo Office Renovation',
        customer_id: customers[0].id,
        customer_name: customers[0].name,
        authorization_id: authorizations[0].id,
        address: customers[0].address,
        contract_amount: 15000,
        status: 'active',
        color: 'blue',
        created_by: demoUserEmail,
      },
      {
        name: 'Sample Retail Store',
        customer_id: customers[1].id,
        customer_name: customers[1].name,
        authorization_id: authorizations[1].id,
        address: customers[1].address,
        contract_amount: 25000,
        status: 'active',
        color: 'green',
        created_by: demoUserEmail,
      }
    ]);

    // Create demo items in catalog
    await base44.asServiceRole.entities.ItemCatalog.bulkCreate([
      {
        name: 'Demo Drywall Installation',
        unit: 'sq ft',
        unit_price: 2.50,
        installation_time: 0.5,
        created_by: demoUserEmail,
      },
      {
        name: 'Demo Metal Framing',
        unit: 'linear ft',
        unit_price: 3.00,
        installation_time: 0.3,
        created_by: demoUserEmail,
      }
    ]);

    return Response.json({
      success: true,
      message: 'Demo data created successfully',
      data: {
        employees: employees.length,
        customers: customers.length,
        jobs: jobs.length,
      }
    });

  } catch (error) {
    console.error('Error seeding demo data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});