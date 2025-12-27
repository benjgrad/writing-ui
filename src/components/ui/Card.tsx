import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-background border border-border rounded-xl p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
