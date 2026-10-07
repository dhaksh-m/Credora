import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from '../pages/dashboard/Dashboard.js'
import Editor from '../pages/create/Editor.js'
import Certificates from '../pages/certificates/Certificates.js'
import Campaigns from '../pages/campaigns/Campaigns.js'
import Verify from '../pages/verification/Verify.js'
import Settings from '../pages/settings/Settings.js'

const NAV = [
  ['Overview', '/'], ['Create', '/create'], ['Templates', '/create'],
  ['Campaigns', '/campaigns'], ['Certificates', '/certificates'],
  ['Analytics', '/'], ['Verify Certificate', '/verify'], ['Settings', '/settings']
]

export default function App() {
  return (
    <HashRouter>
      <div className="flex min-h-screen">
        <aside className="w-56 border-r p-4 space-y-1" aria-label="Primary">
          <h1 className="font-bold text-lg">CREDORA</h1>
          <p className="text-xs opacity-70 mb-4">Create. Issue. Verify.</p>
          {NAV.map(([label, to]) => (
            <Link key={label + to} to={to} className="block rounded px-2 py-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800">{label}</Link>
          ))}
        </aside>
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<Editor />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
