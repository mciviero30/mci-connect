import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.2';
import { requireAdmin, safeJsonError } from './_auth.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAdmin(base44);

    // Get all employees
    const employees = await base44.entities.User.list();
    const pendingEmployees = await base44.entities.PendingEmployee.list();

    const doc = new jsPDF();
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.text('Employee Management Backup', 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
    y += 15;

    // Active Employees
    doc.setFontSize(16);
    doc.text(`Active Employees (${employees.length})`, 20, y);
    y += 10;

    doc.setFontSize(10);
    employees.forEach((emp, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.text(`${index + 1}. ${emp.full_name || emp.email}`, 20, y);
      y += 5;
      doc.text(`   Email: ${emp.email}`, 20, y);
      y += 5;
      if (emp.position) {
        doc.text(`   Position: ${emp.position}`, 20, y);
        y += 5;
      }
      if (emp.phone) {
        doc.text(`   Phone: ${emp.phone}`, 20, y);
        y += 5;
      }
      if (emp.team_name) {
        doc.text(`   Team: ${emp.team_name}`, 20, y);
        y += 5;
      }
      doc.text(`   Status: ${emp.employment_status || 'active'}`, 20, y);
      y += 8;
    });

    // Pending Employees
    if (pendingEmployees.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      y += 10;
      doc.setFontSize(16);
      doc.text(`Pending Employees (${pendingEmployees.length})`, 20, y);
      y += 10;

      doc.setFontSize(10);
      pendingEmployees.forEach((emp, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email;
        doc.text(`${index + 1}. ${name}`, 20, y);
        y += 5;
        doc.text(`   Email: ${emp.email || 'N/A'}`, 20, y);
        y += 5;
        if (emp.position) {
          doc.text(`   Position: ${emp.position}`, 20, y);
          y += 5;
        }
        doc.text(`   Status: ${emp.status}`, 20, y);
        y += 8;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=employees_backup_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});