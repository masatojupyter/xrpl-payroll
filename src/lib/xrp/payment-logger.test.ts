/**
 * Test script for payment logger
 * Run with: npx ts-node -r tsconfig-paths/register src/lib/xrp/payment-logger.test.ts
 */

import {
  logPayrollCalculation,
  logPayrollBatchCreation,
  logPaymentProcessing,
  logPaymentSuccess,
  logPaymentFailure,
  logPaymentRetry,
} from './payment-logger.js';

async function testLogger() {
  console.log('=== Testing Payment Logger ===\n');

  // Test 1: Payroll Calculation
  console.log('Test 1: Payroll Calculation');
  await logPayrollCalculation({
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    period: '2024-11',
    employeeCount: 5,
    totalAmountUSD: '15000.00',
    totalHours: '800.00',
    metadata: {
      test: true,
      hasUnapprovedAttendance: false,
    },
  });
  console.log('✓ Completed\n');

  // Test 2: Payroll Batch Creation
  console.log('Test 2: Payroll Batch Creation');
  await logPayrollBatchCreation({
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    period: '2024-11',
    batchSize: 5,
    totalAmountUSD: '15000.00',
    totalAmountXRP: '30000.000000',
    exchangeRate: 0.5,
    status: 'success',
    metadata: {
      test: true,
      created: 5,
      skipped: 0,
    },
  });
  console.log('✓ Completed\n');

  // Test 3: Payment Processing (Start)
  console.log('Test 3: Payment Processing (Start)');
  await logPaymentProcessing({
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    payrollId: 'payroll-789',
    employeeId: 'employee-001',
    amountUSD: '3000.00',
    amountXRP: '6000.000000',
    metadata: {
      test: true,
      employeeName: 'John Doe',
    },
  });
  console.log('✓ Completed\n');

  // Test 4: Payment Success
  console.log('Test 4: Payment Success');
  await logPaymentSuccess({
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    payrollId: 'payroll-789',
    employeeId: 'employee-001',
    amountUSD: '3000.00',
    amountXRP: '6000.000000',
    transactionHash: 'ABC123DEF456789',
    metadata: {
      test: true,
      employeeName: 'John Doe',
      period: '2024-11',
    },
  });
  console.log('✓ Completed\n');

  // Test 5: Payment Failure
  console.log('Test 5: Payment Failure');
  await logPaymentFailure({
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    payrollId: 'payroll-790',
    employeeId: 'employee-002',
    amountUSD: '2500.00',
    amountXRP: '5000.000000',
    errorMessage: 'Insufficient balance in source wallet',
    metadata: {
      test: true,
      employeeName: 'Jane Smith',
      period: '2024-11',
    },
  });
  console.log('✓ Completed\n');

  // Test 6: Payment Retry
  console.log('Test 6: Payment Retry (Success after retry)');
  await logPaymentRetry({
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    payrollId: 'payroll-790',
    employeeId: 'employee-002',
    retryCount: 1,
    amountUSD: '2500.00',
    amountXRP: '5000.000000',
    status: 'success',
    metadata: {
      test: true,
      employeeName: 'Jane Smith',
      period: '2024-11',
    },
  });
  console.log('✓ Completed\n');

  // Test 7: Payment Retry (Failed after retry)
  console.log('Test 7: Payment Retry (Failed)');
  await logPaymentRetry({
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    payrollId: 'payroll-791',
    employeeId: 'employee-003',
    retryCount: 3,
    amountUSD: '3500.00',
    amountXRP: '7000.000000',
    status: 'failed',
    errorMessage: 'Max retry attempts reached',
    metadata: {
      test: true,
      employeeName: 'Bob Johnson',
      period: '2024-11',
    },
  });
  console.log('✓ Completed\n');

  // Test 8: Error Logging
  console.log('Test 8: Error Logging (Calculation Failure)');
  await logPayrollCalculation({
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    period: '2024-11',
    employeeCount: 0,
    totalAmountUSD: '0',
    totalHours: '0',
    level: 'error',
    metadata: {
      test: true,
      error: 'Database connection failed',
    },
  });
  console.log('✓ Completed\n');

  console.log('=== All Tests Completed ===');
  console.log('\nNote: Check console output above for JSON logs.');
  console.log('If ENABLE_PAYMENT_FILE_LOGGING=true, also check logs/payments/ directory.');
}

// Run tests
testLogger().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
