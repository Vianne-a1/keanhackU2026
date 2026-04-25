import { Routes, Route, NavLink } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import UploadPage from './pages/UploadPage'
import AdminPage from './pages/AdminPage'

function Navbar() {
  const link = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`

  return (
    <nav className="border-b border-slate-800 bg-slate-950 px-6 py-3 flex items-center gap-6">
      <span className="text-white font-bold text-lg mr-4">
        Policy<span className="text-blue-400">Guard</span>
      </span>
      <NavLink to="/" className={link} end>Chat</NavLink>
      <NavLink to="/upload" className={link}>Upload Contract</NavLink>
      <NavLink to="/admin" className={link}>Admin</NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  )
}
