"use client"

import { useState } from "react"
import { EmployeeSidebar } from "./EmployeeSidebar"
import { Header } from "./Header"

interface EmployeeDashboardWrapperProps {
  userId?: string
  userEmail?: string
  userName?: string
  organizationName?: string
  children: React.ReactNode
}

export function EmployeeDashboardWrapper({
  userId,
  userEmail,
  userName,
  organizationName,
  children,
}: EmployeeDashboardWrapperProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    // Trigger the form submission
    const form = document.getElementById('signout-form') as HTMLFormElement
    if (form) {
      form.requestSubmit()
    }
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Employee Sidebar */}
      <EmployeeSidebar 
        userEmail={userEmail}
        onSignOut={handleSignOut}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />

      {/* Main Content Area */}
      <div className="md:ml-64">
        {/* Header */}
        <Header 
          userId={userId}
          organizationName={organizationName}
          userName={userName}
          userType="employee"
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        {/* Main Content */}
        <main className="pt-16 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
