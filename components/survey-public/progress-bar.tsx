"use client"

interface ProgressBarProps {
  current: number
  total: number
  showNumbers?: boolean
}

export function ProgressBar({ current, total, showNumbers = true }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className="w-full">
      <div className="w-full bg-slate-200 h-2">
        <div
          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
