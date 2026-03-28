// ABOUTME: Reusable form field wrapper with label and error display
// ABOUTME: Wraps any input element with consistent label styling and error message placement

import type { ReactNode } from 'react'

interface FormFieldProps {
  readonly label: string
  readonly htmlFor: string
  readonly error?: string
  readonly children: ReactNode
  /** Overrides the default label size classes. Defaults to 'text-sm font-semibold'. */
  readonly labelSizeClassName?: string
  /** Overrides the label color when no error is present. Defaults to 'text-navy-soft'. */
  readonly labelDefaultColor?: string
}

export const FormField = ({ label, htmlFor, error, children, labelSizeClassName, labelDefaultColor }: FormFieldProps) => (
  <div className="mb-3">
    <label
      htmlFor={htmlFor}
      className={`block mb-1 ${labelSizeClassName ?? 'text-sm font-semibold'} ${error ? 'text-coral' : (labelDefaultColor ?? 'text-navy-soft')}`}
    >
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-sm text-coral">{error}</p>}
  </div>
)
