"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Calendar, 
  DollarSign, 
  User,
  LogOut, 
  Wallet
} from "lucide-react"
import { cn } from "@/lib/utils"

interface EmployeeSidebarProps {
  userEmail?: string
  onSignOut: () => void
  isOpen?: boolean
  onClose?: () => void
}

const navigation = [
  { name: "Dashboard", href: "/employee-dashboard", icon: LayoutDashboard },
  { name: "My Attendance", href: "/employee-dashboard/attendance", icon: Calendar },
  { name: "My Payroll", href: "/employee-dashboard/payroll", icon: DollarSign },
  { name: "My Wallet", href: "/employee-dashboard/wallet", icon: Wallet },
  { name: "Profile", href: "/employee-dashboard/profile", icon: User },
]

export function EmployeeSidebar({ userEmail, onSignOut, isOpen, onClose }: EmployeeSidebarProps) {
  const pathname = usePathname()

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 ease-in-out",
          // Mobile: slide in/out based on isOpen state
          isOpen ? "translate-x-0 z-50" : "-translate-x-full z-50",
          // Desktop: always visible, higher z-index than mobile
          "md:translate-x-0 md:z-40"
        )}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Payroll
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Section & Logout */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          {userEmail && (
            <div className="mb-3 px-3 py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {userEmail}
              </p>
            </div>
          )}
          <button
            onClick={onSignOut}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
