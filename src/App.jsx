import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileImage,
  FileText,
  GraduationCap,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import Progress from './components/Progress'
import PWAInstall from './components/PWAInstall'
import { DEFAULT_EXAMS, KNOWN_EXAMS } from './lib/known'
import { createVoucherPdf, downloadPdf } from './lib/pdf'
import { clearLastProfile, loadLastProfile, saveLastProfile } from './lib/storage'
import { voucherSchema } from './lib/validation'

function isPdfFile(file) {
  return file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')
}

function uniqueFiles(current, incoming) {
  const accepted = [...incoming].filter((file) => {
    const t = (file.type || '').toLowerCase()
    const name = (file.name || '').toLowerCase()
    const isImage =
      ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(t) ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.webp')
    const isPdf = t === 'application/pdf' || name.endsWith('.pdf')
    const isHeic = name.endsWith('.heic') || name.endsWith('.heif')
    return isImage || isPdf || isHeic
  })
  if (accepted.length) {
    const first = accepted[0]
    const name = (first.name || '').toLowerCase()
    if (name.endsWith('.heic') || name.endsWith('.heif')) {
      // HEIC no se puede incrustar directo, se avisará al generar
      return [first]
    }
    return [first]
  }
  return current
}

function fold(text = '') {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function getExamDisplay(exam) {
  if (!exam) return ''
  if (exam.number && exam.name) return `${exam.number} - ${exam.name}`
  return exam.name || exam.number || ''
}

function parseExamInput(input) {
  const raw = input.trim()
  if (!raw) return { number: '', name: '' }
  // Si escribe "4 - Ser social ..." o "4: Ser social"
  const withDash = raw.match(/^(\d{1,2})\s*[-–:]\s*(.+)$/)
  if (withDash) {
    return { number: withDash[1], name: withDash[2].trim().toUpperCase() }
  }
  // Si solo escribe número "4" o "10"
  if (/^\d{1,2}$/.test(raw)) {
    const canonical = KNOWN_EXAMS[raw]
    if (canonical) return { number: raw, name: canonical }
    return { number: raw, name: '' }
  }
  // Si escribe nombre exacto conocido
  const folded = fold(raw)
  for (const [num, name] of Object.entries(KNOWN_EXAMS)) {
    if (fold(name) === folded) return { number: num, name }
  }
  // Texto libre
  return { number: '', name: raw.toUpperCase() }
}

function getSuggestions(query) {
  const q = query.trim()
  if (!q) return Object.entries(KNOWN_EXAMS).slice(0, 6).map(([number, name]) => ({ number, name }))
  const fq = fold(q)
  const isNum = /^\d+$/.test(q.trim())
  const results = []
  for (const [number, name] of Object.entries(KNOWN_EXAMS)) {
    const fn = fold(name)
    if (isNum) {
      if (number.startsWith(q.trim())) results.push({ number, name })
    } else {
      if (number === q.trim() || fn.includes(fq) || fq.includes(number)) results.push({ number, name })
    }
  }
  // Orden: número exacto primero, luego los que contienen
  return results.slice(0, 7)
}

export default function App() {
  const fileRef = useRef(null)
  const cameraRef = useRef(null)

  const [step, setStep] = useState(1)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const [analysis, setAnalysis] = useState({
    voucherIndex: 0,
  })
  const [form, setForm] = useState({
    name: '',
    matricula: '',
    etapa: '',
    oficina: '3006',
    exams: DEFAULT_EXAMS,
  })
  const [remember, setRemember] = useState(false)
  const [lastProfile, setLastProfile] = useState(null)
  const [lastPdf, setLastPdf] = useState(null)
  const [lastSubmitted, setLastSubmitted] = useState(null)
  // Para autocomplete: índice abierto y query por fila
  const [openExamIndex, setOpenExamIndex] = useState(null)
  const [examQueries, setExamQueries] = useState({})

  useEffect(() => {
    loadLastProfile().then(setLastProfile).catch(() => {})
  }, [])

  // Prellenar oficina si viene vacía desde storage antiguo
  useEffect(() => {
    if (lastProfile && !form.oficina) {
      setForm((c) => ({ ...c, oficina: lastProfile.oficina || '3006' }))
    }
  }, [lastProfile])

  const selectedVoucher = files[analysis.voucherIndex] ?? files[0] ?? null
  const isSelectedPdf = selectedVoucher ? isPdfFile(selectedVoucher) : false

  const previewUrl = useMemo(() => {
    if (!selectedVoucher || isSelectedPdf) return ''
    return URL.createObjectURL(selectedVoucher)
  }, [selectedVoucher, isSelectedPdf])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const pdfPreviewUrl = useMemo(() => {
    if (!selectedVoucher || !isSelectedPdf) return ''
    return URL.createObjectURL(selectedVoucher)
  }, [selectedVoucher, isSelectedPdf])

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
    }
  }, [pdfPreviewUrl])

  function addFiles(incoming) {
    const incomingArray = [...(incoming || [])]
    const hasIncoming = incomingArray.length > 0
    if (hasIncoming) {
      const accepted = incomingArray.filter((file) => {
        const t = (file.type || '').toLowerCase()
        const name = (file.name || '').toLowerCase()
        return (
          ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'].includes(t) ||
          name.endsWith('.pdf') ||
          name.endsWith('.jpg') ||
          name.endsWith('.jpeg') ||
          name.endsWith('.png') ||
          name.endsWith('.webp') ||
          name.endsWith('.heic') ||
          name.endsWith('.heif')
        )
      })
      if (!accepted.length && hasIncoming) {
        setError('Esa foto no es válida. Usa JPG, PNG, WEBP o PDF. Si es iPhone, cambia a “Más compatible” en Ajustes > Cámara.')
        if (fileRef.current) fileRef.current.value = ''
        if (cameraRef.current) cameraRef.current.value = ''
        return
      }
      const tooBig = accepted.find((f) => f.size > 12 * 1024 * 1024)
      if (tooBig) {
        setError(`La foto pesa ${(tooBig.size / 1024 / 1024).toFixed(1)} MB, es muy pesada. Toma otra más cerca o elige un PDF más ligero (máx 12 MB).`)
        if (fileRef.current) fileRef.current.value = ''
        if (cameraRef.current) cameraRef.current.value = ''
        return
      }
    }
    setFiles((current) => {
      const next = uniqueFiles(current, incoming)
      if (next.length && analysis.voucherIndex === null) {
        setAnalysis((a) => ({ ...a, voucherIndex: 0 }))
      }
      return next
    })
    setError('')
    if (fileRef.current) fileRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  function goToStep(next) {
    setError('')
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function analyzeAll() {
    if (!files.length) {
      setError('Primero sube tu comprobante (foto o PDF).')
      return
    }
    setError('')
    // Ya no se analiza la imagen: solo se confirma el boucher y se pasa a anotar datos
    if (analysis.voucherIndex == null || analysis.voucherIndex >= files.length) {
      setAnalysis({ voucherIndex: 0 })
    }
    goToStep(2)
  }

  function useSavedProfile() {
    if (!lastProfile) return
    setForm((c) => ({
      ...c,
      name: lastProfile.name || c.name,
      matricula: lastProfile.matricula || c.matricula,
      etapa: lastProfile.etapa || c.etapa,
      oficina: lastProfile.oficina || c.oficina || '3006',
    }))
  }

  function clearAllData() {
    setForm({ name: '', matricula: '', etapa: '', oficina: '3006', exams: [{ number: '', name: '' }] })
    setExamQueries({})
    setOpenExamIndex(null)
    setError('')
  }

  function clearFilesAndData() {
    clearAllData()
    setFiles([])
    setAnalysis({ voucherIndex: 0 })
    setError('')
  }

  function setExamFromDisplay(index, displayValue) {
    const parsed = parseExamInput(displayValue)
    // Si parsed no tiene número pero hay nombre libre, mantenemos nombre; número quedará vacío y luego se autocompleta al generar
    setForm((current) => ({
      ...current,
      exams: current.exams.map((ex, i) => (i === index ? { number: parsed.number, name: parsed.name } : ex)),
    }))
    setExamQueries((q) => ({ ...q, [index]: displayValue }))
  }

  function selectSuggestion(index, suggestion) {
    setForm((current) => ({
      ...current,
      exams: current.exams.map((ex, i) => (i === index ? { number: suggestion.number, name: suggestion.name } : ex)),
    }))
    setExamQueries((q) => ({ ...q, [index]: `${suggestion.number} - ${suggestion.name}` }))
    setOpenExamIndex(null)
  }

  function deleteExam(index) {
    setForm((c) => ({ ...c, exams: c.exams.filter((_, i) => i !== index) }))
    setExamQueries((q) => {
      const next = { ...q }
      delete next[index]
      // reindex
      const reindexed = {}
      Object.entries(next).forEach(([k, v]) => {
        const ki = Number(k)
        if (ki > index) reindexed[ki - 1] = v
        else if (ki < index) reindexed[ki] = v
      })
      return reindexed
    })
    if (openExamIndex === index) setOpenExamIndex(null)
  }

  function addExam() {
    setForm((c) => ({ ...c, exams: [...c.exams, { number: '', name: '' }] }))
  }

  async function generate() {
    setError('')
    if (!selectedVoucher) {
      setError('Sube tu comprobante antes de generar.')
      return
    }
    // Normaliza exams: si escribiste texto libre sin número, genera un número provisional para que pase validación pero permite cualquier materia
    const normalizedExams = form.exams
      .map((ex, idx) => {
        const display = examQueries[idx] ?? getExamDisplay(ex)
        const parsed = parseExamInput(display)
        // Si hay nombre libre sin número, asigna número visual a partir del texto o correlativo
        let number = parsed.number
        let name = parsed.name
        // Si ambos vienen vacíos, intenta usar ex directamente
        if (!number && !name) {
          number = ex.number?.trim() || ''
          name = ex.name?.trim().toUpperCase() || ''
        }
        if (!number && name) {
          // materia personalizada válida: le ponemos S/N o el siguiente número libre
          number = String(idx + 1)
        }
        if (number && !name) {
          const canonical = KNOWN_EXAMS[number]
          if (canonical) name = canonical
          else name = display.toUpperCase()
        }
        return { number: number.trim(), name: name.trim().toUpperCase() }
      })
      .filter((ex) => ex.number || ex.name)

    const normalized = {
      name: form.name.trim(),
      matricula: form.matricula.replace(/\D/g, ''),
      oficina: (form.oficina || '3006').replace(/\D/g, '') || '3006',
      etapa: form.etapa.trim().toUpperCase().replace(/\s+/g, ''),
      exams: normalizedExams,
    }

    // Validar HEIC antes
    const heic = files.find((f) => (f.name || '').toLowerCase().endsWith('.heic') || (f.name || '').toLowerCase().endsWith('.heif'))
    if (heic) {
      setError('Tu foto es HEIC de iPhone. Cambia en Ajustes > Cámara > Formatos > Más compatible y vuelve a tomarla, o elige el PDF.')
      return
    }

    const result = voucherSchema.safeParse(normalized)
    if (!result.success) {
      const all = result.error.issues.map((i) => i.message).join(' • ')
      setError(all || 'Revisa tus datos.')
      // Lleva al primer campo con error
      const first = document.querySelector('.fields-card input')
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setBusy(true)
    setProgressText('Creando tu solicitud…')
    try {
      if (remember) {
        await saveLastProfile(normalized)
        setLastProfile({ name: normalized.name, matricula: normalized.matricula, etapa: normalized.etapa, oficina: normalized.oficina })
      } else {
        await clearLastProfile()
        setLastProfile(null)
      }
      const pdf = await createVoucherPdf({ voucherFile: selectedVoucher, ...normalized })
      setLastPdf(pdf)
      setLastSubmitted(normalized)
      downloadPdf(pdf.bytes, pdf.filename)
      // Reinicia solo materias para la próxima solicitud; conserva tus datos
      setForm((c) => ({ ...c, exams: [{ number: '', name: '' }] }))
      setExamQueries({})
      setOpenExamIndex(null)
      goToStep(3)
    } catch {
      setError('No se pudo crear el PDF. Intenta con otra foto o PDF.')
    } finally {
      setBusy(false)
    }
  }

  function downloadAgain() {
    if (!lastPdf) return
    downloadPdf(lastPdf.bytes, lastPdf.filename)
  }

  function sendWhatsApp() {
    const data = lastSubmitted
    if (!data) return
    const materias = data.exams.map((e) => `${e.number} - ${e.name}`).join(', ')
    const plain = `Hola Oficina 3006, envío mi solicitud:\n\n*Nombre:* ${data.name}\n*Matrícula:* ${data.matricula}\n*Etapa:* ${data.etapa}\n*Oficina:* ${data.oficina}\n*Materias:* ${materias}\n\nYa generé mi PDF con boucher. Lo envío enseguida por este mismo chat.`
    const phone = '5217832085248'
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(plain)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  function startOver() {
    setStep(1)
    // Conserva tus datos, solo reinicia materias y boucher para la siguiente materia
    setForm((c) => ({ ...c, exams: [{ number: '', name: '' }] }))
    setExamQueries({})
    setOpenExamIndex(null)
    setFiles([])
    setAnalysis({ voucherIndex: 0 })
    setLastPdf(null)
    setLastSubmitted(null)
    setProgress(0)
    setProgressText('')
    setError('')
  }

  // Display helpers
  const step1Ready = files.length > 0

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="app-brand">
          <span className="brand-mark" style={{ background: 'linear-gradient(135deg, #9B2247 0%, #611232 100%)' }}>
            <ClipboardCheck size={22} />
          </span>
          <div>
            <strong>OFICINA 3006 GENERADOR DE SOLICITUD</strong>
            <span>Oficina 3006 · Fácil y rápido</span>
          </div>
        </div>
        <button type="button" className="help-button" onClick={() => setShowHelp((c) => !c)}>
          ¿Cómo funciona?
        </button>
      </header>

      <Progress step={step} onStepClick={goToStep} allowBack labels={['Subir boucher', 'Anotar datos', 'Descargar']} />

      <PWAInstall />

      {showHelp && (
        <section className="help-card">
          <div className="help-grid">
            <div>
              <span className="help-number">1</span>
              <strong>Sube tu boucher</strong>
              <p>Solo foto o PDF del pago. Un toque y listo.</p>
            </div>
            <div>
              <span className="help-number">2</span>
              <strong>Anota tus datos</strong>
              <p>Nombre, matrícula, etapa y materias. Oficina ya viene con 3006.</p>
            </div>
            <div>
              <span className="help-number">3</span>
              <strong>Descarga y envía</strong>
              <p>Genera el PDF y <b>envíalo por WhatsApp a Oficina 3006</b>. Sin envío no es válido.</p>
            </div>
          </div>
          <div className="whatsapp-mandatory" style={{ marginTop: '14px' }}>
            <MessageCircle size={16} />
            <span>
              <b>Obligatorio:</b> al terminar debes enviar tu PDF por WhatsApp a <b>+52 1 783 208 5248</b>. Si no, tu solicitud <b>NO es válida bajo ninguna circunstancia</b>.
            </span>
          </div>
        </section>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <AlertTriangle size={19} />
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        <section className="wizard-card">
          <div className="intro">
            <span className="intro-icon">
              <Upload size={26} />
            </span>
            <div>
              <h1>Paso 1 · Sube tu boucher</h1>
              <p>Solo sube la foto o el PDF de tu comprobante de pago. Nada más aquí.</p>
            </div>
          </div>

          <div className="upload-actions">
            <button type="button" className="big-action primary-action" onClick={() => fileRef.current?.click()}>
              <span className="big-action-icon">
                <ImagePlus size={26} />
              </span>
              <span>
                <strong>Elegir foto o PDF</strong>
                <small>JPG, PNG, WEBP y PDF</small>
              </span>
              <ChevronRight size={20} />
            </button>
            <button type="button" className="big-action" onClick={() => cameraRef.current?.click()}>
              <span className="big-action-icon neutral">
                <Camera size={25} />
              </span>
              <span>
                <strong>Tomar foto</strong>
                <small>Se abre tu cámara</small>
              </span>
              <ChevronRight size={20} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addFiles(e.target.files)} />
          </div>

          {files.length > 0 && selectedVoucher && (
            <div className="selected-files" style={{ marginTop: '16px' }}>
              <div className="preview-card" style={{ padding: '12px' }}>
                <div className="preview-head" style={{ marginBottom: '10px' }}>
                  <strong>Tu boucher</strong>
                  <span style={{ color: '#98989A', fontSize: '12px' }}>Así se verá en la solicitud — 1 por persona</span>
                </div>
                <div className="preview-frame">
                  {isSelectedPdf ? (
                    <iframe
                      src={pdfPreviewUrl}
                      title="Vista previa PDF"
                      style={{ width: '100%', height: 'min(56vw, 320px)', border: 0, borderRadius: '10px', background: 'white' }}
                    />
                  ) : (
                    <img src={previewUrl} alt="Boucher seleccionado" style={{ maxHeight: 'min(72vw, 340px)' }} />
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '12px',
                    padding: '10px 12px',
                    background: '#FFFBF0',
                    border: '1px solid #E6D194',
                    borderRadius: '12px',
                  }}
                >
                  <span
                    className="file-icon"
                    style={
                      isSelectedPdf
                        ? { background: '#fdf0f2', color: '#9B2247', border: '1px solid #E6D194', width: '36px', height: '36px' }
                        : { background: '#e8efec', color: '#1E5B4F', border: '1px solid #1E5B4F', width: '36px', height: '36px' }
                    }
                  >
                    {isSelectedPdf ? <FileText size={16} /> : <FileImage size={16} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '12px', color: '#161A1D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedVoucher.name}
                    </strong>
                    <span style={{ fontSize: '11px', color: '#98989A' }}>
                      {(selectedVoucher.size / 1024 / 1024).toFixed(2)} MB · {isSelectedPdf ? 'PDF' : 'Imagen'} · listo para tu solicitud
                    </span>
                  </div>
                  <button
                    type="button"
                    className="back-link"
                    style={{ margin: 0, padding: '8px 12px', fontSize: '12px', flex: '0 0 auto' }}
                    onClick={() => {
                      setFiles([])
                      setAnalysis({ voucherIndex: 0 })
                    }}
                  >
                    <X size={14} /> Quitar
                  </button>
                </div>
              </div>
            </div>
          )}

          {busy && (
            <div className="analysis-progress">
              <div className="analysis-progress-head">
                <span>{progressText}</span>
                <strong>{progress}%</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <button type="button" className="continue-button" disabled={busy || !step1Ready} onClick={analyzeAll}>
            {busy ? <LoaderCircle className="spin" size={20} /> : <ChevronRight size={20} />}
            {busy ? 'Preparando…' : 'Continuar al paso 2'}
          </button>
          <div className="priority-note" role="alert" aria-live="polite" style={{ marginTop: '16px' }}>
            <span className="priority-note-icon" style={{ width: '42px', height: '42px' }}>
              <Clock3 size={20} />
            </span>
            <div className="priority-note-content">
              <strong>⛔ HORARIO OBLIGATORIO DE PAGO — LEE ANTES DE CONTINUAR</strong>
              <p>
                Pagos en <b>banco o banca electrónica</b> solo de <b style={{ color: '#611232' }}>lunes a viernes de 9:00 AM a 5:00 PM</b>.
                <span style={{ display: 'block', marginTop: '4px', color: '#9B2247', fontWeight: 900, fontSize: '13px' }}>
                  ⚠️ Si pagas fuera de esos días u horarios, tu pago NO se hace válido.
                </span>
              </p>
              <span
                style={{
                  display: 'block',
                  marginTop: '6px',
                  padding: '8px 10px',
                  background: 'white',
                  border: '1px solid #E6D194',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  color: '#161A1D',
                  fontWeight: 700,
                  lineHeight: 1.4,
                }}
              >
                Costo: $101 por examen — Ej. 2 materias = $202
              </span>
            </div>
          </div>
          <div className="whatsapp-mandatory">
            <MessageCircle size={16} />
            <span>
              <b>Obligatorio:</b> al terminar debes enviar tu PDF por WhatsApp a <b>Oficina 3006 (+52 1 783 208 5248)</b>. Si no lo envías, <b>NO es válido bajo ninguna circunstancia</b>.
            </span>
          </div>
          <p style={{ textAlign: 'center', color: '#98989A', fontSize: '11px', margin: '10px 0 0' }}>Tip: si no subes boucher no puedes continuar.</p>
        </section>
      )}

      {step === 2 && (
        <section className="review-layout">
          <div className="review-main">
            <div className="review-heading">
              <button type="button" className="back-button" onClick={() => goToStep(1)} aria-label="Volver">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1>Paso 2 · Anota tus datos</h1>
                <p>Completa lo tuyo. Oficina ya está en <strong>3006</strong>. Todo queda guardado aquí mismo.</p>
              </div>
            </div>

            <button type="button" className="back-link" onClick={() => goToStep(1)}>
              <ArrowLeft size={15} /> Volver al boucher
            </button>

            {lastProfile && (
              <button type="button" className="saved-profile-card" onClick={useSavedProfile}>
                <span className="saved-profile-icon">
                  <Save size={19} />
                </span>
                <span>
                  <strong>Usar datos guardados</strong>
                  <small>{lastProfile.name || 'Perfil anterior'}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            )}

            <div className="fields-card">
              <label className="field">
                <span>Tu nombre completo</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Ej. Mariana López Hernández"
                />
              </label>
              <label className="field">
                <span>Matrícula</span>
                <input value={form.matricula} inputMode="numeric" onChange={(e) => setForm((c) => ({ ...c, matricula: e.target.value }))} placeholder="Ej. 263084512739" />
              </label>
              <label className="field">
                <span>Etapa</span>
                <input value={form.etapa} onChange={(e) => setForm((c) => ({ ...c, etapa: e.target.value }))} placeholder="Ej. 2609B" />
              </label>
              <label className="field">
                <span>Oficina</span>
                <input value={form.oficina} inputMode="numeric" onChange={(e) => setForm((c) => ({ ...c, oficina: e.target.value }))} placeholder="3006" />
              </label>
            </div>

            <div className="exams-card">
              <div className="exams-heading">
                <div>
                  <h2>Materias</h2>
                  <p>Escribe el número o el nombre. Elige de la lista o escribe una nueva, igual vale.</p>
                </div>
                <button type="button" className="add-button" onClick={addExam}>
                  <Plus size={17} /> Agregar
                </button>
              </div>

              <div className="exam-list" style={{ gridTemplateColumns: '1fr' }}>
                {form.exams.map((exam, index) => {
                  const display = examQueries[index] ?? getExamDisplay(exam)
                  const suggestions = openExamIndex === index ? getSuggestions(display) : []
                  const hasSuggestions = suggestions.length > 0
                  return (
                    <div key={index} style={{ position: 'relative' }}>
                      <label className="field" style={{ display: 'grid', gap: '6px' }}>
                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          Materia {index + 1}
                          <button type="button" className="delete-exam" style={{ width: '28px', height: '28px' }} onClick={() => deleteExam(index)} aria-label="Quitar materia">
                            <Trash2 size={14} />
                          </button>
                        </span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <Search size={16} style={{ position: 'absolute', left: '11px', color: '#667085', pointerEvents: 'none' }} />
                          <input
                            value={display}
                            onChange={(e) => {
                              setExamFromDisplay(index, e.target.value)
                              setOpenExamIndex(index)
                            }}
                            onFocus={() => setOpenExamIndex(index)}
                            onBlur={() => setTimeout(() => setOpenExamIndex((c) => (c === index ? null : c)), 180)}
                            placeholder="Ej. 4 o Ser social y sociedad"
                            style={{ paddingLeft: '32px', paddingRight: '36px' }}
                          />
                          {display && (
                            <button
                              type="button"
                              onClick={() => {
                                setExamFromDisplay(index, '')
                                setOpenExamIndex(index)
                              }}
                              style={{ position: 'absolute', right: '6px', width: '28px', height: '28px', border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#667085' }}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </label>
                      {openExamIndex === index && hasSuggestions && (
                        <div
                            style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '6px',
                            background: 'white',
                            border: '1px solid #d0d5dd',
                            borderRadius: '12px',
                            boxShadow: '0 16px 40px rgba(97 18 50 /18%)',
                            zIndex: 60,
                            overflow: 'hidden',
                            maxHeight: '220px',
                            overflowY: 'auto',
                          }}
                        >
                          {suggestions.map((s) => (
                            <button
                              key={s.number}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectSuggestion(index, s)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'center',
                                padding: '10px 12px',
                                border: 0,
                                borderBottom: '1px solid #edf0f4',
                                background: 'white',
                                textAlign: 'left',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ minWidth: '28px', height: '28px', display: 'grid', placeItems: 'center', background: '#fdf0f2', color: '#9B2247', border: '1px solid #E6D194', borderRadius: '7px', fontWeight: 800, fontSize: '11px' }}>{s.number}</span>
                              <span style={{ fontSize: '12.5px', color: '#161A1D', lineHeight: 1.3 }}>{s.name}</span>
                            </button>
                          ))}
                          <div style={{ padding: '8px 12px', color: '#667085', fontSize: '11px', background: '#f8fafc' }}>¿No está? Sigue escribiendo y se guardará tal cual.</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          <aside className="voucher-side">
            {selectedVoucher ? (
              <div className="preview-card">
                <div className="preview-head">
                  <strong>Tu boucher</strong>
                  <span>{isSelectedPdf ? 'PDF listo' : 'Imagen lista'} — 1 por solicitud</span>
                </div>
                <div className="preview-frame">
                  {isSelectedPdf ? (
                    <iframe src={pdfPreviewUrl} title="PDF" style={{ width: '100%', height: '280px', border: 0, borderRadius: '10px', background: 'white' }} />
                  ) : (
                    <img src={previewUrl} alt="Boucher" />
                  )}
                </div>
                <button
                  type="button"
                  className="back-link"
                  style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setFiles([])
                    setAnalysis({ voucherIndex: 0 })
                    goToStep(1)
                  }}
                >
                  <X size={14} /> Quitar y subir otra
                </button>
              </div>
            ) : (
              <div className="voucher-select-card" style={{ border: '2px dashed #E6D194', background: '#FFFBF0' }}>
                <div className="side-title">
                  <span className="side-title-icon">
                    <FileImage size={18} />
                  </span>
                  <div>
                    <strong>Sin boucher aún</strong>
                    <span>Vuelve al paso 1 para subir tu comprobante.</span>
                  </div>
                </div>
              </div>
            )}

            <div className="whatsapp-mandatory" style={{ marginBottom: '10px' }}>
              <MessageCircle size={16} />
              <span>
                <b>Al terminar:</b> debes enviar el PDF por WhatsApp a <b>+52 1 783 208 5248</b>. Sin envío <b>NO es válido</b>.
              </span>
            </div>
            <button type="button" className="generate-button" disabled={busy} onClick={generate}>
              {busy ? <LoaderCircle className="spin" size={20} /> : <WandSparkles size={20} />}
              {busy ? 'Creando…' : 'Generar PDF'}
            </button>
            <label className="remember-row" style={{ marginTop: '12px' }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>
                <strong>Recordar en este celular/computadora</strong>
                <small>La próxima vez escribes menos.</small>
              </span>
            </label>
            <button type="button" className="back-link" style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }} onClick={() => goToStep(1)}>
              <ArrowLeft size={16} /> Volver al paso 1
            </button>
          </aside>
        </section>
      )}

      {step === 3 && (
        <section className="done-card">
          <span className="done-icon">
            <CheckCircle2 size={42} />
          </span>
          <h1>¡Listo! Tu solicitud está creada</h1>
          <p>Ya se bajó a tu celular/computadora. Puedes bajarla otra vez o corregir datos sin empezar de cero.</p>
          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              textAlign: 'left',
              background: '#fdf0f2',
              border: '2px solid #9B2247',
              borderRadius: '14px',
              padding: '14px',
              margin: '14px auto 0',
              maxWidth: '520px',
            }}
          >
            <span
              style={{
                flex: '0 0 auto',
                width: '40px',
                height: '40px',
                display: 'grid',
                placeItems: 'center',
                background: '#9B2247',
                color: 'white',
                borderRadius: '10px',
              }}
            >
              <MessageCircle size={20} />
            </span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#611232', lineHeight: 1.35 }}>
              No se te olvide enviarla por WhatsApp a la oficina. Si no la envías, <u>no es válida</u>.
            </span>
          </div>
          <div style={{ display: 'grid', gap: '10px', maxWidth: '360px', margin: '18px auto 0' }}>
            <button type="button" className="continue-button done-button" style={{ marginTop: 0, background: '#1E5B4F', fontSize: '15px', lineHeight: 1.2, padding: '14px 12px', minHeight: '62px' }} onClick={sendWhatsApp} disabled={!lastPdf || !lastSubmitted}>
              <MessageCircle size={19} /> Enviar mensaje a la oficina +52 1 783 208 5248
            </button>
            <button type="button" className="continue-button done-button" style={{ marginTop: 0 }} onClick={downloadAgain} disabled={!lastPdf}>
              <Download size={19} /> Descargar de nuevo
            </button>
            <button type="button" className="continue-button done-button" style={{ background: '#667085' }} onClick={startOver}>
              <RotateCcw size={19} /> Volver a hacer solicitud nueva
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              textAlign: 'left',
              background: '#fff8e5',
              border: '2px solid #fcd34d',
              borderRadius: '14px',
              padding: '14px',
              margin: '18px auto 0',
              maxWidth: '520px',
            }}
          >
            <span style={{ flex: '0 0 auto', width: '36px', height: '36px', display: 'grid', placeItems: 'center', background: 'white', borderRadius: '10px', border: '1px solid #fde68a' }}>
              <AlertTriangle size={20} color="#92400e" />
            </span>
            <div style={{ display: 'grid', gap: '4px' }}>
              <strong style={{ fontSize: '14px', color: '#92400e' }}>¡Revisa bien tu PDF antes de entregarlo!</strong>
              <span style={{ fontSize: '13px', color: '#78350f', lineHeight: 1.4 }}>
                Abre el archivo y verifica que tu <b>nombre, matrícula, etapa, oficina 3006 y materias</b> estén perfectos y que el boucher se vea completo. Si algo no cuadra, usa <b>Corregir datos</b>.
              </span>
            </div>
          </div>
          <div className="whatsapp-mandatory" style={{ margin: '12px auto 0', maxWidth: '520px', background: '#e8efec', borderColor: '#1E5B4F' }}>
            <MessageCircle size={18} color="#1E5B4F" />
            <span style={{ color: '#002F2A' }}>
              <b>Obligatorio:</b> debes enviar tu PDF por WhatsApp a <b>Oficina 3006 (+52 1 783 208 5248)</b>. Si no lo envías, tu solicitud <b>NO es válida bajo ninguna circunstancia</b>.
            </span>
          </div>
        </section>
      )}
    </main>
  )
}
