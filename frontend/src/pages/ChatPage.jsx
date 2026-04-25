import ChatWindow from '../components/chat/ChatWindow'

export default function ChatPage() {
  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-56px)] flex flex-col">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-white">Policy Assistant</h1>
        <p className="text-slate-400 text-sm mt-1">
          Ask before you buy, share, travel, or sign.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatWindow />
      </div>
    </div>
  )
}
