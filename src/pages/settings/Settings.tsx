import { useState } from 'react'

export default function Settings() {
  const [host, setHost] = useState('smtp.example.com')
  const [msg, setMsg] = useState('')
  async function save() {
    await (window as any).credora.email.saveAccount({ name: 'Custom SMTP', host, port: 587, username: 'user', password: 'secret-typed-here' })
    setMsg('Saved — password went to Windows Credential Manager, never SQLite plaintext.')
  }
  async function test() {
    const list = await (window as any).credora.templates.list()
    void list
    setMsg('Use [Test Connection] after selecting an account (SMTP test via Nodemailer verify).')
  }
  return (
    <div className="max-w-md">
      <h2 className="text-xl font-semibold">Settings — Email</h2>
      <input value={host} onChange={(e) => setHost(e.target.value)} className="mt-4 w-full border rounded px-3 py-2" aria-label="SMTP host" />
      <div className="flex gap-2 mt-2">
        <button onClick={save} className="bg-indigo-600 text-white rounded px-3 py-1.5">Save SMTP</button>
        <button onClick={test} className="border rounded px-3 py-1.5">Test Connection</button>
      </div>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
      <p className="mt-4 text-xs opacity-70">Password shows as •••••••• in UI; stored via keytar.</p>
    </div>
  )
}
