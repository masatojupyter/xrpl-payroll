'use client';

import { X, CheckCircle, AlertCircle } from 'lucide-react';

type PayrollCalculation = {
  employeeId: string;
  employee: {
    employeeCode: string;
    firstName: string;
    lastName: string;
    department: string;
  };
  workDays: number;
  totalHours: number | string; // Can be string from Decimal serialization
  regularHours: number | string;
  overtimeHours: number | string;
  basePay: number | string;
  overtimePay: number | string;
  totalPay: number | string;
};

interface PayrollPreviewProps {
  calculations: PayrollCalculation[];
  period: {
    startDate: string;
    endDate: string;
  };
  onApprove: () => void;
  onCancel: () => void;
}

export function PayrollPreview({
  calculations,
  period,
  onApprove,
  onCancel,
}: PayrollPreviewProps) {
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(numAmount);
  };

  const toNumber = (value: number | string): number => {
    return typeof value === 'string' ? parseFloat(value) : value;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const totalAmount = calculations.reduce((sum, calc) => sum + toNumber(calc.totalPay), 0);
  const totalOvertimePay = calculations.reduce((sum, calc) => sum + toNumber(calc.overtimePay), 0);

  // Group by department
  const byDepartment = calculations.reduce((acc, calc) => {
    const dept = calc.employee.department;
    if (!acc[dept]) {
      acc[dept] = {
        count: 0,
        totalPay: 0,
      };
    }
    acc[dept].count++;
    acc[dept].totalPay += toNumber(calc.totalPay);
    return acc;
  }, {} as Record<string, { count: number; totalPay: number }>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payroll Preview</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review the payroll calculation before processing payment
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Period Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Pay Period</h3>
            <p className="text-blue-800">
              {formatDate(period.startDate)} - {formatDate(period.endDate)}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {calculations.length}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Payroll</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Overtime Pay</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(totalOvertimePay)}
              </p>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Department Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(byDepartment).map(([dept, data]) => (
                <div key={dept} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">{dept}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-600">
                      Employees: <span className="font-medium">{data.count}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Total: <span className="font-medium">{formatCurrency(data.totalPay)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Details Table */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Employee Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overtime
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Pay
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calculations.map((calc) => (
                    <tr key={calc.employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="font-medium text-gray-900">
                          {calc.employee.firstName} {calc.employee.lastName}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {calc.employee.employeeCode}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {calc.employee.department}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {calc.workDays}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {toNumber(calc.totalHours).toFixed(1)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {toNumber(calc.overtimeHours) > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {toNumber(calc.overtimeHours).toFixed(1)}h
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        {formatCurrency(calc.totalPay)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                  Important Notice
                </h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Please review all calculations carefully before approval</li>
                  <li>• Payments will be processed immediately via XRP blockchain</li>
                  <li>• Ensure all employee wallet addresses are correct</li>
                  <li>• This action cannot be undone once confirmed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Total Amount: <span className="font-bold text-gray-900 text-lg ml-2">
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onApprove}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Approve & Process Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
