import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const defaults = {
  bg: '#040609',
  frame: '#ffffff',
  lampA: '#ffd54a',
  lampB: '#44d4ff',
  speed: 1.4,
  density: 24,
  size: 3.2,
  glow: 12,
  scale: 1,
}

const FRAME_FILL_ALPHA = 0.8
const MAKARA_FILL_ALPHA = 0.85
const PANEL_FILL_ALPHA = 0.75
const PANEL_LIGHT_COLS = 18
const PANEL_LIGHT_ROWS = 6

function App() {
  const canvasRef = useRef(null)
  const animationRef = useRef(0)
  const [config, setConfig] = useState(defaults)
  const controls = useMemo(
    () => [
      { key: 'bg', label: 'Background', type: 'color' },
      { key: 'frame', label: 'Frame color', type: 'color' },
      { key: 'lampA', label: 'Lamp color A', type: 'color' },
      { key: 'lampB', label: 'Lamp color B', type: 'color' },
      { key: 'speed', label: 'Animation speed', type: 'range', min: 0, max: 4, step: 0.1, digits: 1 },
      { key: 'density', label: 'Bulb density', type: 'range', min: 8, max: 52, step: 1, digits: 0 },
      { key: 'size', label: 'Bulb size', type: 'range', min: 1, max: 8, step: 0.2, digits: 1 },
      { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 28, step: 1, digits: 0 },
      { key: 'scale', label: 'Overall scale', type: 'range', min: 0.75, max: 1.3, step: 0.01, digits: 2 },
    ],
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const hexToRgb = (hex) => {
      let clean = String(hex || '').replace('#', '').trim()
      if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('')
      if (!/^[0-9a-fA-F]{6}$/.test(clean)) clean = defaults.lampA.replace('#', '')
      const n = Number.parseInt(clean, 16)
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    }

    const mixRgb = (a, b, t) => {
      const c1 = hexToRgb(a)
      const c2 = hexToRgb(b)
      const lerp = (x, y) => Math.round(x + (y - x) * t)
      return `rgb(${lerp(c1.r, c2.r)}, ${lerp(c1.g, c2.g)}, ${lerp(c1.b, c2.b)})`
    }

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const cssWidth = canvas.clientWidth
      const cssHeight = canvas.clientHeight
      canvas.width = Math.floor(cssWidth * dpr)
      canvas.height = Math.floor(cssHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawFramedCircle = (x, y, radius) => {
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0,0,0,${FRAME_FILL_ALPHA})`
      ctx.strokeStyle = config.frame
      ctx.lineWidth = 2
      ctx.fill()
      ctx.stroke()
    }

    const drawMakara = (cx, topY, width, height, direction) => {
      const sign = direction === 'left' ? -1 : 1
      const startX = cx + sign * width * 0.5
      ctx.beginPath()
      ctx.moveTo(cx, topY)
      ctx.bezierCurveTo(
        startX + sign * width * 0.15,
        topY + height * 0.2,
        startX + sign * width * 0.25,
        topY + height * 0.7,
        startX,
        topY + height,
      )
      ctx.lineTo(cx, topY + height * 0.88)
      ctx.closePath()
      ctx.fillStyle = `rgba(0,0,0,${MAKARA_FILL_ALPHA})`
      ctx.strokeStyle = config.frame
      ctx.lineWidth = 2
      ctx.fill()
      ctx.stroke()
    }

    const drawBulb = (x, y, color, size) => {
      ctx.shadowBlur = config.glow
      ctx.shadowColor = color
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    }

    const ringLights = (cx, cy, radius, count, t, phaseShift, size) => {
      for (let i = 0; i < count; i += 1) {
        const a = (Math.PI * 2 * i) / count
        const px = cx + radius * Math.cos(a)
        const py = cy + radius * Math.sin(a)
        const phase = (Math.sin(t * config.speed + a * 2 + phaseShift) + 1) / 2
        drawBulb(px, py, mixRgb(config.lampA, config.lampB, phase), size)
      }
    }

    const drawPanelLights = (x, y, w, h, t) => {
      const gapX = w / (PANEL_LIGHT_COLS + 1)
      const gapY = h / (PANEL_LIGHT_ROWS + 1)
      for (let r = 1; r <= PANEL_LIGHT_ROWS; r += 1) {
        for (let c = 1; c <= PANEL_LIGHT_COLS; c += 1) {
          const px = x + gapX * c
          const py = y + gapY * r
          const wave = (Math.sin((c + r) * 0.45 + t * config.speed * 1.8) + 1) / 2
          drawBulb(px, py, mixRgb(config.lampA, config.lampB, wave), Math.max(1, config.size * 0.65))
        }
      }
    }

    const render = (timeMs) => {
      const t = timeMs * 0.001
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const cx = width / 2
      const cy = height * 0.38
      const R = Math.min(width, height) * 0.13 * config.scale
      const r = R * 0.48
      const orbit = R + r

      ctx.clearRect(0, 0, width, height)
      ctx.shadowBlur = 0
      ctx.fillStyle = config.bg
      ctx.fillRect(0, 0, width, height)

      const panelX = cx - orbit - 2.2 * r
      const panelY = cy + orbit * 0.72
      const panelW = (orbit + 2.2 * r) * 2
      const panelH = height * 0.34

      ctx.fillStyle = `rgba(0,0,0,${PANEL_FILL_ALPHA})`
      ctx.strokeStyle = config.frame
      ctx.lineWidth = 2
      ctx.fillRect(panelX, panelY, panelW, panelH)
      ctx.strokeRect(panelX, panelY, panelW, panelH)

      drawMakara(panelX, panelY, panelH * 0.75, panelH, 'left')
      drawMakara(panelX + panelW, panelY, panelH * 0.75, panelH, 'right')

      drawFramedCircle(cx, cy, R)
      for (let i = 0; i < 8; i += 1) {
        const a = (Math.PI * 2 * i) / 8 + Math.PI / 2
        drawFramedCircle(cx + orbit * Math.cos(a), cy + orbit * Math.sin(a), r)
      }

      const count = Math.max(8, Math.floor(config.density))
      ringLights(cx, cy, R * 0.86, count + 12, t, 0.3, config.size)
      ringLights(cx, cy, R * 0.58, count, t, 1.1, Math.max(1, config.size * 0.85))
      for (let i = 0; i < 8; i += 1) {
        const a = (Math.PI * 2 * i) / 8 + Math.PI / 2
        const sx = cx + orbit * Math.cos(a)
        const sy = cy + orbit * Math.sin(a)
        ringLights(sx, sy, r * 0.82, Math.max(8, count - 4), t, i * 0.9, Math.max(1, config.size * 0.75))
      }

      drawPanelLights(panelX, panelY, panelW, panelH, t)
      ctx.shadowBlur = 0
      animationRef.current = requestAnimationFrame(render)
    }

    resizeCanvas()
    animationRef.current = requestAnimationFrame(render)
    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationRef.current)
    }
  }, [config])

  const onInputChange = (key, type, value) => {
    setConfig((prev) => ({ ...prev, [key]: type === 'range' ? Number(value) : value }))
  }

  return (
    <div className="layout">
      <aside className="controls">
        <h1>Customizable Thorana (React)</h1>
        {controls.map((control) => (
          <div className="control" key={control.key}>
            {control.type === 'range' ? (
              <div className="value-line">
                <label htmlFor={control.key}>{control.label}:</label>
                <span className="value">
                  {Number(config[control.key]).toFixed(control.digits)}
                </span>
              </div>
            ) : (
              <label htmlFor={control.key}>{control.label}:</label>
            )}
            <input
              id={control.key}
              type={control.type}
              min={control.min}
              max={control.max}
              step={control.step}
              value={config[control.key]}
              onChange={(event) => onInputChange(control.key, control.type, event.target.value)}
            />
          </div>
        ))}
        <button type="button" onClick={() => setConfig(defaults)}>
          Reset
        </button>
      </aside>
      <div className="canvas-wrap">
        <canvas ref={canvasRef}>
          Your browser does not support canvas.
        </canvas>
      </div>
    </div>
  )
}

export default App
