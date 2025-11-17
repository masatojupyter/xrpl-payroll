import { memo } from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  variant?: 'spinner' | 'dots' | 'bars'
  color?: 'blue' | 'green' | 'red' | 'yellow'
}

export const LoadingSpinner = memo(function LoadingSpinner({ 
  size = 'md', 
  text,
  variant = 'spinner',
  color = 'blue'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  const colorClasses = {
    blue: 'border-t-blue-600',
    green: 'border-t-green-600',
    red: 'border-t-red-600',
    yellow: 'border-t-yellow-600',
  }

  if (variant === 'dots') {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="flex gap-2">
          <div className={`${sizeClasses[size]} bg-${color}-600 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
          <div className={`${sizeClasses[size]} bg-${color}-600 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
          <div className={`${sizeClasses[size]} bg-${color}-600 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
        </div>
        {text && <p className="text-sm text-gray-600">{text}</p>}
      </div>
    )
  }

  if (variant === 'bars') {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="flex gap-1 items-end h-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-2 bg-${color}-600 rounded animate-pulse`}
              style={{
                height: `${20 + i * 10}%`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
        {text && <p className="text-sm text-gray-600">{text}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-4 border-gray-200 ${colorClasses[color]} ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className="text-sm text-gray-600">{text}</p>
      )}
    </div>
  )
})

export const LoadingPage = memo(function LoadingPage({
  text = 'Loading...',
  variant = 'spinner'
}: { 
  text?: string
  variant?: 'spinner' | 'dots' | 'bars' 
} = {}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="lg" text={text} variant={variant} />
    </div>
  )
})

export const LoadingCard = memo(function LoadingCard({ lines = 3 }: { lines?: number } = {}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="space-y-4">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded"
            style={{
              width: `${Math.random() * 30 + 50}%`,
            }}
          />
        ))}
      </div>
    </div>
  )
})

export const LoadingTable = memo(function LoadingTable({ 
  rows = 5,
  columns = 4 
}: { 
  rows?: number
  columns?: number 
} = {}) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="bg-gray-100 px-6 py-4 border-b">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4 border-b last:border-b-0">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="h-4 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

export const LoadingButton = memo(function LoadingButton() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      <span>Processing...</span>
    </div>
  )
})

export const LoadingOverlay = memo(function LoadingOverlay({
  text = 'Processing...',
  variant = 'spinner'
}: { 
  text?: string
  variant?: 'spinner' | 'dots' | 'bars'
} = {}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-xl">
        <LoadingSpinner size="lg" text={text} variant={variant} />
      </div>
    </div>
  )
})
