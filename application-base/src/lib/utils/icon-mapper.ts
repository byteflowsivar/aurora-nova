import * as LucideIcons from 'lucide-react'
import { LucideIcon } from 'lucide-react'

export function getIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return LucideIcons.Circle

  // Mapeo seguro con type checking
  const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons]

  if (!IconComponent || typeof IconComponent !== 'function') {
    console.warn(`Ícono no encontrado: ${iconName}`)
    return LucideIcons.Circle // Ícono por defecto
  }

  return IconComponent as LucideIcon
}
