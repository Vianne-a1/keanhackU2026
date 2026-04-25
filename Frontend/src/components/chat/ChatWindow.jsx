import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'

const PLACEHOLDER_QUESTIONS = [
  'Can I buy this $2,000 AI software with my company card?',
  'Am I allowed to share customer data with this vendor?',
  'Do I need IT approval before installing new software?',
]

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm PolicyGuard. Ask me anything about company policies before you make a purchase, share data, or sign a contract.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    const query = text ?? input.trim()
    if (!query) return

    setMessages(prev => [...prev, { role: 'user', content: query }])
    setInput('')
    setLoading(true)

    try {
      // TODO: replace with real API call
      // const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ query }), headers: { 'Content-Type': 'application/json' } })
      // const data = await res.json()

      // Mock response for now
      await new Promise(r => setTimeout(r, 1200))
      const mockReply = {
        role: 'assistant',
        content: 'Based on your company policies, here is my assessment:',
        verdict: {
          status: 'needs_approval',
          reasoning: 'This purchase exceeds the $500 procurement threshold and involves a new software vendor. You need manager approval and IT security review before purchasing.',
          citations: ['Procurement Policy §3.2 — Software Purchases', 'IT Security Policy §7 — Vendor Approval'],
        },
      }
      setMessages(prev => [...prev, mockReply])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} verdict={m.verdict} />
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 text-slate-400 text-sm animate-pulse">
              PolicyGuard is thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-6 pb-2 flex flex-wrap gap-2">
        {PLACEHOLDER_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => sendMessage(q)}
            className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-400 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800 flex gap-3">
        <input
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          placeholder="Ask about a policy, purchase, or vendor…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-5 py-3 rounded-xl text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
