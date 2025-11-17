'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
  Calculator,
  History,
  Wallet as WalletIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { MonthPicker } from '@/components/attendance/MonthPicker'
import { XRPExchangeRate } from '@/components/payroll/XRPExchangeRate'
import WalletBalance from '@/components/wallet/WalletBalance'
import WalletAddress from '@/components/wallet/WalletAddress'
import TransactionHistory from '@/components/wallet/TransactionHistory'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'

// ===== TYPES =====

type Employee = {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  department: { name: string } | null
  walletAddress: string | null
}

type PayrollRecord = {
  id: string
  period: string
  employee: {
    employeeCode: string
    firstName: string
    lastName: string
  }
  totalAmountUSD: number
  totalAmountXRP: number | null
  exchangeRate: number | null
  status: 'pending' | 'paid' | 'failed'
  transactionStatus: 'pending' | 'processing' | 'completed' | 'failed'
  transactionHash: string | null
  paidAt: string | null
  failureReason: string | null
  createdAt: string
}

type CalculationResult = {
  employeeId: string
  employee: {
    employeeCode: string
    firstName: string
    lastName: string
    walletAddress: string | null
  }
  totalHours: number
  totalAmountUSD: number
}

// ===== CONSTANTS =====

const COMPANY_WALLET_ADDRESS = 'rMg2AK7e3FXLXUhgvt69JuzG25Q88JxAtD'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'API Error')
  }
  return res.json()
}

