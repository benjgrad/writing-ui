'use client'

interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
}

export function ProgressRing({
  progress,
  size = 40,
  strokeWidth = 3,
  className = ''
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      className={`progress-ring ${className}`}
    >
      {/* Background circle */}
      <circle
        stroke="#e5e7eb"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      {/* Progress circle */}
      <circle
        className="progress-ring__circle"
        stroke="#10b981"
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
    </svg>
  )
}
