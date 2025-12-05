'use client';

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <div className="space-y-2">
        <Label htmlFor="user-filter">Usuario</Label>
        <Input id="user-filter" placeholder="Filtrar por ID o email..." value={user} onChange={(e) => setUser(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="action-filter">Acción</Label>
        <Input id="action-filter" placeholder="ej: LOGIN, CREATE..." value={action} onChange={(e) => setAction(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="module-filter">Módulo</Label>
        <Input id="module-filter" placeholder="ej: Auth, Roles..." value={module} onChange={(e) => setModule(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="area-filter">Área</Label>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger id="area-filter">
            <SelectValue placeholder="Seleccionar área..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las áreas</SelectItem>
            <SelectItem value="ADMIN">👤 Admin</SelectItem>
            <SelectItem value="CUSTOMER">🛍️ Cliente</SelectItem>
            <SelectItem value="PUBLIC">🌐 Público</SelectItem>
            <SelectItem value="SYSTEM">⚙️ Sistema</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Rango de Fechas</Label>
        <DatePickerWithRange date={date} setDate={setDate} />
      </div>

      <div className="flex items-end space-x-2">
        <Button onClick={handleSearch}>Buscar</Button>
        <Button variant="outline" onClick={clearFilters}>Limpiar</Button>
      </div>
    </div>
  );
}