// ===== HELPER COMPONENTS =====

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
  }

  const style = config[status as keyof typeof config] || config.pending

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  )
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  summary,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  summary: {
    employeeCount: number
    totalUSD: number
    totalXRP: number
  }
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Payment</h3>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Employees:</span>
              <span className="font-medium">{summary.employeeCount} employees</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total (USD):</span>
              <span className="font-medium">${summary.totalUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total (XRP):</span>
              <span className="font-medium text-blue-600">{summary.totalXRP.toFixed(6)} XRP</span>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-yellow-800">
              This operation cannot be undone. Are you sure you want to proceed with the payment?
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Execute Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== MAIN COMPONENT =====

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<'calculate' | 'history' | 'wallet'>('calculate')

  // Calculation Tab State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [calculationResults, setCalculationResults] = useState<CalculationResult[] | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 })

  // History Tab State
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState('')
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all')
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Fetch employees
  const { data: employeesData } = useSWR<{ data: Employee[] }>(
    '/api/employees?isActive=true&limit=1000',
    fetcher
  )

  // Fetch payroll history
  const { data: payrollData, mutate: mutatePayroll } = useSWR<{
    data: PayrollRecord[]
  }>(
    activeTab === 'history' ? '/api/payroll/history?limit=100' : null,
    fetcher,
    { refreshInterval: isProcessing ? 3000 : 0 }
  )

  // Fetch XRP exchange rate
  const { data: exchangeRateData } = useSWR<{
    success: boolean
    rate: number
  }>('/api/xrp/exchange-rate', fetcher, { refreshInterval: 5 * 60 * 1000 })

  // ===== HANDLERS =====

  const handleMonthSelect = (year: number, month: number) => {
    setSelectedYear(year)
    setSelectedMonth(month)
  }

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    )
  }

  const handleSelectAllEmployees = () => {
    if (!employeesData?.data) return
    setSelectedEmployeeIds(
      selectedEmployeeIds.length === employeesData.data.length
        ? []
        : employeesData.data.map((e) => e.id)
    )
  }

  const handleCalculate = async () => {
    if (selectedEmployeeIds.length === 0) {
      alert('Please select at least one employee')
      return
    }

    setIsCalculating(true)
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1)
      const endDate = new Date(selectedYear, selectedMonth + 1, 0)

      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          employeeIds: selectedEmployeeIds,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Calculation failed')
      }

      const result = await response.json()
      setCalculationResults(result.data)
    } catch (error) {
      console.error('Calculation error:', error)
      alert(error instanceof Error ? error.message : 'Failed to calculate payroll')
    } finally {
      setIsCalculating(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!calculationResults || !exchangeRateData?.rate) return

    setShowConfirmDialog(false)
    setIsProcessing(true)
    setProcessingProgress({ current: 0, total: calculationResults.length })

    try {
      const period = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`

      const batchResponse = await fetch('/api/payroll/create-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          calculations: calculationResults.map((calc) => ({
            employeeId: calc.employeeId,
            totalHours: calc.totalHours,
            totalAmountUSD: calc.totalAmountUSD,
            totalAmountXRP: calc.totalAmountUSD / exchangeRateData.rate,
            exchangeRate: exchangeRateData.rate,
          })),
        }),
      })

      if (!batchResponse.ok) {
        const error = await batchResponse.json()
        throw new Error(error.error || 'Failed to create batch')
      }

      const paymentResponse = await fetch('/api/payroll/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      })

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json()
        throw new Error(error.error || 'Failed to process payments')
      }

      await pollPaymentStatus(period)

      setCalculationResults(null)
      setSelectedEmployeeIds([])
      setActiveTab('history')
      await mutatePayroll()
    } catch (error) {
      console.error('Payment error:', error)
      alert(error instanceof Error ? error.message : 'Payment processing failed')
    } finally {
      setIsProcessing(false)
      setProcessingProgress({ current: 0, total: 0 })
    }
  }

  const pollPaymentStatus = async (period: string) => {
    let attempts = 0
    const maxAttempts = 40

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/payroll/history?period=${period}`)
        if (!response.ok) break

        const data = await response.json()
        const records = data.data as PayrollRecord[]

        const completed = records.filter(
          (r) => r.transactionStatus === 'completed' || r.transactionStatus === 'failed'
        ).length

        setProcessingProgress({ current: completed, total: records.length })

        if (completed === records.length) break

        await new Promise((resolve) => setTimeout(resolve, 3000))
        attempts++
      } catch (error) {
        console.error('Poll error:', error)
        break
      }
    }
  }

  const handleRetryPayment = async (payrollId: string) => {
    try {
      const response = await fetch('/api/payroll/retry-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Retry failed')
      }

      await mutatePayroll()
      alert('Payment retry initiated')
    } catch (error) {
      console.error('Retry error:', error)
      alert(error instanceof Error ? error.message : 'Failed to retry payment')
    }
  }

  const handleBatchPayment = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    const pendingRows = selectedRows.filter((row) => row.original.transactionStatus === 'pending')

    if (pendingRows.length === 0) {
      alert('Please select pending payments')
      return
    }

    if (!confirm(`Process ${pendingRows.length} payment(s)?`)) return

    try {
      for (const row of pendingRows) {
        await fetch('/api/payroll/retry-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payrollId: row.original.id }),
        })
      }
      await mutatePayroll()
      alert('Batch payment initiated')
    } catch (error) {
      console.error('Batch payment error:', error)
      alert('Failed to process batch payment')
    }
  }

  // ===== CALCULATIONS =====

  const calculationSummary = useMemo(() => {
    if (!calculationResults || !exchangeRateData?.rate) return null

    const totalUSD = calculationResults.reduce((sum, calc) => sum + calc.totalAmountUSD, 0)
    const totalXRP = totalUSD / exchangeRateData.rate

    return {
      employeeCount: calculationResults.length,
      totalHours: calculationResults.reduce((sum, calc) => sum + calc.totalHours, 0),
      totalUSD,
      totalXRP,
      exchangeRate: exchangeRateData.rate,
    }
  }, [calculationResults, exchangeRateData])

  const filteredPayrollData = useMemo(() => {
    if (!payrollData?.data) return []

    return payrollData.data.filter((record) => {
      if (historyPeriodFilter && !record.period.includes(historyPeriodFilter)) {
        return false
      }
      if (historyStatusFilter !== 'all' && record.transactionStatus !== historyStatusFilter) {
        return false
      }
      return true
    })
  }, [payrollData, historyPeriodFilter, historyStatusFilter])

  const columns = useMemo<ColumnDef<PayrollRecord>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
        ),
      },
      {
        accessorKey: 'period',
        header: 'Period',
        cell: ({ getValue }) => {
          const period = getValue() as string
          const [year, month] = period.split('-')
          return `${year}/${month}`
        },
      },
      {
        id: 'employee',
        header: 'Employee',
        accessorFn: (row) => `${row.employee.lastName} ${row.employee.firstName}`,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900">
              {row.original.employee.lastName} {row.original.employee.firstName}
            </div>
            <div className="text-xs text-gray-500">{row.original.employee.employeeCode}</div>
          </div>
        ),
      },
      {
        accessorKey: 'totalAmountUSD',
        header: 'USD Amount',
        cell: ({ getValue }) => `$${(getValue() as number).toFixed(2)}`,
      },
      {
        accessorKey: 'totalAmountXRP',
        header: 'XRP Amount',
        cell: ({ getValue }) => {
          const xrp = getValue() as number | null
          return xrp ? `${xrp.toFixed(6)} XRP` : '-'
        },
      },
      {
        accessorKey: 'transactionStatus',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string
          return <StatusBadge status={status} />
        },
      },
      {
        accessorKey: 'transactionHash',
        header: 'Transaction',
        cell: ({ getValue }) => {
          const hash = getValue() as string | null
          if (!hash) return <span className="text-gray-400">-</span>
          return (
            <a
              href={`https://testnet.xrpl.org/transactions/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
            >
              <span className="truncate max-w-[100px]">{hash.substring(0, 8)}...</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => handleRetryPayment(row.original.id)}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            disabled={row.original.transactionStatus !== 'failed'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredPayrollData,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  // ===== RENDER =====

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
        <p className="text-sm text-gray-600 mt-1">Payroll Management with XRP Payments</p>
      </div>

      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <div className="font-medium text-blue-900">Processing Payments</div>
              <div className="text-sm text-blue-700 mt-1">
                {processingProgress.current} / {processingProgress.total} completed
              </div>
            </div>
            <div className="text-sm font-medium text-blue-900">
              {processingProgress.total > 0
                ? Math.round((processingProgress.current / processingProgress.total) * 100)
                : 0}
              %
            </div>
          </div>
          <div className="mt-3 bg-blue-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{
                width: `${
                  processingProgress.total > 0
                    ? (processingProgress.current / processingProgress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('calculate')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'calculate'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Payroll Calculation
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Payment History
            </div>
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'wallet'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <WalletIcon className="w-4 h-4" />
              Wallet Management
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'calculate' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Period Selection</h3>
              <button
                onClick={() => setIsMonthPickerOpen(true)}
                className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">
                    {monthNames[selectedMonth]} {selectedYear}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              </button>
              <MonthPicker
                currentYear={selectedYear}
                currentMonth={selectedMonth}
                onMonthSelect={handleMonthSelect}
                onClose={() => setIsMonthPickerOpen(false)}
                isOpen={isMonthPickerOpen}
              />
            </div>

            <div className="lg:col-span-2">
              <XRPExchangeRate showCalculator={true} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Employee Selection</h3>
                <button onClick={handleSelectAllEmployees} className="text-sm text-blue-600 hover:text-blue-800">
                  {selectedEmployeeIds.length === employeesData?.data.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {!employeesData ? (
                <div className="text-center py-8 text-gray-500">Loading employees...</div>
              ) : employeesData.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No employees found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {employeesData.data.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(employee.id)}
                        onChange={() => handleEmployeeToggle(employee.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {employee.lastName} {employee.firstName}
                        </div>
                        <div className="text-xs text-gray-500">{employee.employeeCode}</div>
                      </div>
                      {!employee.walletAddress && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCalculate}
              disabled={isCalculating || selectedEmployeeIds.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  Calculate Payroll
                </>
              )}
            </button>
          </div>

          {calculationResults && calculationSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600">Employees</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{calculationSummary.employeeCount}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{calculationSummary.totalHours.toFixed(1)}h</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600">Total USD</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">${calculationSummary.totalUSD.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600">Total XRP</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{calculationSummary.totalXRP.toFixed(6)}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">USD</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">XRP</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Wallet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {calculationResults.map((result) => (
                        <tr key={result.employeeId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {result.employee.lastName} {result.employee.firstName}
                            </div>
                            <div className="text-xs text-gray-500">{result.employee.employeeCode}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            {result.totalHours.toFixed(1)}h
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            ${result.totalAmountUSD.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-600 font-medium">
                            {(result.totalAmountUSD / calculationSummary.exchangeRate).toFixed(6)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {result.employee.walletAddress ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowConfirmDialog(true)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  Create Payroll Batch
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Filter by period (e.g., 2025-01)"
                value={historyPeriodFilter}
                onChange={(e) => setHistoryPeriodFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {table.getSelectedRowModel().rows.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {table.getSelectedRowModel().rows.length} selected
                </p>
                <button
                  onClick={handleBatchPayment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Execute Batch Payment
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                        No payroll records found
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
              <span className="text-sm text-gray-700">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WalletAddress address={COMPANY_WALLET_ADDRESS} label="Company Wallet Address" showFullAddress={true} />
            <WalletBalance walletAddress={COMPANY_WALLET_ADDRESS} />
          </div>
          <TransactionHistory walletAddress={COMPANY_WALLET_ADDRESS} limit={50} />
        </div>
      )}

      {showConfirmDialog && calculationSummary && (
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={handleConfirmPayment}
          summary={calculationSummary}
        />
      )}
    </div>
  )
}
