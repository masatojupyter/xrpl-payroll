"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { 
  User, 
  Mail, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Wallet,
  Building2,
  Shield,
  Edit2,
  Save,
  X
} from "lucide-react"
import { LoadingSpinner } from "@/components/LoadingSpinner"

interface Department {
  id: string
  name: string
}

interface Organization {
  id: string
  name: string
}

interface EmployeeProfile {
  id: string
  employeeCode: string
  email: string
  firstName: string
  lastName: string
  departmentId: string | null
  department: Department | null
  position: string | null
  joinDate: string
  hourlyRate: string
  employmentType: string
  walletAddress: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  organization: Organization
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingWallet, setIsEditingWallet] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/employee/profile")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch profile")
      }

      setProfile(data.data)
      setWalletAddress(data.data.walletAddress || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleEditWallet = () => {
    setIsEditingWallet(true)
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleCancelEdit = () => {
    setIsEditingWallet(false)
    setWalletAddress(profile?.walletAddress || "")
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleSaveWallet = async () => {
    if (!walletAddress.trim()) {
      setSaveError("Wallet address cannot be empty")
      return
    }

    try {
      setSaving(true)
      setSaveError(null)
      setSaveSuccess(false)

      const response = await fetch("/api/employee/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: walletAddress.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update wallet address")
      }

      setProfile(data.data)
      setIsEditingWallet(false)
      setSaveSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 dark:text-gray-400">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and manage your profile information
        </p>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200 text-sm">
            ✓ Profile updated successfully
          </p>
        </div>
      )}

      {/* Personal Information */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <User className="w-5 h-5" />
          Personal Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {profile.firstName} {profile.lastName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email Address</p>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {profile.email}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Employee Code</p>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {profile.employeeCode}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Join Date</p>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {format(new Date(profile.joinDate), "MMM dd, yyyy")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Employment Details */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Employment Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Organization</p>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {profile.organization.name}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {profile.department?.name || "Not assigned"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Briefcase className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Position</p>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {profile.position || "Not specified"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Briefcase className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Employment Type</p>
              <p className="font-medium text-gray-900 dark:text-white mt-1 capitalize">
                {profile.employmentType.replace("-", " ")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Hourly Rate</p>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                ${parseFloat(profile.hourlyRate).toFixed(2)}/hour
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                profile.isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}>
                {profile.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Account Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Account Created</p>
            <p className="font-medium text-gray-900 dark:text-white mt-1">
              {format(new Date(profile.createdAt), "MMM dd, yyyy 'at' HH:mm")}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
            <p className="font-medium text-gray-900 dark:text-white mt-1">
              {format(new Date(profile.updatedAt), "MMM dd, yyyy 'at' HH:mm")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
