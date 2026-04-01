'use client'

interface TagsAnswerProps {
  options: string[]
  value: string[] | undefined
  onChange: (value: string[]) => void
}

export function TagsAnswer({ options, value = [], onChange }: TagsAnswerProps) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => toggle(option)}
          className={`px-4 py-2 rounded-full border transition-all text-sm ${
            value.includes(option)
              ? 'border-brand-violet bg-brand-violet-light text-brand-violet'
              : 'border-ui-border bg-ui-bg text-ui-text-secondary hover:border-ui-border-strong hover:bg-ui-bg-secondary'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
