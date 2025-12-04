# Módulo Public

Componentes, servicios, hooks y lógica **específica de la zona pública**.

## Estado

🚧 **EN CONSTRUCCIÓN** - Estructura lista, implementación en progreso.

## Estructura

```
public/
├── components/
│   ├── containers/      # Smart components con lógica pública
│   │                    # - ProductListContainer
│   │                    # - SocialLoginContainer
│   │                    # - PublicNavbarContainer
│   └── presentational/   # Dumb components (reutilizan de shared/)
├── services/            # Lógica de negocio pública (API calls, etc.)
├── hooks/               # Hooks específicos de public
├── types/               # Tipos específicos de public
└── layout/              # Layouts públicos
```

## Importación

```typescript
// Contenedores (Smart)
import { ProductListContainer } from '@/modules/public/components/containers'

// Servicios
import { publicProductService } from '@/modules/public/services'

// Componentes Shared
import { Button, Card } from '@/modules/shared/components/ui'
```

## Principios

- **Lógica concentrada**: Los contenedores manejan toda la lógica específica de zona pública
- **URLs públicas**: Redirecciones a `/` y `/(public)/*`
- **Independencia**: No interfiere con zona Admin
- **Reutilización**: Usa componentes presentacionales de shared/
