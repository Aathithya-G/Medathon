import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import VideoPlayer from './components/VideoPlayer'
import ReportPanel from './components/ReportPanel'
import SearchBar   from './components/SearchBar'
import { Upload, Loader2, CheckCircle, AlertCircle, Activity } from 'lucide-react'
import './index.css'

const POLL_INTERVAL_MS = 3000

export default function App() {
  const [uploadedVideo, setUploadedVideo]   = useState(null)   // { video_id, original_filename, size_mb }
  const [analysisResult, setAnalysisResult] = useState(null)   // AnalysisResult from backend
  const [status, setStatus]                 = useState('idle') // idle | uploading | processing | done | error
  const [statusMsg, setStatusMsg]           = useState('')
  const [seekTime, setSeekTime]             = useState(null)   // seconds to jump to in video
  const [activeTime, setActiveTime]         = useState(0)      // current playback time
  const pollTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setStatus('uploading')
    setStatusMsg('Uploading video...')
    setAnalysisResult(null)
    setUploadedVideo(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axios.post('/upload/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const videoMeta = res.data
      setUploadedVideo(videoMeta)
      setStatusMsg('Upload complete. Starting analysis...')
      startAnalysis(videoMeta.video_id, file)
    } catch (err) {
      setStatus('error')
      setStatusMsg('Upload failed. Check that the backend is running.')
    }
  }

  // ── Kick off analysis and poll for status ──────────────────────────────────
  const startAnalysis = async (videoId, file) => {
    setStatus('processing')
    try {
      await axios.post(`/analyze/${videoId}`)
      pollStatus(videoId)
    } catch (err) {
      setStatus('error')
      setStatusMsg('Could not start analysis pipeline.')
    }
  }

  const pollStatus = (videoId) => {
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`/analyze/status/${videoId}`)
        const { status: s, step } = res.data

        if (s === 'processing') {
          setStatusMsg(step || 'Processing...')
        } else if (s === 'done') {
          clearInterval(pollTimerRef.current)
          const resultRes = await axios.get(`/analyze/result/${videoId}`)
          setAnalysisResult(resultRes.data)
          setStatus('done')
          setStatusMsg('Analysis complete!')
        } else if (s === 'error') {
          clearInterval(pollTimerRef.current)
          setStatus('error')
          setStatusMsg(`Error: ${step}`)
        }
      } catch (err) {
        clearInterval(pollTimerRef.current)
        setStatus('error')
        setStatusMsg('Lost connection to backend.')
      }
    }, POLL_INTERVAL_MS)
  }

  const handleTimestampClick = useCallback((seconds) => {
    setSeekTime(seconds)
    // Reset after a tick so repeated clicks on same timestamp still fire
    setTimeout(() => setSeekTime(null), 200)
  }, [])

  // ── Status badge ───────────────────────────────────────────────────────────
  const StatusBadge = () => {
    if (status === 'idle') return null
    const map = {
      uploading:  { icon: <Loader2 size={14} className="animate-spin" />, color: 'text-sky-400',   bg: 'bg-sky-950/40 border-sky-800' },
      processing: { icon: <Loader2 size={14} className="animate-spin" />, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800' },
      done:       { icon: <CheckCircle size={14} />,                       color: 'text-green-400', bg: 'bg-green-950/40 border-green-800' },
      error:      { icon: <AlertCircle size={14} />,                       color: 'text-red-400',   bg: 'bg-red-950/40 border-red-800' },
    }
    const { icon, color, bg } = map[status] || {}
    return (
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${bg} ${color}`}>
        {icon}
        <span>{statusMsg}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-200 flex flex-col">

      {/* ── Header ── */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center">
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none">
              ArthroAI
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Surgical Video Intelligence Platform</p>
          </div>
        </div>

        {/* Upload button */}
        <div className="flex items-center gap-3">
          <StatusBadge />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={status === 'uploading' || status === 'processing'}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 
                       disabled:bg-slate-700 disabled:text-slate-500
                       text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Upload size={14} />
            Upload Video
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </header>

      {/* ── Search bar (full width) ── */}
      {(status === 'done' || analysisResult) && (
        <div className="border-b border-slate-800 px-6 py-3">
          <SearchBar
            videoId={uploadedVideo?.video_id}
            onResultClick={handleTimestampClick}
          />
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 flex gap-0 overflow-hidden">

        {/* Left — Video player (40% width) */}
        <div className="w-[42%] border-r border-slate-800 p-5 flex flex-col overflow-y-auto">
          {uploadedVideo ? (
            <>
              <div className="text-xs text-slate-500 mb-3 font-mono truncate">
                {uploadedVideo.original_filename} · {uploadedVideo.size_mb} MB
              </div>
              <VideoPlayer
                videoId={uploadedVideo.video_id}
                frames={analysisResult?.frames || []}
                currentTime={seekTime}
                onTimeUpdate={setActiveTime}
              />
            </>
          ) : (
            /* Drop zone when no video loaded */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center gap-4 
                         border-2 border-dashed border-slate-700 rounded-2xl 
                         hover:border-sky-600 hover:bg-sky-950/10 transition-colors cursor-pointer"
            >
              <Upload size={36} strokeWidth={1} className="text-slate-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-300">Click to upload a surgery video</p>
                <p className="text-xs text-slate-500 mt-1">MP4, MOV, AVI · up to 500 MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Right — Report panel (58% width) */}
        <div className="flex-1 p-5 overflow-hidden flex flex-col">
          <ReportPanel
            result={analysisResult}
            onTimestampClick={handleTimestampClick}
            activeTime={activeTime}
          />
        </div>
      </main>
    </div>
  )
}
