# Estructura del Código Fuente - Aurora Nova

Esta carpeta contiene el código fuente de la aplicación Aurora Nova, organizado siguiendo las mejores prácticas de Next.js y los principios SOLID establecidos en el ADR-001.

## Estructura de Directorios

```
src/
├── app/                    # App Router de Next.js 15+
│   ├── (auth)/            # Grupo de rutas de autenticación
│   ├── (dashboard)/       # Grupo de rutas del dashboard
│   ├── api/               # API Routes de Next.js
│   ├── globals.css        # Estilos globales con Tailwind CSS
│   ├── layout.tsx         # Layout raíz de la aplicación
│   └── page.tsx           # Página principal
├── components/            # Componentes React reutilizables
│   ├── auth/              # Componentes específicos de autenticación
│   ├── ui/                # Componentes base de shadcn/ui
│   └── ...                # Otros componentes por funcionalidad
├── lib/                   # Librerías y utilidades
│   ├── auth/              # Configuración y utilidades de Lucia Auth
│   ├── db/                # Configuración de base de datos y ORM
│   ├── config.ts          # Configuración central de la aplicación
│   ├── env.ts             # Validación de variables de entorno
│   └── utils.ts           # Utilidades generales
├── types/                 # Definiciones de tipos TypeScript
│   ├── auth.ts            # Tipos para autenticación y autorización
│   └── env.d.ts           # Tipos para variables de entorno
└── hooks/                 # Custom hooks de React (futuro)
```

## Configuración Completada

### ✅ Variables de Entorno
- `.env.example` - Plantilla con todas las variables necesarias
- `.env.local` - Configuración para desarrollo local
- `src/types/env.d.ts` - Tipado TypeScript para variables de entorno
- `src/lib/env.ts` - Validación y carga segura de variables

### ✅ Estructura Base
- Directorios organizados por funcionalidad
- Separación clara entre auth, database, components y types
- Configuración centralizada en `src/lib/config.ts`

### ✅ Tipos TypeScript
- Tipos completos para User, Session, Role, Permission
- DTOs para operaciones CRUD
- Enums y constantes para permisos
- Tipos de error específicos para auth

## Próximos Pasos

Según el plan de trabajo (docs/01_modules/01_auth_and_authz/plan-de-trabajo.md):

1. **T003**: Crear esquema de base de datos
2. **T004**: Configurar ORM y migraciones
3. **T006**: Instalar y configurar Lucia Auth

## Variables de Entorno Requeridas

```bash
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/db"

# Autenticación
AUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Aplicación
NODE_ENV="development"
APP_NAME="Aurora Nova"
APP_URL="http://localhost:3000"
```

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Ejecutar linting
npm run lint

# Construir para producción
npm run build
```

## Notas Importantes

- Esta estructura sigue los ADRs documentados en `/docs/00_global_architecture/`
- Los tipos TypeScript están alineados con el esquema SQL en `/docs/01_modules/01_auth_and_authz/04_diseno/database/`
- La configuración de seguridad cumple con los RNF documentados
- shadcn/ui está parcialmente configurado (pendiente cambio a tema "Blue")