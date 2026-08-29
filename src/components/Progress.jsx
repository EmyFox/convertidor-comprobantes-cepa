export default function Progress({ step, onStepClick, allowBack, labels }) {
  const fallback = ['Subir', 'Revisar', 'Listo']
  const items = [
    ['1', labels?.[0] ?? fallback[0]],
    ['2', labels?.[1] ?? fallback[1]],
    ['3', labels?.[2] ?? fallback[2]],
  ]

  return (
    <div className="progress-steps" aria-label="Progreso">
      {items.map(([number, label], index) => {
        const itemStep = index + 1
        const active = step >= itemStep
        const current = step === itemStep
        const canClick = allowBack && onStepClick && itemStep <= step && itemStep !== step

        const content = (
          <>
            <span className="progress-dot">{number}</span>
            <span>{label}</span>
          </>
        )

        return canClick ? (
          <button
            key={number}
            type="button"
            className={`progress-item clickable ${active ? 'active' : ''} ${
              current ? 'current' : ''
            }`}
            onClick={() => onStepClick(itemStep)}
            title={`Volver a ${label}`}
          >
            {content}
          </button>
        ) : (
          <div
            className={`progress-item ${active ? 'active' : ''} ${
              current ? 'current' : ''
            }`}
            key={number}
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}