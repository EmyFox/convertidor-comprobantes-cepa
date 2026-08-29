import { AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function Confidence({ item }) {
  const confidence = Number(item?.confidence || 0)

  if (!item?.value) {
    return (
      <span className="confidence bad">
        <AlertTriangle size={14} />
        Escríbelo
      </span>
    )
  }

  if (confidence >= 0.88) {
    return (
      <span className="confidence good">
        <CheckCircle2 size={14} />
        Encontrado
      </span>
    )
  }

  return (
    <span className="confidence warn">
      <AlertTriangle size={14} />
      Revísalo
    </span>
  )
}