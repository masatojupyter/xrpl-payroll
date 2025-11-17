"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

interface DashboardWrapperProps {
  userId?: string
  userEmail?: string
  userName?: string
  userType?: "admin" | "employee"
  organizationName?: string
  children: React.ReactNode
}

export function DashboardWrapper({
  userId,
  userEmail,
  userName,
  userType = "admin",
  organizationName,
  children,
}: DashboardWrapperProps) {
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
      {/* Sidebar */}
      <Sidebar 
        userEmail={userEmail}
        userType={userType}
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
          userType={userType}
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
