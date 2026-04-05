import { useState } from 'react'
import axios from 'axios'
import { Search, Clock, X } from 'lucide-react'

export default function SearchBar({ videoId, onResultClick }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setSearched(true)

    try {
      const res = await axios.post('/search/', {
        query: query.trim(),
        video_id: videoId || null,
        top_k: 6,
      })
      setResults(res.data.results)
    } catch (err) {
      setError('Search failed. Make sure a video has been analyzed first.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const clear = () => {
    setQuery('')
    setResults([])
    setSearched(false)
    setError('')
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Search surgical events… e.g. "cartilage damage" or "suture"'
            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-4 py-2.5 
                       text-sm text-slate-200 placeholder-slate-500 
                       focus:outline-none focus:border-sky-500 transition-colors"
          />
          {query && (
            <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 
                     disabled:text-slate-500 text-white text-sm font-medium 
                     rounded-lg transition-colors"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <p className="text-xs text-slate-500 text-center py-3">
          No matching moments found for "{query}"
        </p>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => onResultClick(r.timestamp_seconds)}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/60 
                         border border-slate-700 hover:border-sky-600 cursor-pointer transition-colors"
            >
              <div className="shrink-0 flex items-center gap-1 text-sky-400">
                <Clock size={11} />
                <span className="font-mono text-xs font-bold">{r.timestamp_label}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 flex-1">
                {r.description}
              </p>
              <span className="shrink-0 text-xs text-slate-500 font-mono">
                {Math.round(r.relevance_score * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
