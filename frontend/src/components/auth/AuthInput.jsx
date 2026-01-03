import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const AuthInput = forwardRef(({ label, error, className, ...props }, ref) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300',
          'text-gray-900 placeholder:text-gray-400',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'hover:border-gray-400',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
})

AuthInput.displayName = 'AuthInput'

export { AuthInput }

