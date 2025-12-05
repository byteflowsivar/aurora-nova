"use client"

/**
 * Componente AppSidebar (Container)
 *
 * Barra lateral de navegación del panel administrativo.
 * Renderiza el menú dinámico con opciones de navegación, información del usuario y logout.
 *
 * Este componente es responsable de:
 * - Renderizar el menú dinámico según permisos del usuario
 * - Mostrar información del usuario en el footer
 * - Manejar logout desde el dropdown menu
 * - Mostrar estado de navegación activa
 * - Soportar colapso/expansión de la barra lateral
 *
 * **Características**:
 * - Menú jerárquico: soporta items con sub-items
 * - Detección de ruta activa (pathname matching)
 * - Avatar del usuario con iniciales como fallback
 * - Dropdown menu en footer con perfil y logout
 * - Iconos dinámicos según el tipo de menu item
 * - Sidebar colapsable con icono
 * - Navegación con Link next.js (sin full-page reload)
 *
 * @component
 * @returns {JSX.Element} Barra lateral de navegación del admin
 *
 * @param {Object} props - Props del componente
 * @param {MenuItemType[]} props.menuItems - Items del menú a renderizar (cargados desde BD)
 *
 * **Props Requeridas**:
 * - `menuItems` (MenuItemType[]): Listado de items del menú con estructura jerárquica
 *   - Cada item puede tener children para crear sub-menús
 *   - Se resalta el item actual según pathname
 *
 * **Subcomponentes**:
 * - `SidebarItem`: Renderiza un item o grupo del menú
 *   - Si tiene children: Renderiza como collapsible submenu
 *   - Si tiene href: Renderiza como link directo
 *   - Detecta si el item está activo
 *
 * **Estados UI**:
 * - Inicial: Menú colapsado (icon view) o expandido según preferencia
 * - Active: Item activo se resalta según pathname
 * - Hover: Menu items tienen efecto hover
 * - Dropdown: Menu de usuario en footer muestra opciones
 *
 * **Flujo**:
 * 1. Recibe menuItems como prop (generado por parent desde caché/BD)
 * 2. Obtiene pathname actual con usePathname()
 * 3. Renderiza items del menú mapeando estructura jerárquica
 * 4. Resalta item activo comparando href con pathname
 * 5. En footer: muestra avatar/nombre del usuario actual
 * 6. Dropdown de usuario tiene opciones: Perfil y Cerrar Sesión
 * 7. Logout: Llama server action logoutUser()
 * 8. Redirección a signin tras logout exitoso
 *
 * **Seguridad**:
 * - menuItems son filtrados en parent según permisos del usuario
 * - Logout usa server action (invalidación de sesión en BD)
 * - Avatar usa imagen de perfil si existe, sino iniciales
 * - No expone información sensible
 *
 * @example
 * ```tsx
 * // En layout del admin
 * import { AppSidebar } from '@/modules/admin/components/containers/app-sidebar-container'
 * import { getMenuItems } from '@/lib/menu-cache'
 *
 * export default async function AdminLayout({
 *   children,
 * }: {
 *   children: React.ReactNode
 * }) {
 *   const menuItems = await getMenuItems()
 *   return (
 *     <div className="flex">
 *       <AppSidebar menuItems={menuItems} />
 *       <main>{children}</main>
 *     </div>
 *   )
 * }
 * ```
 *
 * @see {@link MenuItemType} para la estructura de datos de menu items
 * @see {@link getIcon} para la función de mapeo de iconos
 * @see {@link logoutUser} para la server action de logout
 * @see {@link useAuth} para obtener información del usuario actual
 */

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  LogOut,
  User,
  Shield
} from "lucide-react"

import { logoutUser } from "@/actions/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { MenuItem as MenuItemType } from "@/modules/admin/types"
import { getIcon } from "@/modules/admin/utils"
import { useAuth } from "@/modules/shared/hooks" // Keep for user info in footer

// Component to render a single menu item or a group
function SidebarItem({ item, pathname }: { item: MenuItemType; pathname: string }) {
  const Icon = getIcon(item.icon);

  // If it's a group with children
  if (item.children && item.children.length > 0) {
    const isChildActive = item.children.some(child => child.href && pathname.startsWith(child.href));

    return (
      <SidebarMenuItem> {/* The group itself is a menu item */}
        <SidebarMenuButton asChild isActive={isChildActive}>
          <div>
            {Icon && <Icon />}
            <span>{item.title}</span>
          </div>
        </SidebarMenuButton>
        <SidebarMenuSub> {/* This is the sub-menu container */}
          {item.children.map((child) => (
            <SidebarMenuSubItem key={child.id}> {/* Each child is a sub-menu item */}
              <SidebarMenuSubButton asChild isActive={pathname === child.href}>
                <Link href={child.href!}>
                  <span>{child.title}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </SidebarMenuItem>
    );
  }

  // If it's a direct link
  if (item.href) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
          <Link href={item.href}>
            {Icon && <Icon />}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return null;
}


export function AppSidebar({ menuItems }: { menuItems: MenuItemType[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth() // Only for user info in footer

  // Obtener iniciales del usuario
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    if (user?.name) {
      const names = user.name.split(" ")
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase()
      }
      return user.name.substring(0, 2).toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return "U"
  }

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user?.name || user?.email || "Usuario"
  }

  const handleLogout = async () => {
    try {
      const result = await logoutUser()
      if (result.success) {
        router.push("/admin/auth/signin")
        router.refresh()
      } else {
        console.error("Error al cerrar sesión:", result.error)
        alert("Error al cerrar sesión. Por favor intenta de nuevo.")
      }
    } catch (error) {
      console.error("Error inesperado al cerrar sesión:", error)
      alert("Error inesperado al cerrar sesión")
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Shield className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Aurora Nova</span>
                  <span className="truncate text-xs">Sistema RBAC</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarItem key={item.id} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={user?.image || undefined} alt={getUserDisplayName()} />
                    <AvatarFallback className="rounded-lg">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{getUserDisplayName()}</span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={user?.image || undefined} alt={getUserDisplayName()} />
                      <AvatarFallback className="rounded-lg">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{getUserDisplayName()}</span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="cursor-pointer">
                    <User className="mr-2 size-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 size-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
