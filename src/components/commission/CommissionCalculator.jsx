/**
 * Commission Calculation Logic
 * Calculates commission based on job financials and agreement terms
 */

import { base44 } from '@/api/base44Client';

/**
 * Calculate commission for a job
 * @param {Object} job - Job object
 * @param {Object} agreement - CommissionAgreement object
 * @returns {Object} - Commission calculation result
 */
export const calculateJobCommission = async (job, agreement) => {
  // Validation: agreement must be signed and active
  if (!agreement.signed || agreement.status !== 'active') {
    throw new Error('Agreement must be signed and active to calculate commission');
  }

  // Fetch job financials
  const jobRevenue = job.contract_amount || 0;
  
  // Calculate expenses (payroll + materials + mileage)
  const [timeEntries, expenses, drivingLogs] = await Promise.all([
    base44.entities.TimeEntry.filter({ job_id: job.id }),
    base44.entities.Expense.filter({ job_id: job.id, status: 'approved' }),
    base44.entities.DrivingLog.filter({ job_id: job.id, status: 'approved' }),
  ]);

  // Calculate payroll cost
  const payrollCost = timeEntries.reduce((sum, entry) => {
    const hours = entry.hours_worked || 0;
    const rate = entry.hourly_rate || 0;
    return sum + (hours * rate);
  }, 0);

  // Calculate material/expense cost
  const expenseCost = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  // Calculate mileage cost
  const mileageCost = drivingLogs.reduce((sum, log) => {
    const miles = log.miles || 0;
    const rate = log.rate_per_mile || 0.6;
    return sum + (miles * rate);
  }, 0);

  const totalExpenses = payrollCost + expenseCost + mileageCost;
  const netProfit = jobRevenue - totalExpenses;

  // Calculate commission
  const commissionRate = agreement.commission_rate / 100;
  const commissionAmount = netProfit * commissionRate;

  return {
    job_revenue: jobRevenue,
    job_expenses: totalExpenses,
    job_mileage_cost: mileageCost,
    net_profit: netProfit,
    base_commission_rate: agreement.commission_rate,
    commission_amount: Math.max(0, commissionAmount), // No negative commissions
  };
};

/**
 * Create CommissionResult for a job
 * @param {Object} job - Job object
 * @param {Object} employee - EmployeeDirectory object
 * @returns {Object} - Created CommissionResult
 */
export const createCommissionResult = async (job, employee) => {
  // Find active signed agreement for this employee
  const agreements = await base44.entities.CommissionAgreement.filter({
    employee_directory_id: employee.id,
    status: 'active',
    signed: true,
  });

  if (agreements.length === 0) {
    throw new Error('No active signed commission agreement found for this employee');
  }

  const agreement = agreements[0];

  // Calculate commission
  const calculation = await calculateJobCommission(job, agreement);

  // Create CommissionResult
  const commissionResult = await base44.entities.CommissionResult.create({
    job_id: job.id,
    job_name: job.name || job.job_name || 'Unnamed Job',
    employee_directory_id: employee.id,
    employee_email: employee.email,
    employee_name: employee.full_name || employee.email,
    agreement_id: agreement.id,
    calculation_date: new Date().toISOString(),
    ...calculation,
    adjusted_commission_rate: calculation.base_commission_rate,
    status: 'calculated',
  });

  return commissionResult;
};