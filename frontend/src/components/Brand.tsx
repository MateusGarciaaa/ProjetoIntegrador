import { Church } from 'lucide-react'

interface BrandProps {
  inverse?: boolean
}

export function Brand({ inverse = false }: BrandProps) {
  return (
    <div className={`brand ${inverse ? 'brand-inverse' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <Church size={22} strokeWidth={1.9} />
      </span>
      <span className="brand-copy">
        <strong>ChurchHub</strong>
        <small>Gestão de membros</small>
      </span>
    </div>
  )
}
