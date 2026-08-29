import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 42
const LEFT_WIDTH = 350
const RIGHT_GAP = 18

function upper(text = '') {
  return text.toLocaleUpperCase('es-MX')
}

function fitLines(text, font, size, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  if (!words.length) return ['']

  const lines = []
  let current = words[0]

  for (const word of words.slice(1)) {
    const test = `${current} ${word}`
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test
    } else {
      lines.push(current)
      current = word
    }
  }

  lines.push(current)
  return lines
}

function safeFileName(value = 'baucher') {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'baucher'
}

function isPdfFile(file) {
  return (
    file.type === 'application/pdf' ||
    file.name?.toLowerCase().endsWith('.pdf')
  )
}

async function embedImage(pdfDoc, file) {
  const bytes = await file.arrayBuffer()

  if (file.type === 'image/png') {
    return pdfDoc.embedPng(bytes)
  }

  if (file.type === 'image/jpeg') {
    return pdfDoc.embedJpg(bytes)
  }

  // WEBP and any browser-readable format are converted locally to PNG.
  const url = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.src = url
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    canvas.getContext('2d').drawImage(image, 0, 0)

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/png', 1),
    )

    const pngBytes = await blob.arrayBuffer()
    return pdfDoc.embedPng(pngBytes)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function createVoucherPdf({
  voucherFile,
  name,
  matricula,
  etapa,
  oficina,
  exams,
}) {
  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  const normal = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const black = rgb(0.08, 0.08, 0.09)

  let x = MARGIN
  let y = PAGE_HEIGHT - 58

  // Columnas estrictas: texto izquierda (MARGIN..MARGIN+LEFT_WIDTH), imagen derecha (MARGIN+LEFT_WIDTH+RIGHT_GAP .. PAGE_WIDTH-MARGIN)
  // Nunca se cruzan: x está clampado y maxWidth limita el texto.
  const ensureSpace = (needed) => {
    if (y - needed < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      // En páginas siguientes ya no hay imagen lateral, podemos usar ancho completo para texto
      x = MARGIN
      y = PAGE_HEIGHT - MARGIN
      // Marca visual de continuación
      page.drawText('CONTINUACIÓN - BAUCHER DE PAGO', {
        x,
        y,
        size: 9,
        font: bold,
        color: rgb(0.4, 0.45, 0.53),
      })
      y -= 24
    }
  }

  page.drawText('BAUCHER DE PAGO', {
    x,
    y,
    size: 15,
    font: bold,
    color: black,
  })

  y -= 35

  const drawField = (label, value) => {
    const size = 11
    const lineHeight = 15
    const labelWidth = bold.widthOfTextAtSize(label, size)
    const valueX = x + Math.max(88, labelWidth + 12)
    const maxWidth = LEFT_WIDTH - (valueX - x)

    const lines = fitLines(upper(value), normal, size, maxWidth)
    const needed = Math.max(1, lines.length) * lineHeight + 4
    ensureSpace(needed)

    page.drawText(label, {
      x,
      y,
      size,
      font: bold,
      color: black,
    })

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: valueX,
        y: y - index * lineHeight,
        size,
        font: normal,
        color: black,
      })
    })

    y -= needed
  }

  drawField('NOMBRE:', name)
  drawField('MATRICULA:', matricula)
  drawField('ETAPA:', etapa)
  drawField('OFICINA:', oficina)

  y -= 8
  ensureSpace(24)

  page.drawText('EXAMEN A SOLICITAR:', {
    x,
    y,
    size: 11,
    font: bold,
    color: black,
  })

  y -= 20

  for (const exam of exams) {
    if (!exam.name?.trim()) continue

    const size = 11
    const lineHeight = 15
    const hasNumber = Boolean(exam.number?.trim())
    const label = hasNumber ? `NUMERO ${exam.number}:` : 'MATERIA:'
    const valueX = x + 78
    const maxWidth = LEFT_WIDTH - 78

    const lines = fitLines(upper(exam.name), normal, size, maxWidth)
    const needed = Math.max(1, lines.length) * lineHeight + 4
    ensureSpace(needed)

    page.drawText(label, {
      x,
      y,
      size,
      font: bold,
      color: black,
    })

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: valueX,
        y: y - index * lineHeight,
        size,
        font: normal,
        color: black,
      })
    })

    y -= needed
  }

  // La imagen/PDF del comprobante va SIEMPRE en la portada, columna derecha estricta
  const firstPage = pdfDoc.getPage(0)
  if (isPdfFile(voucherFile)) {
    const srcBytes = await voucherFile.arrayBuffer()
    try {
      const srcDoc = await PDFDocument.load(srcBytes)
      const copied = await pdfDoc.copyPages(
        srcDoc,
        srcDoc.getPageIndices(),
      )
      // Añade el comprobante PDF como páginas siguientes para no perder calidad
      copied.forEach((p) => pdfDoc.addPage(p))
      // Nota visual en la portada (primera página) columna derecha
      firstPage.drawText('Comprobante adjunto en la siguiente página →', {
        x: MARGIN + LEFT_WIDTH + RIGHT_GAP,
        y: MARGIN + 10,
        size: 8,
        font: normal,
        color: rgb(0.4, 0.45, 0.53),
      })
    } catch {
      // Fallback: si el PDF no se pudo cargar, deja la portada sin imagen
    }
  } else {
    const embedded = await embedImage(pdfDoc, voucherFile)
    const dims = embedded.scale(1)

    const rightX = MARGIN + LEFT_WIDTH + RIGHT_GAP
    const availableWidth = PAGE_WIDTH - rightX - MARGIN
    const availableHeight = PAGE_HEIGHT - 2 * MARGIN

    const scale = Math.min(
      availableWidth / dims.width,
      availableHeight / dims.height,
    )

    const drawWidth = dims.width * scale
    const drawHeight = dims.height * scale

    // Imagen centrada verticalmente pero clampada a columna derecha: nunca invade LEFT_WIDTH
    firstPage.drawImage(embedded, {
      x: rightX + (availableWidth - drawWidth) / 2,
      y: (PAGE_HEIGHT - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    })
    // Borde sutil para delimitar columna derecha
    firstPage.drawRectangle({
      x: rightX,
      y: MARGIN,
      width: availableWidth,
      height: PAGE_HEIGHT - 2 * MARGIN,
      borderColor: rgb(0.9, 0.91, 0.93),
      borderWidth: 0.6,
    })
  }

  pdfDoc.setTitle(`Baucher de pago - ${name}`)

  const bytes = await pdfDoc.save()

  return {
    bytes,
    filename: `baucher_${safeFileName(name)}.pdf`,
  }
}

export function downloadPdf(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 3000)
}