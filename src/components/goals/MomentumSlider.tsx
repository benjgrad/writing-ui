'use client'

import { useState } from 'react'

interface MomentumSliderProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

const momentumLabels = {
  1: 'Stuck',
  2: 'Struggling',
  3: 'Steady',
  4: 'Moving',
  5: 'Flowing'
}

export function MomentumSlider({ value, onChange, disabled }: MomentumSliderProps) {
  const [localValue, setLocalValue] = useState(value)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10)
    setLocalValue(newValue)
  }

  const handleMouseUp = () => {
    if (localValue !== value) {
      onChange(localValue)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs text-[#64748b]">
        <span>Stuck</span>
        <span className="font-medium text-[#1e293b]">
          {momentumLabels[localValue as keyof typeof momentumLabels]}
        </span>
        <span>Flowing</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={localValue}
        onChange={handleChange}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        disabled={disabled}
        className="momentum-slider w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}
