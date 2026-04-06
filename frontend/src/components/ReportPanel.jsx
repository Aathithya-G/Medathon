import { useState } from 'react'
import { FileText, Clock, ChevronDown, ChevronRight, Activity, Download } from 'lucide-react'

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

// ── Markdown → clean HTML converter ─────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return ''
  const lines = text.split('\n')
  const htmlLines = lines.map(line => {
    // Headings
    if (line.startsWith('### ')) return `<h3 style="font-size:13px;font-weight:700;color:#f1f5f9;margin:12px 0 4px 0;">${line.slice(4)}</h3>`
    if (line.startsWith('## '))  return `<h2 style="font-size:15px;font-weight:700;color:#38bdf8;margin:14px 0 6px 0;">${line.slice(3)}</h2>`
    if (line.startsWith('# '))   return `<h1 style="font-size:17px;font-weight:700;color:#38bdf8;margin:16px 0 8px 0;">${line.slice(2)}</h1>`
    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* '))
      return `<div style="display:flex;gap:8px;margin:2px 0;"><span style="color:#38bdf8;flex-shrink:0;">•</span><span>${inlineFormat(line.slice(2))}</span></div>`
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/)
      return `<div style="display:flex;gap:8px;margin:2px 0;"><span style="color:#38bdf8;flex-shrink:0;font-weight:600;">${match[1]}.</span><span>${inlineFormat(match[2])}</span></div>`
    }
    // Horizontal rule
    if (line.trim() === '---') return `<hr style="border:none;border-top:1px solid #1e293b;margin:10px 0;" />`
    // Empty line
    if (line.trim() === '') return `<div style="height:6px;"></div>`
    // Normal paragraph
    return `<p style="margin:2px 0;line-height:1.6;">${inlineFormat(line)}</p>`
  })
  return htmlLines.join('')
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f1f5f9;font-weight:700;">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em style="color:#94a3b8;">$1</em>')
    .replace(/`(.+?)`/g,       '<code style="background:#1e293b;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:11px;color:#38bdf8;">$1</code>')
}

// ── PDF Download ─────────────────────────────────────────────────────────────
function downloadPDF(result) {
  const { phases, full_report, audio_transcript, video_filename, duration_seconds, frame_count } = result
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  const phasesHTML = phases.map(p => `
    <div class="phase-block">
      <div class="phase-header">
        <strong>${p.phase_name}</strong>
        <span class="phase-time">${p.start_time} → ${p.end_time}</span>
      </div>
      <p>${p.summary}</p>
      ${p.key_findings && p.key_findings.length > 0 ? `
        <ul>
          ${p.key_findings.map(f => `<li>${f}</li>`).join('')}
        </ul>` : ''}
    </div>
  `).join('')

  // Convert markdown to plain text for PDF
  const cleanReport = full_report
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,3}\s/g, '')
    .replace(/`(.+?)`/g, '$1')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>ArthroAI Surgical Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      color: #1e293b;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #0ea5e9;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 22px;
      color: #0ea5e9;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p { color: #64748b; font-size: 11px; margin-top: 4px; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .meta-card {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 12px;
      border-left: 3px solid #0ea5e9;
    }
    .meta-card .label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; }
    .meta-card .value { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #0ea5e9;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
    }
    .section { margin-bottom: 28px; }
    .phase-block {
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #0ea5e9;
      padding: 12px;
      margin-bottom: 10px;
    }
    .phase-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .phase-header strong { font-size: 12px; color: #0f172a; }
    .phase-time { font-size: 10px; color: #64748b; font-family: monospace; }
    .phase-block p { color: #334155; line-height: 1.5; }
    .phase-block ul { margin-left: 16px; margin-top: 6px; color: #475569; }
    .phase-block ul li { margin-bottom: 3px; }
    .report-text {
      background: #f8fafc;
      border-radius: 6px;
      padding: 16px;
      white-space: pre-wrap;
      font-family: 'Segoe UI', sans-serif;
      font-size: 11.5px;
      line-height: 1.7;
      color: #1e293b;
    }
    .audio-text {
      background: #f8fafc;
      border-radius: 6px;
      padding: 16px;
      font-style: italic;
      font-size: 11px;
      color: #475569;
      line-height: 1.7;
    }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .phase-block { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>ArthroAI — Surgical Report</h1>
    <p>AI-Powered Arthroscopy Video Intelligence Platform &nbsp;·&nbsp; Generated on ${date}</p>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <div class="label">Video File</div>
      <div class="value" style="font-size:11px;">${result.video_filename || 'Unknown'}</div>
    </div>
    <div class="meta-card">
      <div class="label">Duration</div>
      <div class="value">${Math.round(duration_seconds / 60)} min</div>
    </div>
    <div class="meta-card">
      <div class="label">Frames Analyzed</div>
      <div class="value">${frame_count}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Surgical Phases Detected</div>
    ${phasesHTML}
  </div>

  <div class="section">
    <div class="section-title">Operative Note</div>
    <div class="report-text">${cleanReport}</div>
  </div>

  ${audio_transcript && audio_transcript !== '[No spoken audio detected in the video]' ? `
  <div class="section">
    <div class="section-title">Surgeon Audio Narration (Transcribed)</div>
    <div class="audio-text">${audio_transcript}</div>
  </div>` : ''}

  <div class="footer">
    Generated by ArthroAI &nbsp;·&nbsp; AI Video-to-Text Transcription for Arthroscopy &nbsp;·&nbsp; Medathon 2025
  </div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')

  // Auto-trigger print dialog (user selects "Save as PDF")
  if (win) {
    win.onload = () => {
      win.focus()
      win.print()
    }
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReportPanel({ result, onTimestampClick, activeTime }) {
  const [activeTab, setActiveTab] = useState('timeline')
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

      {/* Stats bar + Download button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-xs text-slate-400">
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

        {/* PDF Download button */}
        <button
          onClick={() => downloadPDF(result)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 
                     text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Download size={12} />
          Download PDF
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 bg-slate-800 rounded-lg p-1">
        {[
          { id: 'timeline', label: 'Timeline'    },
          { id: 'phases',   label: 'Phases'      },
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
              const isActive    = Math.abs(frame.timestamp_seconds - activeTime) < 30

              return (
                <div
                  key={i}
                  className={`timestamp-entry flex gap-3 p-2.5 rounded-lg border-l-2 transition-all ${borderColor} ${
                    isActive ? 'bg-sky-950/50 border-sky-400' : 'border-opacity-50 hover:bg-slate-800/60'
                  }`}
                  onClick={() => onTimestampClick(frame.timestamp_seconds)}
                >
                  <div className="shrink-0 mt-0.5">
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded">
                      {frame.timestamp_label}
                    </span>
                  </div>
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
              const isOpen      = expandedPhase === i
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
                      {phase.key_findings && phase.key_findings.length > 0 && (
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

            {audio_transcript && audio_transcript !== '[No spoken audio detected in the video]' && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <p className="text-xs font-semibold text-slate-400 mb-2">Surgeon Audio Narration</p>
                <p className="text-xs text-slate-300 leading-relaxed italic">{audio_transcript}</p>
              </div>
            )}
          </div>
        )}

        {/* ── FULL REPORT TAB — rendered markdown, no asterisks ── */}
        {activeTab === 'report' && (
          <div className="rounded-xl bg-slate-800/40 border border-slate-700 p-5 text-xs text-slate-300 leading-relaxed">
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(full_report) }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
