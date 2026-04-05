import { useState } from 'react'
import { FileText, Clock, ChevronDown, ChevronRight, Activity } from 'lucide-react'

const PHASE_BORDER = {
  'Setup':               'border-slate-500',
  'Insertion':           'border-blue-500',
  'Inspection':          'border-cyan-500',
  'Diagnosis':           'border-amber-500',
  'Intervention/Repair': 'border-red-500',
  'Repair':              'border-red-500',
  'Closure':             'border-green-500',
  'Unknown':             'border-gray-600',
}

const PHASE_TEXT = {
  'Setup':               'text-slate-400',
  'Insertion':           'text-blue-400',
  'Inspection':          'text-cyan-400',
  'Diagnosis':           'text-amber-400',
  'Intervention/Repair': 'text-red-400',
  'Repair':              'text-red-400',
  'Closure':             'text-green-400',
  'Unknown':             'text-gray-500',
}

export default function ReportPanel({ result, onTimestampClick, activeTime }) {
  const [activeTab, setActiveTab] = useState('timeline') // 'timeline' | 'report' | 'phases'
  const [expandedPhase, setExpandedPhase] = useState(null)

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
        <FileText size={40} strokeWidth={1} />
        <p className="text-sm">Upload and analyze a video to see the report here</p>
      </div>
    )
  }

  const { frames, phases, full_report, duration_seconds, frame_count, audio_transcript } = result

  return (
    <div className="flex flex-col h-full">

      {/* Stats bar */}
      <div className="flex gap-4 mb-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock size={12} /> {Math.round(duration_seconds / 60)} min video
        </span>
        <span className="flex items-center gap-1">
          <Activity size={12} /> {frame_count} frames analyzed
        </span>
        <span className="flex items-center gap-1">
          <FileText size={12} /> {phases.length} phases detected
        </span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 bg-slate-800 rounded-lg p-1">
        {[
          { id: 'timeline', label: 'Timeline' },
          { id: 'phases',   label: 'Phases'   },
          { id: 'report',   label: 'Full Report' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pr-1">

        {/* ── TIMELINE TAB ── */}
        {activeTab === 'timeline' && (
          <div className="flex flex-col gap-1">
            {frames.map((frame, i) => {
              const borderColor = PHASE_BORDER[frame.surgical_phase] || 'border-gray-600'
              const textColor   = PHASE_TEXT[frame.surgical_phase]   || 'text-gray-500'
              const isActive    = Math.abs(frame.timestamp_seconds - activeTime) < 8

              return (
                <div
                  key={i}
                  className={`timestamp-entry flex gap-3 p-2.5 rounded-lg border-l-2 transition-all ${borderColor} ${
                    isActive ? 'bg-sky-950/50 border-sky-400' : 'border-opacity-50 hover:bg-slate-800/60'
                  }`}
                  onClick={() => onTimestampClick(frame.timestamp_seconds)}
                >
                  {/* Timestamp badge */}
                  <div className="shrink-0 mt-0.5">
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded">
                      {frame.timestamp_label}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${textColor}`}>
                      {frame.surgical_phase}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {frame.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── PHASES TAB ── */}
        {activeTab === 'phases' && (
          <div className="flex flex-col gap-3">
            {phases.map((phase, i) => {
              const isOpen = expandedPhase === i
              const borderColor = PHASE_BORDER[phase.phase_name] || 'border-slate-600'
              const textColor   = PHASE_TEXT[phase.phase_name]   || 'text-slate-400'

              return (
                <div key={i} className={`rounded-xl border ${borderColor} border-opacity-40 bg-slate-800/40`}>
                  <button
                    className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setExpandedPhase(isOpen ? null : i)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${textColor}`}>{phase.phase_name}</span>
                      <span className="text-xs text-slate-500 font-mono">
                        {phase.start_time} → {phase.end_time}
                      </span>
                    </div>
                    {isOpen
                      ? <ChevronDown size={14} className="text-slate-400" />
                      : <ChevronRight size={14} className="text-slate-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 flex flex-col gap-3">
                      <p className="text-xs text-slate-300 leading-relaxed">{phase.summary}</p>
                      {phase.key_findings.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 mb-1.5">Key Findings</p>
                          <ul className="flex flex-col gap-1">
                            {phase.key_findings.map((f, j) => (
                              <li key={j} className="flex items-start gap-2 text-xs text-slate-300">
                                <span className="text-sky-400 mt-0.5">•</span> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Audio transcript section */}
            {audio_transcript && audio_transcript !== '[No spoken audio detected in the video]' && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <p className="text-xs font-semibold text-slate-400 mb-2">Surgeon Audio Narration</p>
                <p className="text-xs text-slate-300 leading-relaxed italic">{audio_transcript}</p>
              </div>
            )}
          </div>
        )}

        {/* ── FULL REPORT TAB ── */}
        {activeTab === 'report' && (
          <div className="rounded-xl bg-slate-800/40 border border-slate-700 p-5">
            <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {full_report}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
