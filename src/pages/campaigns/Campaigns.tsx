import { useState } from 'react'

export default function Campaigns() {
  const [status, setStatus] = useState<any>(null)
  async function importAndCreate() {
    const data = await (window as any).credora.files.importExcel()
    if (!data) return
    alert(`${data.validation.valid.length} valid, ${data.validation.issues.length} issues — see console`)
    console.log(data.validation)
    const templates = await (window as any).credora.templates.list()
    if (!templates[0]) { alert('Create/save a template first'); return }
    const res = await (window as any).credora.campaigns.create({ name: 'Campaign ' + new Date().toLocaleString(), templateId: templates[0].id, recipients: data.validation.valid, format: 'pdf' })
    setStatus({ id: res.id })
  }
  return (
    <div>
      <h2 className="text-xl font-semibold">Campaigns</h2>
      <button onClick={importAndCreate} className="mt-4 bg-indigo-600 text-white rounded px-3 py-1.5">Import Excel → Validate → Generate</button>
      {status && <pre className="mt-4 text-xs">{JSON.stringify(status, null, 2)}</pre>}
    </div>
  )
}
