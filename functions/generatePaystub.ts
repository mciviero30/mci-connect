import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only: Generating paystubs is an admin operation
    if (user.role !== 'admin' && user.position !== 'CEO' && user.position !== 'administrator') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const {
      employeeEmail,
      employeeName,
      weekStart,
      weekEnd,
      hourlyRate,
      overtimeRate,
      regularHours,
      overtimeHours,
      drivingHours,
      regularPay,
      overtimePay,
      drivingPay,
      mileageTotal,
      expenseTotal,
      grossPay
    } = payload;

    // Create PDF
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138); // Blue-900
    doc.text('MCI CONNECT', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('PAY STUB', 105, 28, { align: 'center' });

    // Pay Period
    doc.setFontSize(10);
    doc.text(`Pay Period: ${weekStart} to ${weekEnd}`, 105, 36, { align: 'center' });

    // Line separator
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 42, 190, 42);

    // Employee Info
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Employee Information', 20, 50);
    
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Name: ${employeeName}`, 20, 58);
    doc.text(`ID: ${employeeEmail}`, 20, 64);

    // Earnings Section
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('EARNINGS', 20, 78);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 80, 190, 80);

    // Table Headers
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Description', 20, 88);
    doc.text('Hours/Qty', 100, 88, { align: 'right' });
    doc.text('Rate', 135, 88, { align: 'right' });
    doc.text('Amount', 175, 88, { align: 'right' });

    let yPos = 96;

    // Regular Hours
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Regular Hours', 20, yPos);
    doc.text(parseFloat(regularHours).toFixed(2), 100, yPos, { align: 'right' });
    doc.text(`$${parseFloat(hourlyRate).toFixed(2)}`, 135, yPos, { align: 'right' });
    doc.text(`$${parseFloat(regularPay).toFixed(2)}`, 175, yPos, { align: 'right' });
    yPos += 8;

    // Overtime
    if (parseFloat(overtimeHours) > 0) {
      doc.text('Overtime (1.5x)', 20, yPos);
      doc.text(parseFloat(overtimeHours).toFixed(2), 100, yPos, { align: 'right' });
      doc.text(`$${parseFloat(overtimeRate).toFixed(2)}`, 135, yPos, { align: 'right' });
      doc.text(`$${parseFloat(overtimePay).toFixed(2)}`, 175, yPos, { align: 'right' });
      yPos += 8;
    }

    // Driving
    if (parseFloat(drivingHours) > 0) {
      doc.text('Driving Hours', 20, yPos);
      doc.text(parseFloat(drivingHours).toFixed(2), 100, yPos, { align: 'right' });
      doc.text(`$${parseFloat(hourlyRate).toFixed(2)}`, 135, yPos, { align: 'right' });
      doc.text(`$${parseFloat(drivingPay).toFixed(2)}`, 175, yPos, { align: 'right' });
      yPos += 8;
    }

    // Reimbursements Section
    if (parseFloat(mileageTotal) > 0 || parseFloat(expenseTotal) > 0) {
      yPos += 5;
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('REIMBURSEMENTS', 20, yPos);
      yPos += 3;
      doc.setDrawColor(226, 232, 240);
      doc.line(20, yPos, 190, yPos);
      yPos += 8;

      doc.setFontSize(9);
      if (parseFloat(mileageTotal) > 0) {
        doc.text('Mileage Reimbursement', 20, yPos);
        doc.text('$0.60/mi', 135, yPos, { align: 'right' });
        doc.text(`$${parseFloat(mileageTotal).toFixed(2)}`, 175, yPos, { align: 'right' });
        yPos += 8;
      }

      if (parseFloat(expenseTotal) > 0) {
        doc.text('Expense Reimbursements', 20, yPos);
        doc.text(`$${parseFloat(expenseTotal).toFixed(2)}`, 175, yPos, { align: 'right' });
        yPos += 8;
      }
    }

    // Total
    yPos += 5;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL GROSS PAY', 20, yPos);
    doc.setTextColor(22, 163, 74); // Green-600
    doc.text(`$${parseFloat(grossPay).toFixed(2)}`, 175, yPos, { align: 'right' });

    // Footer
    yPos += 15;
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated document. No signature required.', 105, yPos, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=paystub_${employeeEmail}_${weekStart}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating paystub:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});