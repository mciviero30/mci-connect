import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Pure logic tests — no DB needed
function getISOWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${isoYear}-W${String(weekNum).padStart(2, '0')}`;
}

function calculatePayrollForEmployee(timeEntries, hourlyRate = 20, overtimeMultiplier = 1.5) {
  const weeklyWorkHours = {};
  let drivingHoursTotal = 0;

  timeEntries.forEach(te => {
    if (te.work_type === 'driving') {
      drivingHoursTotal += te.hours_worked || 0;
      return;
    }
    const isoWeekKey = getISOWeekKey(new Date(te.date));
    if (!weeklyWorkHours[isoWeekKey]) weeklyWorkHours[isoWeekKey] = 0;
    weeklyWorkHours[isoWeekKey] += te.hours_worked || 0;
  });

  let regularHours = 0;
  let overtimeHours = 0;
  Object.values(weeklyWorkHours).forEach(weekTotal => {
    regularHours += Math.min(40, weekTotal);
    overtimeHours += Math.max(0, weekTotal - 40);
  });

  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
  const drivingPay = drivingHoursTotal * hourlyRate;
  const grossPay = regularPay + overtimePay + drivingPay;

  return { regularHours, overtimeHours, drivingHours: drivingHoursTotal, regularPay, overtimePay, drivingPay, grossPay };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const results = [];

  // ─── TEST 1: Exactly 40h work, no OT ───
  const test1Entries = Array.from({ length: 5 }, (_, i) => ({
    date: `2026-02-${String(23 + i).padStart(2, '0')}`, // Mon Feb 23 – Fri Feb 27
    hours_worked: 8,
    work_type: 'normal'
  }));
  const t1 = calculatePayrollForEmployee(test1Entries, 20, 1.5);
  const test1Pass = t1.regularHours === 40 && t1.overtimeHours === 0 && t1.grossPay === 800;
  results.push({
    test: 'Test 1: 5×8h work = 40h regular, 0 OT',
    pass: test1Pass,
    result: t1
  });

  // ─── TEST 2: 45h work → 40 regular + 5 OT ───
  const test2Entries = [
    ...Array.from({ length: 5 }, (_, i) => ({
      date: `2026-02-${String(23 + i).padStart(2, '0')}`,
      hours_worked: 8,
      work_type: 'normal'
    })),
    { date: '2026-03-01', hours_worked: 5, work_type: 'normal' } // Sunday same week
  ];
  const t2 = calculatePayrollForEmployee(test2Entries, 20, 1.5);
  const test2Pass = t2.regularHours === 40 && t2.overtimeHours === 5 && t2.grossPay === (40 * 20 + 5 * 20 * 1.5);
  results.push({
    test: 'Test 2: 45h work → 40 regular + 5 OT (×1.5)',
    pass: test2Pass,
    expected_gross: (40 * 20 + 5 * 20 * 1.5),
    result: t2
  });

  // ─── TEST 3: Driving hours do NOT count toward OT ───
  const test3Entries = [
    ...Array.from({ length: 5 }, (_, i) => ({
      date: `2026-02-${String(23 + i).padStart(2, '0')}`,
      hours_worked: 8,
      work_type: 'normal'
    })),
    // 10h driving same week — should NOT push into OT
    ...Array.from({ length: 5 }, (_, i) => ({
      date: `2026-02-${String(23 + i).padStart(2, '0')}`,
      hours_worked: 2,
      work_type: 'driving'
    }))
  ];
  const t3 = calculatePayrollForEmployee(test3Entries, 20, 1.5);
  const test3Pass = t3.regularHours === 40 && t3.overtimeHours === 0 && t3.drivingHours === 10;
  // Gross = 40×20 (regular) + 0 OT + 10×20 (driving) = 800 + 200 = 1000
  const test3GrossOk = t3.grossPay === 1000;
  results.push({
    test: 'Test 3: 40h work + 10h driving → 0 OT, driving paid separately at regular rate',
    pass: test3Pass && test3GrossOk,
    expected_gross: 1000,
    result: t3
  });

  // ─── TEST 4: Two separate weeks, OT calculated per week ───
  // Week 1: 50h work → 40 reg + 10 OT
  // Week 2: 30h work → 30 reg + 0 OT
  const test4Entries = [
    ...Array.from({ length: 5 }, (_, i) => ({
      date: `2026-02-${String(23 + i).padStart(2, '0')}`, // week 1
      hours_worked: 10,
      work_type: 'normal'
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      date: `2026-03-${String(2 + i).padStart(2, '0')}`, // week 2
      hours_worked: 10,
      work_type: 'normal'
    }))
  ];
  const t4 = calculatePayrollForEmployee(test4Entries, 20, 1.5);
  const test4Pass = t4.regularHours === 70 && t4.overtimeHours === 10;
  // Gross = 70×20 + 10×20×1.5 = 1400 + 300 = 1700
  results.push({
    test: 'Test 4: Week1=50h work, Week2=30h work → 70 reg + 10 OT',
    pass: test4Pass,
    expected_gross: 1700,
    result: t4
  });

  // ─── TEST 5: All driving, no work ───
  const test5Entries = Array.from({ length: 5 }, (_, i) => ({
    date: `2026-02-${String(23 + i).padStart(2, '0')}`,
    hours_worked: 8,
    work_type: 'driving'
  }));
  const t5 = calculatePayrollForEmployee(test5Entries, 20, 1.5);
  const test5Pass = t5.regularHours === 0 && t5.overtimeHours === 0 && t5.drivingHours === 40 && t5.grossPay === 800;
  results.push({
    test: 'Test 5: 40h driving only → 0 OT, 40h driving pay at regular rate',
    pass: test5Pass,
    result: t5
  });

  const allPass = results.every(r => r.pass);

  return Response.json({
    summary: allPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED',
    passed: results.filter(r => r.pass).length,
    failed: results.filter(r => !r.pass).length,
    results
  });
});