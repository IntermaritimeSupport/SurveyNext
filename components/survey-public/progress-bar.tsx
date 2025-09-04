"use client"

interface ProgressBarProps {
  current: number
  total: number
  showNumbers?: boolean
}

export function ProgressBar({ current, total, showNumbers = true }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        {showNumbers && (
          <span className="text-sm text-slate-600">
            Question {current} de {total}
          </span>
        )}
        <span className="text-sm font-medium text-slate-700">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
