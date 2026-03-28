// ABOUTME: Shared page header with title display
// ABOUTME: Used on all standard authenticated pages for consistent layout

interface PageHeaderProps {
  children: React.ReactNode
}

export const PageHeader = ({ children }: PageHeaderProps) => {
  return (
    <div className="px-5 pt-7 pb-4">
      <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
        {children}
      </h1>
    </div>
  )
}
