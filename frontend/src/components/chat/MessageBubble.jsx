import VerdictCard from '../dashboard/VerdictCard'

export default function MessageBubble({ role, content, verdict }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[75%] space-y-2`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-slate-800 text-slate-200 rounded-bl-sm'
          }`}
        >
          {content}
        </div>
        {verdict && (
          <VerdictCard
            verdict={verdict.status}
            reasoning={verdict.reasoning}
            citations={verdict.citations}
          />
        )}
      </div>
    </div>
  )
}
