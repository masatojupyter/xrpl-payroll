import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="space-y-8">
      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-96 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Notice Skeleton */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-blue-200 rounded animate-pulse" />
          <div className="h-4 w-full bg-blue-200 rounded animate-pulse" />
          <div className="h-4 w-full bg-blue-200 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-blue-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Stats Section */}
      <div>
        <div className="h-7 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4 animate-pulse" />
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* List Section */}
      <div>
        <div className="h-7 w-48 bg-gray-200 rounded mb-4 animate-pulse" />
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>読み込み中...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
