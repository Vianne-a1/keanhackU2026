import { useState } from 'react'

const POLICY_TYPES = ['Procurement', 'IT Security', 'Travel', 'Data Sharing', 'HR', 'Legal', 'Other']

export default function PolicyUpload() {
  const [file, setFile] = useState(null)
  const [policyType, setPolicyType] = useState('Procurement')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setSuccess(false)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('policy_type', policyType)

      // TODO: replace with real API call
      // const res = await fetch('/api/upload-policy', { method: 'POST', body: formData })
      // if (!res.ok) throw new Error()

      await new Promise(r => setTimeout(r, 1200))
      setSuccess(true)
      setFile(null)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Upload Company Policy</h2>
        <p className="text-slate-400 text-sm">
          Uploaded documents will be chunked, vectorized, and stored for employee queries.
        </p>
      </div>

      <div>
        <label className="text-sm text-slate-400 block mb-2">Policy Type</label>
        <select
          value={policyType}
          onChange={e => setPolicyType(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          {POLICY_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl p-10 cursor-pointer hover:border-blue-500 transition-colors">
        <span className="text-4xl mb-3">📋</span>
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
        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition-colors"
      >
        {loading ? 'Uploading & indexing…' : 'Upload Policy'}
      </button>

      {success && (
        <p className="text-green-400 text-sm text-center">
          ✅ Policy uploaded and indexed successfully.
        </p>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
