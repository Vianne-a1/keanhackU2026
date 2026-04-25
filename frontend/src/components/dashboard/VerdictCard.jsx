const STYLES = {
  approved:       { border: 'border-green-500/40',  text: 'text-green-400',  label: '✅ Approved' },
  needs_approval: { border: 'border-yellow-400/40', text: 'text-yellow-300', label: '⚠️ Needs Approval' },
  prohibited:     { border: 'border-red-500/40',    text: 'text-red-400',    label: '🚫 Prohibited' },
  red_flag:       { border: 'border-red-500/40',    text: 'text-red-400',    label: '🚨 Red Flag' },
}

export default function VerdictCard({ verdict, reasoning, citations = [] }) {
  const style = STYLES[verdict] ?? STYLES.needs_approval

  return (
    <div className={`rounded-2xl border ${style.border} bg-slate-800/60 p-5 space-y-3`}>
      <p className={`font-bold text-lg ${style.text}`}>{style.label}</p>
      <p className="text-slate-300 text-sm leading-relaxed">{reasoning}</p>
      {citations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Policy References</p>
          {citations.map((c, i) => (
            <p key={i} className="text-xs text-blue-400">· {c}</p>
          ))}
        </div>
      )}
    </div>
  )
}
