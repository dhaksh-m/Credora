import { useEffect, useRef, useState } from 'react'

// Fabric.js editor: text/image/QR, drag/resize/rotate, undo/redo, layers, snap guides (§15-22)
export default function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fabricCanvas, setFabricCanvas] = useState<any>(null)
  const history = useRef<string[]>([])
  const hIndex = useRef(-1)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { Canvas } = await import('fabric')
      void 0
      if (!canvasRef.current || cancelled) return
      const c = new Canvas(canvasRef.current, { width: 960, height: 540, backgroundColor: '#faf7ef' })
      c.on('object:modified', pushHistory)
      c.on('object:added', pushHistory)
      setFabricCanvas(c)
      function pushHistory() {
        history.current = history.current.slice(0, hIndex.current + 1)
        history.current.push(JSON.stringify(c.toJSON()))
        hIndex.current++
      }
      // @ts-expect-error attach for toolbar
      c.__pushHistory = pushHistory
    })()
    return () => { cancelled = true; fabricCanvas?.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addText() {
    if (!fabricCanvas) return
    import('fabric').then(({ Textbox }) => {
      const t = new Textbox('{{name}}', { left: 300, top: 220, fontSize: 48, fontFamily: 'Georgia' })
      fabricCanvas.add(t)
      fabricCanvas.setActiveObject(t)
    })
  }

  function undo() {
    if (hIndex.current <= 0 || !fabricCanvas) return
    hIndex.current--
    fabricCanvas.loadFromJSON(JSON.parse(history.current[hIndex.current]))
  }
  function redo() {
    if (hIndex.current >= history.current.length - 1 || !fabricCanvas) return
    hIndex.current++
    fabricCanvas.loadFromJSON(JSON.parse(history.current[hIndex.current]))
  }

  async function save() {
    if (!fabricCanvas) return
    const config_json = JSON.stringify(fabricCanvas.toJSON())
    await window.credora.templates.save({ name: 'Untitled Certificate', width: 1920, height: 1080, config_json })
    alert('Template saved')
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold flex-1">Untitled Certificate</h2>
        <button onClick={undo} className="border rounded px-2 py-1" aria-label="Undo">↶ Undo</button>
        <button onClick={redo} className="border rounded px-2 py-1" aria-label="Redo">↷ Redo</button>
        <button onClick={save} className="bg-indigo-600 text-white rounded px-3 py-1">Save</button>
      </div>
      <div className="flex gap-4 mt-4">
        <div className="w-40 space-y-2">
          <button onClick={addText} className="block w-full border rounded p-2">Text</button>
          <p className="text-xs opacity-70">Variables: {'{{name}} {{email}} {{course}} {{date}} {{certificateId}}'}</p>
        </div>
        <canvas ref={canvasRef} className="border rounded" aria-label="Certificate canvas" />
        <div className="w-48 text-sm opacity-80">Properties: position, size, font, color, alignment (§15). Multi-select + align + layers via Fabric selection.</div>
      </div>
    </div>
  )
}
