import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Markdown content
    const content = `
MCI CONNECT - OPERATIONAL MODES SPECIFICATION
Version 1.0 | Date: January 8, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTIVE SUMMARY

MCI Connect is a mode-based workflow platform where users operate in 
distinct mental states, each with specific affordances and constraints.

6 CORE OPERATIONAL MODES:

1. FIELD MODE - Execute & Capture
   Users: Field Technicians, Foremen, Supervisors
   Mental State: On-site data capture under pressure
   Status: ✓ Production-Grade (10/10)

2. PRODUCE MODE - Create & Estimate  
   Users: Sales, Estimators, Project Managers
   Mental State: Generate quotes and plan projects
   Status: ✓ Production-Ready (8.5/10)

3. FINANCE MODE - Transact & Reconcile
   Users: Bookkeepers, Controllers, CFO
   Mental State: Track every dollar, stay compliant
   Status: ✓ Production-Ready (8/10)

4. WORKFORCE MODE - Track & Compensate
   Users: Payroll Admin, Managers, Employees
   Mental State: Manage time, calculate fair pay
   Status: ⚠ Production-Ready with limits (7.5/10)

5. ADMIN MODE - Control & Configure
   Users: CEO, System Admin, HR, Compliance
   Mental State: Oversee operations, enforce policy
   Status: ✓ Production-Ready (8.5/10)

6. OBSERVE MODE - Monitor & Review
   Users: Clients, Employees (self-service), Managers
   Mental State: Check status, consume information
   Status: ✓ Production-Ready (8/10)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODE 1: FIELD MODE

Definition: Physical jobsite data capture with offline-first guarantees

Primary Users:
• Field Technician (80%) - Measure, photograph, document
• Foreman/Supervisor (15%) - Validate and approve field data  
• Admin (5%) - Override and audit

Mental State: EXECUTE & CAPTURE
Focus: Precision, speed, reliability
Mindset: "Get data, get out, don't lose anything"

Allowed Actions:
✓ Capture dimensions (FF-FF, CL-CL, BM-C, etc.)
✓ Document conditions (photos, voice notes)
✓ Manage tasks and checklists
✓ Create incident reports
✓ Generate measurement packages

Forbidden Actions:
✗ Edit locked dimension sets
✗ Delete historical measurements  
✗ Modify approved invoices
✗ Change job financial data
✗ Edit other users' work

Mode Guarantees:
• Zero data loss (survives crash, background, offline)
• 100% offline functionality
• Explicit save confirmations
• Session continuity through interruptions
• Measurement precision (no float drift)

Performance Targets:
• Action response: <100ms
• Save confirmation: <2s
• Offline sync: <60s (100 items)
• Session restore: <500ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODE 2: PRODUCE MODE

Definition: Create estimates and plan projects to win business

Primary Users:
• Sales Rep (40%) - Generate quotes, respond to RFPs
• Estimator (30%) - Price complex projects
• Project Manager (20%) - Convert quotes to jobs
• Admin (10%) - Oversight and pricing strategy

Mental State: CREATE & ESTIMATE
Focus: Accuracy, persuasion, professionalism
Mindset: "Win the job, price it right, look professional"

Allowed Actions:
✓ Quote generation (manual, AI-assisted, PDF import)
✓ Pricing & estimation (materials, labor, margins)
✓ Quote management (send, track, duplicate, convert)
✓ Job provisioning (Drive + Field auto-setup)
✓ Customer management

Forbidden Actions:
✗ Edit sent quotes without versioning
✗ Change approved quote amounts
✗ Delete quotes with linked invoices
✗ Modify jobs with logged time
✗ Bypass quote approval workflow

Mode Guarantees:
• Quote integrity (sent quotes immutable)
• Calculation accuracy (tested formulas)
• Professional output (industry-standard PDFs)
• Workflow consistency (predictable transitions)
• Data lineage (quote → invoice → job preserved)

Performance Targets:
• Quote creation: <10 min
• AI quote generation: <30s
• PDF generation: <5s
• Invoice conversion: <3s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODE 3: FINANCE MODE

Definition: Track financial reality with penny-perfect accuracy

Primary Users:
• Bookkeeper (60%) - Record transactions, reconcile
• Controller/CFO (30%) - Review financials, approve expenses
• CEO/Admin (10%) - Strategic oversight

Mental State: TRANSACT & RECONCILE
Focus: Accuracy, compliance, traceability
Mindset: "Account for every penny, stay compliant, prove it"

Allowed Actions:
✓ Invoice management (create, track, record payments)
✓ Transaction recording (manual, bank sync, categorization)
✓ Payment reconciliation (match invoices to payments)
✓ Expense approval (review, categorize, reimburse)
✓ Financial reporting (P&L, cash flow, forecasts)

Forbidden Actions:
✗ Delete reconciled transactions
✗ Modify historical payroll records
✗ Change invoice amounts after payment
✗ Edit approved time entries
✗ Bypass tax compliance gates

Mode Guarantees:
• Audit trail (every transaction logged)
• Reconciliation (payments match invoices exactly)
• Tax compliance (IRS-ready structure)
• Immutability (historical data protected)
• Double-entry integrity

Performance Targets:
• Transaction entry: <30s
• Bank sync: <10s (100 transactions)
• Reconciliation: <5 min (50 transactions)
• Report generation: <10s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODE 4: WORKFORCE MODE

Definition: Manage human capital - time, pay, performance

Primary Users:
• Payroll Admin (40%) - Process payroll, calculate pay
• Manager/Supervisor (35%) - Approve time and expenses
• HR Manager (15%) - Manage employee lifecycle
• Employee (10%) - Self-service time tracking

Mental State: TRACK & COMPENSATE
Focus: Accuracy, fairness, compliance, motivation
Mindset: "Pay people correctly, on time, incentivize performance"

Allowed Actions:
✓ Time tracking (clock in/out with geofencing)
✓ Time approval (validate, approve/reject)
✓ Payroll processing (calculate, export, paystubs)
✓ Performance management (goals, reviews, recognition)
✓ Mileage & expenses (log, approve, reimburse)

Forbidden Actions:
✗ Approve own time entries
✗ Modify historical payroll records
✗ Edit approved time entries
✗ Change pay rates without approval
✗ Delete time entries with payroll reference
✗ Bypass geofence validation

Mode Guarantees:
• Time accuracy (geofence validates location)
• Fair compensation (OT calculated per labor law)
• Audit compliance (3+ year retention)
• Pay transparency (employees see own data)
• Automation (payroll auto-calculates)

Performance Targets:
• Clock in/out: <30s
• Time approval: <2s per entry
• Payroll calculation: <15s (50 employees)
• Paystub generation: <5s

CRITICAL: Needs pagination before 100+ employees

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODE 5: ADMIN MODE

Definition: Control and oversee the entire platform

Primary Users:
• System Administrator (40%) - Configure, manage users
• CEO/Owner (30%) - Strategic oversight, final approval
• HR Manager (20%) - Employee lifecycle, compliance
• Compliance Officer (10%) - Audit, safety, regulatory

Mental State: CONTROL & CONFIGURE
Focus: Policy, permissions, compliance, oversight
Mindset: "Ensure system runs correctly, safely, compliantly"

Allowed Actions:
✓ User management (invite, roles, permissions, onboarding)
✓ System configuration (settings, workflows, integrations)
✓ Approval workflows (time, expenses, commissions)
✓ Oversight & reporting (dashboards, analytics, audit trails)
✓ Compliance management (safety, certifications, agreements)

Forbidden Actions:
✗ Execute field work (delegate to technicians)
✗ Modify locked historical data
✗ Delete audit logs
✗ Bypass compliance gates
✗ Edit others' personal data without cause

Mode Guarantees:
• Oversight visibility (all critical actions surfaced)
• Policy enforcement (rules cannot be bypassed)
• Audit completeness (all actions logged)
• Permission isolation (users see only authorized data)
• Real-time alerts (critical events notify immediately)

Performance Targets:
• Dashboard load: <2s
• Approval queue display: <1s (100 items)
• User creation: <30s
• Permission change: Immediate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODE 6: OBSERVE MODE

Definition: Consume information without modifying core data

Primary Users:
• Client (40%) - Monitor project progress
• Employee (40%) - Check personal status, self-service
• Manager (20%) - Team monitoring

Mental State: MONITOR & REVIEW
Focus: Awareness, transparency, self-service
Mindset: "What's my status? What do I need to do?"

Allowed Actions:
✓ View project progress (clients)
✓ Check personal hours/pay (employees)
✓ Review team metrics (managers)
✓ Access notifications
✓ Update preferences
✓ Self-service requests (time off, profile)

Forbidden Actions:
✗ Edit other users' data
✗ Approve own requests
✗ Access restricted information
✗ Modify historical records
✗ Bypass permission gates

Mode Guarantees:
• Data isolation (see only authorized data)
• Real-time updates (dashboards current)
• Mobile optimization (works all devices)
• Clear status (know what's pending)
• Self-service (no admin intervention)

Performance Targets:
• Dashboard load: <1.5s
• Client portal load: <2s
• Notification check: <500ms
• Profile update: <3s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY COMPETITIVE ADVANTAGES

8 UNIQUE/SUPERIOR FEATURES:

1. ✓ Offline-First Field Operations (industry-leading)
2. ✓ AI-Powered Quote Generation (unique)
3. ✓ Site Notes Voice Transcription (unique)
4. ✓ Tax Compliance Onboarding (unique)
5. ✓ Commission Workflow Automation (unique)
6. ✓ AI Expense Categorization (unique)
7. ✓ Geofence Time Validation (superior)
8. ✓ Measurement Intelligence (superior)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL RECOMMENDATIONS

P0 - Before 100 Employees (7 hours):
1. Implement employee pagination
2. Optimize dashboard queries  
3. Add global offline indicator

P1 - High Impact (15 hours):
1. Quick action bar (Cmd+K)
2. Job provisioning status toasts
3. Batch approval operations
4. Enhanced notification center

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONCLUSION

MCI Connect's mode-based architecture is fundamentally sound.

Competitive Position: Tier 1 platform at 60% lower cost
Market Differentiators: 8 unique features
Production Status: ✓ Ready for deployment

This document serves as the official reference for MCI Connect's
mode-based UX and architecture.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For full details, see:
components/docs/MCI_CONNECT_OPERATIONAL_MODES.md
components/docs/MCI_CONNECT_FULL_PRODUCT_AUDIT.md
components/field/docs/PRODUCTION_READINESS_CERTIFICATION.md
`;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    // Setup
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxLineWidth = pageWidth - (margin * 2);
    let y = margin;

    // Helper to add new page if needed
    const checkNewPage = (lineHeight = 10) => {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MCI CONNECT', margin, y);
    y += 8;
    
    doc.setFontSize(14);
    doc.text('OPERATIONAL MODES SPECIFICATION', margin, y);
    y += 10;

    // Date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Version 1.0 | January 8, 2026', margin, y);
    y += 12;

    // Process content
    const lines = content.trim().split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        y += 4;
        checkNewPage();
        continue;
      }

      // Section headers (all caps or starting with numbers)
      if (trimmed.match(/^[A-Z\s\-]+$/) && trimmed.length > 3 && trimmed.length < 60) {
        checkNewPage(15);
        y += 5;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138); // MCI Blue
        const wrappedHeader = doc.splitTextToSize(trimmed, maxLineWidth);
        doc.text(wrappedHeader, margin, y);
        y += wrappedHeader.length * 5;
        doc.setTextColor(0, 0, 0);
        y += 3;
        continue;
      }

      // Mode headers (MODE X:)
      if (trimmed.match(/^MODE \d+:/)) {
        checkNewPage(20);
        y += 8;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 125, 180); // Soft Blue
        doc.text(trimmed, margin, y);
        y += 8;
        doc.setTextColor(0, 0, 0);
        continue;
      }

      // Bullets with checkmarks/crosses
      if (trimmed.startsWith('✓') || trimmed.startsWith('✗') || trimmed.startsWith('•')) {
        checkNewPage(8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        if (trimmed.startsWith('✓')) {
          doc.setTextColor(34, 139, 34); // Green
        } else if (trimmed.startsWith('✗')) {
          doc.setTextColor(220, 38, 38); // Red
        } else {
          doc.setTextColor(0, 0, 0);
        }
        
        const wrapped = doc.splitTextToSize(trimmed, maxLineWidth - 5);
        doc.text(wrapped, margin + 3, y);
        y += wrapped.length * 5;
        doc.setTextColor(0, 0, 0);
        continue;
      }

      // Decorative lines
      if (trimmed.startsWith('━━━')) {
        checkNewPage(5);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        continue;
      }

      // Regular text
      checkNewPage(10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const wrapped = doc.splitTextToSize(trimmed, maxLineWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5;
    }

    // Footer on last page
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      'Generated by MCI Connect | For internal reference only',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=MCI_Connect_Operational_Modes.pdf'
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});