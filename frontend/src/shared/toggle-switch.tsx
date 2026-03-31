// ABOUTME: Reusable toggle switch with label for settings pages
// ABOUTME: Replaces duplicated toggle markup in preferences section

interface ToggleSwitchProps {
  label: string
  checked: boolean
  onChange: () => void
}

export const ToggleSwitch = ({ label, checked, onChange }: ToggleSwitchProps) => (
  <div className="border-t border-bg px-4 py-3">
    <div className="flex items-center justify-between">
      <div className="text-xs text-text-tertiary">{label}</div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-teal' : 'bg-bg-warm'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  </div>
)
