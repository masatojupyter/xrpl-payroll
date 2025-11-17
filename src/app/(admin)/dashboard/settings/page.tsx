'use client'

import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { CompanySettings } from '@/components/settings/CompanySettings'
import { AttendanceSettings } from '@/components/settings/AttendanceSettings'
import { PayrollSettings } from '@/components/settings/PayrollSettings'
import { NotificationSettings } from '@/components/settings/NotificationSettings'
import { UserSettings } from '@/components/settings/UserSettings'
import type {
  CompanySettingsInput,
  AttendanceSettingsInput,
  PayrollSettingsInput,
  NotificationSettingsInput,
  UserSettingsInput,
} from '@/lib/validators/settings'

type TabKey = 'company' | 'attendance' | 'payroll' | 'notifications' | 'user'

interface Tab {
  key: TabKey
  label: string
  icon: string
}

const tabs: Tab[] = [
  { key: 'company', label: 'Company Information', icon: '🏢' },
  { key: 'attendance', label: 'Attendance Settings', icon: '⏰' },
  { key: 'payroll', label: 'Payroll Settings', icon: '💰' },
  { key: 'notifications', label: 'Notification Settings', icon: '🔔' },
  { key: 'user', label: 'User Settings', icon: '👤' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('company')
  const [companyData, setCompanyData] = useState<CompanySettingsInput | undefined>()
  const [isLoadingCompany, setIsLoadingCompany] = useState(true)

  useEffect(() => {
    if (activeTab === 'company') {
      fetchCompanySettings()
    }
  }, [activeTab])

  const fetchCompanySettings = async () => {
    try {
      setIsLoadingCompany(true)
      const response = await fetch('/api/settings/company')
      if (response.ok) {
        const data = await response.json()
        setCompanyData(data)
      }
    } catch (error) {
      console.error('Failed to fetch company settings:', error)
    } finally {
      setIsLoadingCompany(false)
    }
  }

  const handleSaveCompany = async (data: CompanySettingsInput) => {
    const response = await fetch('/api/settings/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw error
    }
  }

  const handleSaveAttendance = async (data: AttendanceSettingsInput) => {
    const response = await fetch('/api/settings/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw error
    }
  }

  const handleSavePayroll = async (data: PayrollSettingsInput) => {
    const response = await fetch('/api/settings/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw error
    }
  }

  const handleSaveNotifications = async (data: NotificationSettingsInput) => {
    const response = await fetch('/api/settings/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw error
    }
  }

  const handleSaveUser = async (data: UserSettingsInput) => {
    const response = await fetch('/api/settings/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw error
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage various system settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  group inline-flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap
                  ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'company' && !isLoadingCompany && (
            <CompanySettings initialData={companyData} onSave={handleSaveCompany} />
          )}
          {activeTab === 'company' && isLoadingCompany && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          {activeTab === 'attendance' && <AttendanceSettings onSave={handleSaveAttendance} />}
          {activeTab === 'payroll' && <PayrollSettings onSave={handleSavePayroll} />}
          {activeTab === 'notifications' && (
            <NotificationSettings onSave={handleSaveNotifications} />
          )}
          {activeTab === 'user' && <UserSettings onSave={handleSaveUser} />}
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong>{' '}
          After making changes, be sure to click the &quot;Save&quot; button. Unsaved changes will be lost.
        </p>
      </div>
    </div>
  )
}
