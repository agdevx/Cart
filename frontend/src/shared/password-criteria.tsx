// ABOUTME: Live password requirements checklist
// ABOUTME: Shows check/uncheck status for length, uppercase, and number requirements

interface PasswordCriteriaProps {
  readonly password: string
}

export const PasswordCriteria = ({ password }: PasswordCriteriaProps) => {
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  return (
    <div className="mt-2 text-xs text-text-secondary">
      <p className="font-semibold mb-1">Requirements:</p>
      <div className="space-y-1">
        <p className={hasMinLength ? 'text-teal' : ''}>
          {hasMinLength ? '✓' : '○'} 8+ characters
        </p>
        <p className={hasUppercase ? 'text-teal' : ''}>
          {hasUppercase ? '✓' : '○'} One uppercase letter
        </p>
        <p className={hasNumber ? 'text-teal' : ''}>
          {hasNumber ? '✓' : '○'} One number
        </p>
      </div>
    </div>
  )
}
