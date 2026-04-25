import { useState } from 'react'
import VerdictCard from '../dashboard/VerdictCard'

export default function ContractUpload() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // TODO: replace with real API call
      // const res = await fetch('/api/upload-contract', { method: 'POST', body: formData })
      // const data = await res.json()

      await new Promise(r => setTimeout(r, 1500))
      setResult({
        status: 'red_flag',
        reasoning: 'This contract contains an automatic 2-year renewal clause with no opt-out window, and includes an unusual bank account change request in section 4. Legal review is strongly recommended before signing.',
        citations: ['Section 3.1 — Auto-renewal clause', 'Section 4 — Payment details change'],
      })
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Vendor Contract Analyzer</h2>
        <p className="text-slate-400 text-sm">Upload a vendor contract to scan for fraud signals and unfair clauses.</p>
      </div>

      {/* Drop zone */}
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl p-10 cursor-pointer hover:border-blue-500 transition-colors">
        <span className="text-4xl mb-3">📄</span>
        <span className="text-slate-300 font-medium">
          {file ? file.name : 'Drop PDF or DOCX here'}
        </span>
        <span className="text-slate-500 text-sm mt-1">or click to browse</span>
        <input
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={e => setFile(e.target.files[0])}
        />
      </label>

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition-colors"
      >
        {loading ? 'Analyzing contract…' : 'Analyze Contract'}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && (
        <VerdictCard
          verdict={result.status}
          reasoning={result.reasoning}
          citations={result.citations}
        />
      )}
    </div>
  )
}
