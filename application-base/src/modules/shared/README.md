# Módulo Shared

Componentes, hooks, servicios y utilidades **compartidas entre todas las zonas** (Admin, Public, Customer Portal).

## Estructura

```
shared/
├── components/
│   ├── presentational/   # Componentes agnósticos (LoginForm, etc.)
│   └── layout/          # Layouts compartidos
├── hooks/               # Hooks reutilizables (useForm, useDebounce, etc.)
├── api/                 # Cliente HTTP compartido
├── utils/               # Funciones de utilidad
└── types/               # Tipos TypeScript globales
```

## Importación

```typescript
// Componentes shadcn/ui (instalados en @/components/ui/)
import { Button } from '@/components/ui/button'

// Componentes presentacionales compartidos
import { LoginForm } from '@/modules/shared/components/presentational'
```

## Principios

- **Sin lógica de negocio**: Los componentes presentacionales no conocen URLs, redirecciones ni lógica específica de zona
- **Reutilizable**: Usado por Admin y Public indistintamente
- **Agnóstico**: No depende de servicios o stores específicos de zona
