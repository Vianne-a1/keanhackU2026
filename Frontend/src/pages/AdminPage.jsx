import PolicyUpload from '../components/upload/PolicyUpload'

export default function AdminPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
        <p className="text-yellow-300 text-sm font-medium">Admin Portal — Authorized Personnel Only</p>
      </div>
      <PolicyUpload />
    </div>
  )
}
