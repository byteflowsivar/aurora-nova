# Módulo Admin

Componentes, servicios, hooks y lógica **específica de la zona administrativa**.

## Estructura

```
admin/
├── components/
│   ├── containers/      # Smart components con lógica admin
│   │                    # - AppSidebarContainer
│   │                    # - LoginFormContainer
│   │                    # - ProfileFormContainer
│   │                    # - ChangePasswordFormContainer
│   │                    # - AuditFiltersContainer
│   │                    # - AuditLogTableContainer
│   └── presentational/   # Dumb components (reutilizan de shared/)
├── services/            # Lógica de negocio admin (API calls, etc.)
├── hooks/               # Hooks específicos de admin
├── types/               # Tipos específicos de admin
└── layout/              # Layouts admin
```

## Importación

```typescript
// Contenedores (Smart)
import { AppSidebarContainer } from '@/modules/admin/components/containers'

// Servicios
import { adminUserService } from '@/modules/admin/services'

// Componentes Shared (cuando sea necesario)
import { Button, Card } from '@/modules/shared/components/ui'
```

## Principios

- **Lógica concentrada**: Los contenedores manejan toda la lógica específica de admin
- **URLs admin**: Redirecciones a `/admin/*`
- **Permisos**: Verificación granular de permisos administrativos
- **Independencia**: No interfiere con zona Public
