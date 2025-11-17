"use client"

import { User, Menu, X } from "lucide-react"
import { NotificationCenter } from "@/components/notifications/NotificationCenter"

interface HeaderProps {
  organizationName?: string
  userName?: string
  userId?: string
  userType?: 'admin' | 'employee'
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export function Header({ organizationName, userName, userId, userType, isSidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-8 z-10">
      {/* Left Section - Hamburger Menu (Mobile) + Organization Name */}
      <div className="flex items-center space-x-3">
        {/* Hamburger Menu - Mobile Only */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {isSidebarOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>

        {/* Organization Name */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {organizationName || "Organization"}
        </h2>
      </div>

      {/* Right Section - Notifications & User */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Notifications */}
        {userId && <NotificationCenter userId={userId} />}

        {/* User Type Badge & User Avatar & Name */}
        <div className="flex items-center space-x-3 px-2 md:px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
          {/* User Type Badge */}
          {userType && (
            <span className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              userType === 'admin' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {userType === 'admin' ? 'Admin' : 'Employee'}
            </span>
          )}
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-900 dark:text-white">
            {userName || "User"}
          </span>
        </div>
      </div>
    </header>
  )
}
