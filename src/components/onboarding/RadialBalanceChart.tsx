'use client'

import { useMemo } from 'react'
import type { DomainScores, PursuitDomain } from '@/types/pursuit'
import { DOMAINS } from '@/lib/pursuits/domains'

interface RadialBalanceChartProps {
  scores: DomainScores
  size?: number
}

const DOMAIN_ORDER: PursuitDomain[] = ['sophia', 'phronesis', 'arete', 'koinonia', 'soma', 'techne', 'theoria']

export function RadialBalanceChart({ scores, size = 280 }: RadialBalanceChartProps) {
  const center = size / 2
  const maxRadius = size * 0.38 // Leave room for labels
  const labelRadius = size * 0.47
  const numAxes = DOMAIN_ORDER.length
  const angleStep = (2 * Math.PI) / numAxes
  // Rotate so first axis points up
  const startAngle = -Math.PI / 2

  const maxScore = useMemo(() => {
    const values = Object.values(scores)
    const max = Math.max(...values)
    // Use at least 5 as the max scale so the chart doesn't blow up with small values
    return Math.max(max, 5)
  }, [scores])

  const hasAnyScore = useMemo(() => {
    return Object.values(scores).some(v => v > 0)
  }, [scores])

  // Calculate point positions for the data polygon
  const dataPoints = useMemo(() => {
    return DOMAIN_ORDER.map((domain, i) => {
      const angle = startAngle + i * angleStep
      const value = scores[domain]
      const radius = maxScore > 0 ? (value / maxScore) * maxRadius : 0
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      }
    })
  }, [scores, maxScore, center, maxRadius, startAngle, angleStep])

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  // Ring positions (concentric circles for scale)
  const rings = [0.25, 0.5, 0.75, 1.0]

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Concentric rings */}
        {rings.map((fraction) => (
          <circle
            key={fraction}
            cx={center}
            cy={center}
            r={maxRadius * fraction}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}

        {/* Axis lines and labels */}
        {DOMAIN_ORDER.map((domain, i) => {
          const angle = startAngle + i * angleStep
          const endX = center + maxRadius * Math.cos(angle)
          const endY = center + maxRadius * Math.sin(angle)
          const labelX = center + labelRadius * Math.cos(angle)
          const labelY = center + labelRadius * Math.sin(angle)
          const domainDef = DOMAINS.find(d => d.key === domain)

          return (
            <g key={domain}>
              <line
                x1={center}
                y1={center}
                x2={endX}
                y2={endY}
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeWidth={1}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted text-[10px]"
              >
                {domainDef?.greekName ?? domain}
              </text>
            </g>
          )
        })}

        {/* Data polygon */}
        {hasAnyScore && (
          <path
            d={dataPath}
            fill="currentColor"
            fillOpacity={0.08}
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeWidth={1.5}
            strokeLinejoin="round"
            className="transition-all duration-300 ease-out"
          />
        )}

        {/* Data points */}
        {hasAnyScore && dataPoints.map((p, i) => {
          const domain = DOMAIN_ORDER[i]
          const value = scores[domain]
          if (value === 0) return null
          return (
            <circle
              key={domain}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="currentColor"
              fillOpacity={0.3}
              stroke="currentColor"
              strokeOpacity={0.5}
              strokeWidth={1}
              className="transition-all duration-300 ease-out"
            />
          )
        })}
      </svg>
    </div>
  )
}
