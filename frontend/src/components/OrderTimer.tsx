'use client'

import { useEffect, useState } from 'react'

type Props = {
  startTime: Date
}

export default function OrderTimer({ startTime }: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const seconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      setElapsedSeconds(seconds)
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60

  const color =
    elapsedSeconds < 120
      ? '#4caf50' // vert
      : elapsedSeconds < 300
      ? '#ff9800' // orange
      : '#f44336' // rouge

  return (
    <span
      style={{
        fontWeight: 'bold',
        color,
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      ⏱️ {minutes}m {seconds < 10 ? '0' : ''}
      {seconds}s
    </span>
  )
}
