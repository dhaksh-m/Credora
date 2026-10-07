import { useState } from 'react'

export default function Verify() {
  const [id, setId] = useState('')
  const [result, setResult] = useState<any>(null)
  async function verify() {
    setResult(await (window as any).credora.verification.verifyLocal(id))
  }
  return (
    <div className="max-w-md">
      <h2 className="text-xl font-semibold">Verify Certificate</h2>
      <input value={id} onChange={(e) => setId(e.target.value)} placeholder="CR-2026-XXXXXXX" className="mt-4 w-full border rounded px-3 py-2" aria-label="Certificate ID" />
      <button onClick={verify} className="mt-2 bg-indigo-600 text-white rounded px-4 py-1.5">Verify</button>
      {result && <pre className="mt-4 text-sm border rounded p-3">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  )
}
