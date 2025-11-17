import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import {
  MonthlyAttendanceData,
  PayslipData,
  AnnualPaymentData,
  AttendanceRecord,
  PaymentAllowance,
  PaymentDeduction,
  MonthlyPayment,
  DeductionBreakdown
} from './types';

// Helper function to convert number or string to number
const toNumber = (value: number | string): number => {
  return typeof value === 'string' ? parseFloat(value) : value;
};

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #000',
    paddingBottom: 10
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  table: {
    width: '100%',
    marginBottom: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold'
  },
  tableCol: {
    flex: 1,
    paddingHorizontal: 5
  },
  tableColNarrow: {
    width: '15%',
    paddingHorizontal: 5
  },
  tableColWide: {
    width: '40%',
    paddingHorizontal: 5
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5
  },
  infoLabel: {
    width: '40%',
    fontWeight: 'bold'
  },
  infoValue: {
    width: '60%'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#666',
    borderTop: '1px solid #e0e0e0',
    paddingTop: 10
  },
  summaryBox: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginTop: 10,
    border: '1px solid #e0e0e0'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 5,
    borderTop: '1px solid #ccc'
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: 'bold'
  },
  totalValue: {
    fontSize: 13,
    fontWeight: 'bold'
  }
});

// Monthly Attendance Report
export const MonthlyAttendanceReport = ({ data }: { data: MonthlyAttendanceData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>月次勤怠レポート</Text>
        <Text style={styles.subtitle}>
          期間: {format(new Date(data.startDate), 'yyyy年MM月dd日')} - {format(new Date(data.endDate), 'yyyy年MM月dd日')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>従業員情報</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>従業員ID:</Text>
          <Text style={styles.infoValue}>{data.employee.employeeId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>氏名:</Text>
          <Text style={styles.infoValue}>{data.employee.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>部署:</Text>
          <Text style={styles.infoValue}>{data.employee.department}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>勤怠サマリー</Text>
        <View style={styles.summaryBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>総勤務日数:</Text>
            <Text style={styles.infoValue}>{data.summary.totalDays}日</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>総勤務時間:</Text>
            <Text style={styles.infoValue}>{toNumber(data.summary.totalHours).toFixed(1)}時間</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>残業時間:</Text>
            <Text style={styles.infoValue}>{toNumber(data.summary.overtimeHours).toFixed(1)}時間</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>欠勤日数:</Text>
            <Text style={styles.infoValue}>{data.summary.absentDays}日</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>勤怠詳細</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableColNarrow}>日付</Text>
            <Text style={styles.tableCol}>出勤時刻</Text>
            <Text style={styles.tableCol}>退勤時刻</Text>
            <Text style={styles.tableCol}>勤務時間</Text>
            <Text style={styles.tableCol}>残業時間</Text>
          </View>
          {data.records.map((record: AttendanceRecord, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableColNarrow}>{format(new Date(record.date), 'MM/dd')}</Text>
              <Text style={styles.tableCol}>{record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}</Text>
              <Text style={styles.tableCol}>{record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}</Text>
              <Text style={styles.tableCol}>{record.workHours ? `${toNumber(record.workHours).toFixed(1)}h` : '-'}</Text>
              <Text style={styles.tableCol}>{record.overtimeHours ? `${toNumber(record.overtimeHours).toFixed(1)}h` : '-'}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text>生成日時: {format(new Date(), 'yyyy年MM月dd日 HH:mm')}</Text>
      </View>
    </Page>
  </Document>
);

// Payslip Report
export const PayslipReport = ({ data }: { data: PayslipData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>給与明細書</Text>
        <Text style={styles.subtitle}>
          {format(new Date(data.paymentDate), 'yyyy年MM月分')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>従業員情報</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>従業員ID:</Text>
          <Text style={styles.infoValue}>{data.employee.employeeId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>氏名:</Text>
          <Text style={styles.infoValue}>{data.employee.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>部署:</Text>
          <Text style={styles.infoValue}>{data.employee.department}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>支払日:</Text>
          <Text style={styles.infoValue}>{format(new Date(data.paymentDate), 'yyyy年MM月dd日')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>支給額</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableColWide}>基本給</Text>
            <Text style={styles.tableCol}>{data.breakdown.baseSalary.toLocaleString()}円</Text>
          </View>
          {data.breakdown.allowances.map((allowance: PaymentAllowance, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableColWide}>{allowance.name}</Text>
              <Text style={styles.tableCol}>{allowance.amount.toLocaleString()}円</Text>
            </View>
          ))}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableColWide}>支給額合計</Text>
            <Text style={styles.tableCol}>{data.breakdown.grossPay.toLocaleString()}円</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>控除額</Text>
        <View style={styles.table}>
          {data.breakdown.deductions.map((deduction: PaymentDeduction, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableColWide}>{deduction.name}</Text>
              <Text style={styles.tableCol}>{deduction.amount.toLocaleString()}円</Text>
            </View>
          ))}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableColWide}>控除額合計</Text>
            <Text style={styles.tableCol}>{data.breakdown.totalDeductions.toLocaleString()}円</Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryBox}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>差引支給額</Text>
          <Text style={styles.totalValue}>{data.netPay.toLocaleString()}円</Text>
        </View>
      </View>

      {data.cryptoPayment && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>暗号資産支払い情報</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ウォレットアドレス:</Text>
            <Text style={styles.infoValue}>{data.cryptoPayment.walletAddress}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>支払額 (XRP):</Text>
            <Text style={styles.infoValue}>{data.cryptoPayment.amount} XRP</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>トランザクションハッシュ:</Text>
            <Text style={styles.infoValue}>{data.cryptoPayment.txHash}</Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text>生成日時: {format(new Date(), 'yyyy年MM月dd日 HH:mm')}</Text>
      </View>
    </Page>
  </Document>
);

// Annual Payment Summary
export const AnnualPaymentSummary = ({ data }: { data: AnnualPaymentData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>年間支払いサマリー</Text>
        <Text style={styles.subtitle}>
          {format(new Date(data.startDate), 'yyyy年MM月')} - {format(new Date(data.endDate), 'yyyy年MM月')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>従業員情報</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>従業員ID:</Text>
          <Text style={styles.infoValue}>{data.employee.employeeId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>氏名:</Text>
          <Text style={styles.infoValue}>{data.employee.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>部署:</Text>
          <Text style={styles.infoValue}>{data.employee.department}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>年間サマリー</Text>
        <View style={styles.summaryBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>支給総額:</Text>
            <Text style={styles.infoValue}>{data.summary.totalGrossPay.toLocaleString()}円</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>控除総額:</Text>
            <Text style={styles.infoValue}>{data.summary.totalDeductions.toLocaleString()}円</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>差引支給総額:</Text>
            <Text style={styles.infoValue}>{data.summary.totalNetPay.toLocaleString()}円</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>支払回数:</Text>
            <Text style={styles.infoValue}>{data.summary.paymentCount}回</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>月別支払い詳細</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCol}>月</Text>
            <Text style={styles.tableCol}>支給額</Text>
            <Text style={styles.tableCol}>控除額</Text>
            <Text style={styles.tableCol}>差引支給額</Text>
          </View>
          {data.monthlyBreakdown.map((month: MonthlyPayment, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCol}>{format(new Date(month.month), 'yyyy年MM月')}</Text>
              <Text style={styles.tableCol}>{month.grossPay.toLocaleString()}円</Text>
              <Text style={styles.tableCol}>{month.deductions.toLocaleString()}円</Text>
              <Text style={styles.tableCol}>{month.netPay.toLocaleString()}円</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>控除内訳（年間累計）</Text>
        <View style={styles.table}>
          {data.deductionBreakdown.map((deduction: DeductionBreakdown, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableColWide}>{deduction.name}</Text>
              <Text style={styles.tableCol}>{deduction.amount.toLocaleString()}円</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text>生成日時: {format(new Date(), 'yyyy年MM月dd日 HH:mm')}</Text>
      </View>
    </Page>
  </Document>
);
