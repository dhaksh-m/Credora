import { useEffect, useState } from 'react'

declare global { interface Window { credora: any } }

export default function Dashboard() {
  const [certs, setCerts] = useState<any[]>([])
  useEffect(() => { window.credora?.certificates?.list({}).then(setCerts).catch(() => {}) }, [])
  return (
    <div>
      <h2 className="text-2xl font-semibold">Good evening</h2>
      <div className="grid grid-cols-4 gap-4 mt-4">
        {[['Certificates', certs.length], ['Emails Sent', '—'], ['Campaigns', '—'], ['Failed', '—']].map(([k, v]) => (
          <div key={k} className="rounded border p-4"><div className="text-xs opacity-70">{k}</div><div className="text-2xl font-bold">{v}</div></div>
        ))}
      </div>
      <h3 className="mt-6 font-semibold">Recent Certificates</h3>
      <ul className="mt-2 text-sm">{certs.slice(0, 10).map((c: any) => <li key={c.certificate_id}>{c.certificate_id} — {c.status}</li>)}</ul>
    </div>
  )
}
