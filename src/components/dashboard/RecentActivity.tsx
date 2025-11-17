import { Clock, User, DollarSign, UserPlus } from 'lucide-react'

interface Activity {
  id: string
  type: 'payment' | 'employee' | 'attendance' | 'other'
  description: string
  timestamp: Date
  user?: string
}

interface RecentActivityProps {
  activities: Activity[]
  loading?: boolean
}

function getActivityIcon(type: Activity['type']) {
  switch (type) {
    case 'payment':
      return <DollarSign className="h-5 w-5 text-green-600" />
    case 'employee':
      return <UserPlus className="h-5 w-5 text-blue-600" />
    case 'attendance':
      return <Clock className="h-5 w-5 text-purple-600" />
    default:
      return <User className="h-5 w-5 text-gray-600" />
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  })
}

export function RecentActivity({ activities, loading = false }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-6 animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-4 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
      
      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No activity yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="p-2 bg-gray-50 rounded-full">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  {activity.user && (
                    <>
                      <span className="text-xs text-gray-500">{activity.user}</span>
                      <span className="text-xs text-gray-300">•</span>
                    </>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {activities.length > 0 && (
        <div className="mt-6 text-center">
          <a 
            href="/dashboard/activity" 
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all activity →
          </a>
        </div>
      )}
    </div>
  )
}
