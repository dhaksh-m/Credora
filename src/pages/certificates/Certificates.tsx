import { useEffect, useState } from 'react'

export default function Certificates() {
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => { (window as any).credora?.certificates?.list({}).then(setRows).catch(() => {}) }, [])
  async function revoke(id: string) {
    const reason = prompt('Revoke reason?') ?? ''
    await (window as any).credora.certificates.revoke({ id, reason })
    setRows(await (window as any).credora.certificates.list({}))
  }
  return (
    <div>
      <h2 className="text-xl font-semibold">Certificate History</h2>
      <table className="mt-4 w-full text-sm">
        <thead><tr className="text-left opacity-70"><th>ID</th><th>Status</th><th>PDF</th><th>Action</th></tr></thead>
        <tbody>{rows.map((r: any) => (
          <tr key={r.certificate_id} className="border-t"><td>{r.certificate_id}</td><td>{r.status}</td><td className="truncate max-w-64">{r.pdf_path}</td>
          <td><button className="underline" onClick={() => revoke(r.certificate_id)}>Revoke</button></td></tr>
        ))}</tbody>
      </table>
    </div>
  )
}
