'use client'

interface SelectAnswerProps {
  options: string[]
  value: string | undefined
  onChange: (value: string) => void
}

export function SelectAnswer({ options, value, onChange }: SelectAnswerProps) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-base ${
            value === option
              ? 'border-brand-violet bg-brand-violet-light text-brand-violet'
              : 'border-ui-border bg-ui-bg text-ui-text-primary hover:border-ui-border-strong hover:bg-ui-bg-secondary'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
