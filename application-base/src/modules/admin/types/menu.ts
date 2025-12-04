export interface MenuItem {
  id: string
  title: string
  href: string | null
  icon: string | null
  order: number
  isActive: boolean
  permissionId: string | null
  parentId: string | null
  children?: MenuItem[]
}

export interface MenuGroup extends MenuItem {
  href: null
  children: MenuItem[]
}

export interface MenuLink extends MenuItem {
  href: string
  children?: never
}
