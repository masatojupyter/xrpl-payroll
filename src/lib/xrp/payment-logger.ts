/**
 * XRP Payroll Payment Logger
 * 
 * Provides structured logging for XRP/XRP payment processing
 * with support for console and file output.
 */

import { writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Log levels
export type LogLevel = 'info' | 'warn' | 'error';

// Log actions
export type LogAction = 
  | 'calculate' 
  | 'create_batch' 
  | 'process_payment' 
  | 'retry';

// Transaction status
export type TransactionStatus = 'success' | 'failed' | 'pending';

// Base log entry structure
interface BaseLogEntry {
  timestamp: string;
  level: LogLevel;
  action: LogAction;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
}

// Payroll calculation log
interface PayrollCalculationLog extends BaseLogEntry {
  action: 'calculate';
  period: string;
  employeeCount: number;
  totalAmountUSD: string;
  totalHours: string;
}

// Payroll batch creation log
interface PayrollBatchCreationLog extends BaseLogEntry {
  action: 'create_batch';
  period: string;
  batchSize: number;
  totalAmountUSD: string;
  totalAmountXRP: string;
  exchangeRate: number;
  status: TransactionStatus;
}

// Payment processing log
interface PaymentProcessingLog extends BaseLogEntry {
  action: 'process_payment';
  payrollId: string;
  employeeId: string;
  amountUSD: string;
  amountXRP?: string;
  transactionHash?: string;
  status: TransactionStatus;
  errorMessage?: string;
}

// Payment retry log
interface PaymentRetryLog extends BaseLogEntry {
  action: 'retry';
  payrollId: string;
  employeeId: string;
  retryCount: number;
  amountUSD: string;
  amountXRP?: string;
  status: TransactionStatus;
  errorMessage?: string;
}

type LogEntry = 
  | PayrollCalculationLog 
  | PayrollBatchCreationLog 
  | PaymentProcessingLog 
  | PaymentRetryLog;

/**
 * Logger configuration
 */
const config = {
  // Enable/disable file logging via environment variable
  enableFileLogging: process.env.ENABLE_PAYMENT_FILE_LOGGING === 'true',
  // Log directory
  logDirectory: process.env.PAYMENT_LOG_DIRECTORY || 'logs/payments',
  // Log file name pattern: payment-YYYY-MM-DD.log
  logFileNamePattern: 'payment',
};

/**
 * Format timestamp in ISO 8601 format with timezone
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get log file path for current date
 */
function getLogFilePath(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const fileName = `${config.logFileNamePattern}-${dateStr}.log`;
  return path.join(process.cwd(), config.logDirectory, fileName);
}

/**
 * Ensure log directory exists
 */
async function ensureLogDirectory(): Promise<void> {
  const logDir = path.join(process.cwd(), config.logDirectory);
  if (!existsSync(logDir)) {
    await mkdir(logDir, { recursive: true });
  }
}

/**
 * Write log entry to console
 */
function logToConsole(entry: LogEntry): void {
  const logString = JSON.stringify(entry, null, 2);
  
  switch (entry.level) {
    case 'error':
      console.error(`[PAYMENT LOG ERROR]`, logString);
      break;
    case 'warn':
      console.warn(`[PAYMENT LOG WARN]`, logString);
      break;
    case 'info':
    default:
      console.log(`[PAYMENT LOG INFO]`, logString);
      break;
  }
}

/**
 * Write log entry to file (if enabled)
 */
async function logToFile(entry: LogEntry): Promise<void> {
  if (!config.enableFileLogging) {
    return;
  }

  try {
    await ensureLogDirectory();
    const logFilePath = getLogFilePath();
    const logLine = JSON.stringify(entry) + '\n';
    
    // Append to log file
    await appendFile(logFilePath, logLine, 'utf-8');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Core logging function
 */
async function log(entry: LogEntry): Promise<void> {
  // Always log to console
  logToConsole(entry);
  
  // Optionally log to file
  await logToFile(entry);
}

/**
 * Log payroll calculation
 */
export async function logPayrollCalculation(data: {
  userId?: string;
  organizationId?: string;
  period: string;
  employeeCount: number;
  totalAmountUSD: string;
  totalHours: string;
  level?: LogLevel;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const entry: PayrollCalculationLog = {
    timestamp: formatTimestamp(),
    level: data.level || 'info',
    action: 'calculate',
    userId: data.userId,
    organizationId: data.organizationId,
    period: data.period,
    employeeCount: data.employeeCount,
    totalAmountUSD: data.totalAmountUSD,
    totalHours: data.totalHours,
    metadata: data.metadata,
  };

  await log(entry);
}

/**
 * Log payroll batch creation
 */
export async function logPayrollBatchCreation(data: {
  userId?: string;
  organizationId?: string;
  period: string;
  batchSize: number;
  totalAmountUSD: string;
  totalAmountXRP: string;
  exchangeRate: number;
  status: TransactionStatus;
  level?: LogLevel;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const entry: PayrollBatchCreationLog = {
    timestamp: formatTimestamp(),
    level: data.level || 'info',
    action: 'create_batch',
    userId: data.userId,
    organizationId: data.organizationId,
    period: data.period,
    batchSize: data.batchSize,
    totalAmountUSD: data.totalAmountUSD,
    totalAmountXRP: data.totalAmountXRP,
    exchangeRate: data.exchangeRate,
    status: data.status,
    metadata: data.metadata,
  };

  await log(entry);
}

/**
 * Log payment processing (generic)
 */
export async function logPaymentProcessing(data: {
  userId?: string;
  organizationId?: string;
  payrollId: string;
  employeeId: string;
  amountUSD: string;
  amountXRP?: string;
  level?: LogLevel;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const entry: PaymentProcessingLog = {
    timestamp: formatTimestamp(),
    level: data.level || 'info',
    action: 'process_payment',
    userId: data.userId,
    organizationId: data.organizationId,
    payrollId: data.payrollId,
    employeeId: data.employeeId,
    amountUSD: data.amountUSD,
    amountXRP: data.amountXRP,
    status: 'pending',
    metadata: data.metadata,
  };

  await log(entry);
}

/**
 * Log successful payment
 */
export async function logPaymentSuccess(data: {
  userId?: string;
  organizationId?: string;
  payrollId: string;
  employeeId: string;
  amountUSD: string;
  amountXRP?: string;
  transactionHash: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const entry: PaymentProcessingLog = {
    timestamp: formatTimestamp(),
    level: 'info',
    action: 'process_payment',
    userId: data.userId,
    organizationId: data.organizationId,
    payrollId: data.payrollId,
    employeeId: data.employeeId,
    amountUSD: data.amountUSD,
    amountXRP: data.amountXRP,
    transactionHash: data.transactionHash,
    status: 'success',
    metadata: data.metadata,
  };

  await log(entry);
}

/**
 * Log failed payment
 */
export async function logPaymentFailure(data: {
  userId?: string;
  organizationId?: string;
  payrollId: string;
  employeeId: string;
  amountUSD: string;
  amountXRP?: string;
  errorMessage: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const entry: PaymentProcessingLog = {
    timestamp: formatTimestamp(),
    level: 'error',
    action: 'process_payment',
    userId: data.userId,
    organizationId: data.organizationId,
    payrollId: data.payrollId,
    employeeId: data.employeeId,
    amountUSD: data.amountUSD,
    amountXRP: data.amountXRP,
    status: 'failed',
    errorMessage: data.errorMessage,
    metadata: data.metadata,
  };

  await log(entry);
}

/**
 * Log payment retry
 */
export async function logPaymentRetry(data: {
  userId?: string;
  organizationId?: string;
  payrollId: string;
  employeeId: string;
  retryCount: number;
  amountUSD: string;
  amountXRP?: string;
  status: TransactionStatus;
  errorMessage?: string;
  level?: LogLevel;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const entry: PaymentRetryLog = {
    timestamp: formatTimestamp(),
    level: data.level || (data.status === 'failed' ? 'error' : 'info'),
    action: 'retry',
    userId: data.userId,
    organizationId: data.organizationId,
    payrollId: data.payrollId,
    employeeId: data.employeeId,
    retryCount: data.retryCount,
    amountUSD: data.amountUSD,
    amountXRP: data.amountXRP,
    status: data.status,
    errorMessage: data.errorMessage,
    metadata: data.metadata,
  };

  await log(entry);
}

/**
 * Export configuration for testing purposes
 */
export const loggerConfig = config;
