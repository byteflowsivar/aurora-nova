'use client';

/**
 * Componente AuditFilters (Container)
 *
 * Panel de filtros para búsqueda y filtrado de registros de auditoría.
 * Renderiza controles para filtrar por usuario, acción, módulo, área y rango de fechas.
 *
 * Este componente es responsable de:
 * - Recolectar criterios de filtrado del usuario
 * - Actualizar URL con parámetros de búsqueda (query params)
 * - Persistir filtros en URL para bookmarking/sharing
 * - Permitir limpiar todos los filtros de una vez
 * - Sincronizar estado con URL params para consistencia
 *
 * **Características**:
 * - Inputs de texto para userId, action, module (buscan parcialmente)
 * - Select dropdown para área (con emojis descriptivos)
 * - DatePickerWithRange para filtrar por rango de fechas
 * - Botón "Buscar" para aplicar filtros
 * - Botón "Limpiar" para resetear todos los filtros
 * - Responsive grid layout (1-5 columnas según viewport)
 * - Integración con URL search params (URL-driven state)
 *
 * @component
 * @returns {JSX.Element} Panel de filtros en grid responsive
 *
 * **Props**: Ninguno (sin props requeridas)
 *
 * **Estados Internos**:
 * - `user`: String para buscar por userId o email
 * - `action`: String para buscar por tipo de acción (LOGIN, CREATE, UPDATE, etc)
 * - `module`: String para buscar por módulo (Auth, Roles, Users, etc)
 * - `area`: String para área (admin, customer, public, system)
 * - `date`: DateRange | undefined para rango de fechas { from, to }
 *
 * **Campos de Filtro**:
 * 1. **Usuario** (texto)
 *    - Placeholder: "Filtrar por ID o email..."
 *    - Busca en userId o email del usuario
 *    - Búsqueda parcial
 * 2. **Acción** (texto)
 *    - Placeholder: "ej: LOGIN, CREATE..."
 *    - Valores: LOGIN, CREATE, UPDATE, DELETE, LOGOUT, etc
 *    - Búsqueda parcial
 * 3. **Módulo** (texto)
 *    - Placeholder: "ej: Auth, Roles..."
 *    - Valores: Auth, Roles, Users, Menu, etc
 *    - Búsqueda parcial
 * 4. **Área** (select)
 *    - Dropdown con opciones con emojis:
 *      - "Todas las áreas" (default/ALL)
 *      - "👤 Admin" - Área administrativa
 *      - "🛍️ Cliente" - Área de clientes
 *      - "🌐 Público" - Área pública
 *      - "⚙️ Sistema" - Eventos del sistema
 * 5. **Rango de Fechas** (date picker)
 *    - Permite seleccionar fecha "desde" y "hasta"
 *    - Formato: ISO string en URL
 *    - Opcional (puede ser undefined)
 *
 * **Flujo**:
 * 1. Al montar: lee URL search params y pre-carga filtros
 * 2. Usuario modifica campos de filtro
 * 3. Click en "Buscar":
 *    - Construye URLSearchParams con todos los filtros
 *    - Agrega page=1 para resetear paginación
 *    - router.replace() actualiza URL sin historial
 *    - Tabla se re-renderiza con nuevos filtros
 * 4. Click en "Limpiar":
 *    - Resetea todos los estados a valores vacíos
 *    - router.replace(pathname) limpia URL de params
 *    - Tabla muestra todos los registros sin filtros
 *
 * **URL Params Soportados**:
 * - userId: ID del usuario a filtrar
 * - action: Tipo de acción
 * - module: Módulo
 * - area: Área de la aplicación
 * - startDate: Fecha de inicio en ISO format
 * - endDate: Fecha de fin en ISO format
 * - page: Página actual (reseteada a 1 al filtrar)
 *
 * **Layout Responsivo**:
 * - Mobile (1 col): Todos los filtros apilados
 * - Tablet (2-3 cols): Filtros alineados en 2-3 columnas
 * - Desktop (4-5 cols): Todos los filtros en una fila
 *
 * **Casos de Uso**:
 * - Página de auditoría/logs administrativos
 * - Investigación de acciones de usuarios
 * - Búsqueda de eventos por rango de fechas
 * - Filtrado por área/módulo para debugging
 *
 * **Notas**:
 * - Filtros se persisten en URL (bookmarkeable)
 * - DateRange viene de react-day-picker
 * - Área usa Select dropdown con opciones predefinidas
 * - Usuario/Acción/Módulo son inputs de texto libres
 * - Búsquedas son case-sensitive en cliente (servidor valida)
 *
 * @example
 * ```tsx
 * // En página de auditoría
 * import { AuditFilters } from '@/modules/admin/components/containers/audit-filters-container'
 * import { AuditLogTable } from '@/modules/admin/components/containers/audit-log-table-container'
 *
 * export default function AuditPage() {
 *   return (
 *     <div className="space-y-6">
 *       <div>
 *         <h1>Registro de Auditoría</h1>
 *         <AuditFilters />
 *       </div>
 *       <AuditLogTable />
 *     </div>
 *   )
 * }
 * ```
 *
 * @see {@link AuditLogTable} para la tabla que usa estos filtros
 * @see {@link DatePickerWithRange} para el componente date picker
 */

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRange } from 'react-day-picker';

export function AuditFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [user, setUser] = React.useState(searchParams.get('userId') || '');
    const [action, setAction] = React.useState(searchParams.get('action') || '');
    const [module, setModule] = React.useState(searchParams.get('module') || '');
    const [area, setArea] = React.useState(searchParams.get('area') || '');
    const [date, setDate] = React.useState<DateRange | undefined>(() => {
        const from = searchParams.get('startDate');
        const to = searchParams.get('endDate');
        if (from) return { from: new Date(from), to: to ? new Date(to) : undefined };
        return undefined;
    });

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (user) params.set('userId', user);
        if (action) params.set('action', action);
        if (module) params.set('module', module);
        if (area) params.set('area', area);
        if (date?.from) params.set('startDate', date.from.toISOString());
        if (date?.to) params.set('endDate', date.to.toISOString());
        params.set('page', '1');
        router.replace(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        setUser('');
        setAction('');
        setModule('');
        setArea('');
        setDate(undefined);
        router.replace(pathname);
    };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
      <div className="space-y-2 lg:col-span-2">
        <Label>Rango de Fechas</Label>
        <DatePickerWithRange date={date} setDate={setDate} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="area-filter">Área</Label>
        <Select value={area || 'ALL'} onValueChange={(value) => setArea(value === 'ALL' ? '' : value)}>
          <SelectTrigger id="area-filter">
            <SelectValue placeholder="Seleccionar área..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las áreas</SelectItem>
            <SelectItem value="admin">👤 Admin</SelectItem>
            <SelectItem value="customer">🛍️ Cliente</SelectItem>
            <SelectItem value="public">🌐 Público</SelectItem>
            <SelectItem value="system">⚙️ Sistema</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="module-filter">Módulo</Label>
        <Input id="module-filter" placeholder="ej: Auth, Roles..." value={module} onChange={(e) => setModule(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="action-filter">Acción</Label>
        <Input id="action-filter" placeholder="ej: LOGIN, CREATE..." value={action} onChange={(e) => setAction(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-filter">Usuario</Label>
        <Input id="user-filter" placeholder="Filtrar por ID o email..." value={user} onChange={(e) => setUser(e.target.value)} />
      </div>

      <div className="flex items-end space-x-2">
        <Button onClick={handleSearch}>Buscar</Button>
        <Button variant="outline" onClick={clearFilters}>Limpiar</Button>
      </div>
    </div>
  );
}

