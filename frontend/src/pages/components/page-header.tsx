// ABOUTME: Shared page header with title and user name display
// ABOUTME: Used on all standard authenticated pages for consistent layout

import { useAuth } from '@/auth/use-auth'

interface PageHeaderProps {
  children: React.ReactNode
}

export const PageHeader = ({ children }: PageHeaderProps) => {
  const { user } = useAuth()

  return (
    <div className="px-5 pt-7 pb-4 flex items-end justify-between">
      <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
        {children}
      </h1>
      {user?.name && (
        <span className="text-lg text-text-secondary font-semibold pb-0.5">
          {user.name}
        </span>
      )}
    </div>
  )
}
