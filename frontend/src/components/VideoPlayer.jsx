import { useEffect, useRef } from 'react'

const PHASE_COLORS = {
  'Setup':              'bg-slate-500',
  'Insertion':          'bg-blue-600',
  'Inspection':         'bg-cyan-600',
  'Diagnosis':          'bg-amber-600',
  'Intervention/Repair':'bg-red-600',
  'Repair':             'bg-red-600',
  'Closure':            'bg-green-600',
  'Unknown':            'bg-gray-600',
}

export default function VideoPlayer({ videoId, frames, currentTime, onTimeUpdate }) {
  const videoRef = useRef(null)

  // When parent tells us to jump (user clicked a timestamp in report)
  useEffect(() => {
    if (videoRef.current && currentTime !== null) {
      videoRef.current.currentTime = currentTime
      videoRef.current.play()
    }
  }, [currentTime])

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime)
    }
  }

  // Build timeline bar segments from frames
  const duration = frames.length > 0
    ? frames[frames.length - 1].timestamp_seconds + 8
    : 1

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Video element */}
      <div className="relative rounded-xl overflow-hidden bg-black border border-slate-700 shadow-2xl">
        {videoId ? (
          <video
            ref={videoRef}
            src={`/videos/${videoId}.mp4`}
            controls
            onTimeUpdate={handleTimeUpdate}
            className="w-full"
            style={{ maxHeight: '380px' }}
          />
        ) : (
          <div className="flex items-center justify-center h-56 text-slate-500 text-sm">
            No video loaded
          </div>
        )}
      </div>

      {/* Phase timeline bar */}
      {frames.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-widest">
            Surgery Timeline
          </p>
          <div className="flex rounded-full overflow-hidden h-3 gap-px">
            {frames.map((frame, i) => {
              const color = PHASE_COLORS[frame.surgical_phase] || 'bg-gray-600'
              const widthPct = (8 / duration) * 100
              return (
                <div
                  key={i}
                  title={`${frame.timestamp_label} — ${frame.surgical_phase}`}
                  className={`${color} hover:brightness-125 cursor-pointer transition-all`}
                  style={{ width: `${widthPct}%`, minWidth: '2px' }}
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = frame.timestamp_seconds
                      videoRef.current.play()
                    }
                  }}
                />
              )
            })}
          </div>
          {/* Phase legend */}
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(PHASE_COLORS)
              .filter(([k]) => k !== 'Unknown')
              .map(([phase, color]) => (
                <div key={phase} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-xs text-slate-400">{phase}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
