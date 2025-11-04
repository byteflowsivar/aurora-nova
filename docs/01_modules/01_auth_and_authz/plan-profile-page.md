# Plan de Implementación: Página de Perfil de Usuario

**Módulo**: Auth & Authz
**Versión**: Alpha
**Fecha Inicio**: 2025-11-04
**Fecha Finalización**: 2025-11-04
**Estado**: 🟢 **COMPLETADO EXITOSAMENTE**

---

## 📋 Resumen Ejecutivo

Implementación de una página de perfil de usuario que permite:
1. ✅ Ver y actualizar información personal (nombre y apellido)
2. ✅ Cambiar contraseña de forma segura
3. ✅ Visualizar información de cuenta (email, fecha de creación)
4. ✅ **BONUS:** Cierre automático de todas las sesiones al cambiar contraseña

Este módulo resuelve el problema del enlace `/settings` que retornaba 404.

### Objetivos

1. ✅ Crear página de perfil accesible desde el menú de usuario
2. ✅ Permitir actualización de nombre y apellido
3. ✅ Implementar cambio de contraseña seguro
4. ✅ Mostrar información de cuenta (readonly)
5. ✅ Mantener buena UX con validaciones y feedback
6. ✅ **BONUS:** Cerrar todas las sesiones activas al cambiar contraseña (todos los dispositivos)

---

## 🏗️ Arquitectura de la Funcionalidad

### Estructura de Datos

```typescript
// Información editable
User {
  firstName: String?     // Editable
  lastName: String?      // Editable
  image: String?         // Editable (futuro)
}

// Información readonly
User {
  email: String          // NO editable
  emailVerified: Date?   // NO editable
  createdAt: Date        // NO editable
}

// Credenciales
UserCredentials {
  hashedPassword: String // Solo mediante cambio de contraseña
}
```

### Reglas de Negocio

1. **Actualización de Perfil**:
   - Solo el usuario puede editar su propio perfil
   - Email NO es editable
   - firstName y lastName son opcionales
   - name (Auth.js) se sincroniza automáticamente como `${firstName} ${lastName}`

2. **Cambio de Contraseña**:
   - Requiere contraseña actual para verificación
   - Solo disponible para usuarios con credentials (no OAuth)
   - Nueva contraseña debe cumplir requisitos de seguridad:
     - Mínimo 8 caracteres
     - Al menos 1 mayúscula
     - Al menos 1 número
     - Al menos 1 carácter especial

3. **Seguridad**:
   - Todas las operaciones requieren sesión activa
   - El usuario solo puede modificar su propio perfil
   - Rate limiting en cambio de contraseña (opcional)

---

## 📊 Modelo de Datos

### Tablas Existentes (No requieren cambios)

#### Tabla `user`
```prisma
model User {
  id            String    @id @default(dbgenerated("uuidv7()")) @db.Uuid
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  firstName     String?   // ✅ Ya existe
  lastName      String?   // ✅ Ya existe
  createdAt     DateTime
  updatedAt     DateTime

  credentials   UserCredentials?
}
```

#### Tabla `user_credentials`
```prisma
model UserCredentials {
  userId         String   @id @db.Uuid
  hashedPassword String   // ✅ Ya existe
  createdAt      DateTime
  updatedAt      DateTime

  user User @relation(fields: [userId], references: [id])
}
```

**✅ No se requieren migraciones - Todo existe en la BD**

---

## 🎯 Tareas de Implementación

### **Fase 1: Backend - API Routes (✅ Completada)**

#### ✅ Tarea 1.1: Crear Query para Obtener Perfil
- **Archivo**: `application-base/src/lib/prisma/user-queries.ts` (nuevo o ampliar existente)
- **Descripción**: Función para obtener datos del perfil del usuario
- **Dependencias**: Ninguna
- **Estimado**: 15 min

**Funciones a implementar**:

```typescript
/**
 * Obtiene el perfil completo del usuario actual
 * Incluye verificación si tiene credentials (no OAuth)
 */
export async function getUserProfile(userId: string): Promise<UserProfile>

/**
 * Actualiza información personal del usuario
 */
export async function updateUserProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<User>

/**
 * Verifica si el usuario tiene credentials (puede cambiar contraseña)
 */
export async function userHasCredentials(userId: string): Promise<boolean>
```

**Tipos TypeScript**:

```typescript
interface UserProfile {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null
  image: string | null
  emailVerified: Date | null
  createdAt: Date
  updatedAt: Date
  hasCredentials: boolean
}

interface UpdateProfileInput {
  firstName?: string
  lastName?: string
  image?: string
}
```

---

#### ✅ Tarea 1.2: Crear Query para Cambio de Contraseña
- **Archivo**: `application-base/src/lib/prisma/user-queries.ts`
- **Descripción**: Función para cambiar contraseña de forma segura
- **Dependencias**: Tarea 1.1
- **Estimado**: 30 min

**Funciones a implementar**:

```typescript
/**
 * Cambia la contraseña del usuario
 * Verifica la contraseña actual antes de cambiarla
 */
export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }>
```

**Lógica de implementación**:
1. Verificar que el usuario tiene credentials
2. Obtener hash de contraseña actual
3. Comparar currentPassword con hash (bcrypt.compare)
4. Si coincide, hashear nueva contraseña
5. Actualizar UserCredentials.hashedPassword
6. Actualizar updatedAt
7. (Opcional) Invalidar todas las sesiones excepto la actual

---

#### ✅ Tarea 1.3: Crear Validaciones Zod
- **Archivo**: `application-base/src/lib/validations/profile-schema.ts` (nuevo)
- **Descripción**: Schemas de validación para perfil y contraseña
- **Dependencias**: Ninguna
- **Estimado**: 20 min

**Schemas a crear**:

```typescript
import { z } from 'zod'

// Schema para actualización de perfil
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido").max(255).optional(),
  lastName: z.string().min(1, "El apellido es requerido").max(255).optional(),
  image: z.string().url().optional().nullable(),
})

// Schema para cambio de contraseña
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newPassword: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial"),
  confirmPassword: z.string().min(1, "Confirma tu nueva contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})
```

---

#### ✅ Tarea 1.4: Crear API Route - Obtener Perfil
- **Archivo**: `application-base/src/app/api/user/profile/route.ts` (nuevo)
- **Descripción**: Endpoint GET para obtener perfil del usuario actual
- **Dependencias**: Tarea 1.1, 1.3
- **Estimado**: 15 min

```typescript
// GET /api/user/profile
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await getUserProfile(session.user.id)
    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

---

#### ✅ Tarea 1.5: Crear API Route - Actualizar Perfil
- **Archivo**: `application-base/src/app/api/user/profile/route.ts`
- **Descripción**: Endpoint PATCH para actualizar perfil
- **Dependencias**: Tarea 1.1, 1.3
- **Estimado**: 20 min

```typescript
// PATCH /api/user/profile
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const json = await request.json()
    const data = updateProfileSchema.parse(json)

    const updatedUser = await updateUserProfile(session.user.id, data)

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

---

#### ✅ Tarea 1.6: Crear API Route - Cambiar Contraseña
- **Archivo**: `application-base/src/app/api/user/change-password/route.ts` (nuevo)
- **Descripción**: Endpoint POST para cambiar contraseña
- **Dependencias**: Tarea 1.2, 1.3
- **Estimado**: 25 min

```typescript
// POST /api/user/change-password
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const json = await request.json()
    const { currentPassword, newPassword, confirmPassword } =
      changePasswordSchema.parse(json)

    const result = await changeUserPassword(
      session.user.id,
      currentPassword,
      newPassword
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Error changing password:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

---

### **Fase 2: Frontend - Componentes y UI (✅ Completada)**

#### ✅ Tarea 2.1: Crear Tipos TypeScript para Perfil
- **Archivo**: `application-base/src/lib/types/profile.ts` (nuevo)
- **Descripción**: Definir tipos e interfaces para el perfil
- **Dependencias**: Ninguna
- **Estimado**: 10 min

```typescript
export interface UserProfile {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null
  image: string | null
  emailVerified: Date | null
  createdAt: Date
  updatedAt: Date
  hasCredentials: boolean
}

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  image?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
```

---

#### ✅ Tarea 2.2: Crear Componente - Formulario de Perfil
- **Archivo**: `application-base/src/components/profile/profile-form.tsx` (nuevo)
- **Descripción**: Formulario para editar información personal
- **Dependencias**: Tarea 2.1
- **Estimado**: 45 min

**Estructura del componente**:

```typescript
'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { updateProfileSchema } from '@/lib/validations/profile-schema'
import type { UserProfile, UpdateProfileData } from '@/lib/types/profile'

interface ProfileFormProps {
  user: UserProfile
  onSuccess?: () => void
}

export function ProfileForm({ user, onSuccess }: ProfileFormProps) {
  // Implementación del formulario
  // - react-hook-form con zod
  // - Submit a /api/user/profile
  // - Toast de éxito/error
  // - Loading state
}
```

**Características**:
- Formulario con validación en tiempo real
- Loading state durante actualización
- Toast notifications para feedback
- Campos: firstName, lastName
- Email mostrado como readonly

---

#### ✅ Tarea 2.3: Crear Componente - Formulario de Cambio de Contraseña
- **Archivo**: `application-base/src/components/profile/change-password-form.tsx` (nuevo)
- **Descripción**: Formulario para cambiar contraseña
- **Dependencias**: Tarea 2.1
- **Estimado**: 50 min

**Estructura del componente**:

```typescript
'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff } from 'lucide-react'
import { changePasswordSchema } from '@/lib/validations/profile-schema'
import type { ChangePasswordData } from '@/lib/types/profile'

interface ChangePasswordFormProps {
  onSuccess?: () => void
}

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  // Implementación del formulario
  // - react-hook-form con zod
  // - Submit a /api/user/change-password
  // - Toggle show/hide password
  // - Toast de éxito/error
  // - Reset form al completar
}
```

**Características**:
- 3 campos de contraseña con validación
- Toggle para mostrar/ocultar contraseña
- Validaciones en tiempo real (requisitos de seguridad)
- Indicador de fuerza de contraseña (opcional)
- Toast notifications
- Reset automático al cambiar exitosamente

---

#### ✅ Tarea 2.4: Crear Componente - Información de Cuenta
- **Archivo**: `application-base/src/components/profile/account-info.tsx` (nuevo)
- **Descripción**: Card con información readonly de la cuenta
- **Dependencias**: Tarea 2.1
- **Estimado**: 20 min

**Estructura del componente**:

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { UserProfile } from '@/lib/types/profile'

interface AccountInfoProps {
  user: UserProfile
}

export function AccountInfo({ user }: AccountInfoProps) {
  // Mostrar información readonly:
  // - Email
  // - Estado de verificación (emailVerified)
  // - Tipo de cuenta (credentials vs OAuth)
  // - Fecha de creación
  // - Última actualización
}
```

**Características**:
- Información readonly con iconos
- Badge para email verificado/no verificado
- Badge para tipo de autenticación
- Formato de fechas humanizado

---

#### ✅ Tarea 2.5: Crear Página de Settings
- **Archivo**: `application-base/src/app/(protected)/settings/page.tsx` (nuevo)
- **Descripción**: Página principal de configuración del perfil
- **Dependencias**: Tareas 2.2, 2.3, 2.4
- **Estimado**: 30 min

**Estructura de la página**:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/prisma/user-queries'
import { ProfileForm } from '@/components/profile/profile-form'
import { ChangePasswordForm } from '@/components/profile/change-password-form'
import { AccountInfo } from '@/components/profile/account-info'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const profile = await getUserProfile(session.user.id)

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configuración de Perfil</h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal y configuración de seguridad
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Columna izquierda */}
        <div className="space-y-6">
          <ProfileForm user={profile} />
          <AccountInfo user={profile} />
        </div>

        {/* Columna derecha */}
        <div>
          {profile.hasCredentials && (
            <ChangePasswordForm />
          )}
          {!profile.hasCredentials && (
            <Card>
              <CardHeader>
                <CardTitle>Cambio de Contraseña</CardTitle>
                <CardDescription>
                  Esta cuenta utiliza autenticación externa (OAuth).
                  No es posible cambiar la contraseña desde aquí.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Layout de la página**:
- Grid responsive (1 columna en móvil, 2 en desktop)
- Columna izquierda: Perfil + Info de cuenta
- Columna derecha: Cambio de contraseña (solo si tiene credentials)

---

#### ✅ Tarea 2.6: Actualizar Link en Sidebar
- **Archivo**: `application-base/src/components/layout/app-sidebar.tsx`
- **Descripción**: Verificar que el link `/settings` apunte correctamente
- **Dependencias**: Tarea 2.5
- **Estimado**: 5 min

**Cambio**:
- Verificar que la línea 219 tenga: `<Link href="/settings">`
- (Ya está correcta, solo verificar que funcione)

---

### **Fase 3: Mejoras y Pulido (⏳ Pendiente)**

#### ✅ Tarea 3.1: Agregar Indicador de Fuerza de Contraseña
- **Archivo**: `application-base/src/components/profile/password-strength.tsx` (nuevo)
- **Descripción**: Componente visual para mostrar fuerza de contraseña
- **Dependencias**: Ninguna
- **Estimado**: 30 min
- **Prioridad**: Media (Opcional)

**Características**:
- Barra de progreso con colores (rojo/amarillo/verde)
- Texto descriptivo (Débil/Media/Fuerte)
- Validación en tiempo real

---

#### ✅ Tarea 3.2: Agregar Confirmación al Cambiar Contraseña
- **Archivo**: `application-base/src/components/profile/change-password-form.tsx`
- **Descripción**: Modal de confirmación antes de cambiar contraseña
- **Dependencias**: Tarea 2.3
- **Estimado**: 15 min
- **Prioridad**: Baja (Opcional)

---

#### ✅ Tarea 3.3: Logout de Otras Sesiones al Cambiar Contraseña
- **Archivo**: `application-base/src/lib/prisma/user-queries.ts`
- **Descripción**: Invalidar todas las sesiones excepto la actual
- **Dependencias**: Tarea 1.2
- **Estimado**: 25 min
- **Prioridad**: Alta (Recomendada para producción)

**Implementación**:
```typescript
// En changeUserPassword, agregar:
await prisma.session.deleteMany({
  where: {
    userId: userId,
    id: { not: currentSessionId }, // Mantener sesión actual
  }
})
```

---

#### ✅ Tarea 3.4: Rate Limiting para Cambio de Contraseña
- **Archivo**: `application-base/src/lib/rate-limit.ts` (nuevo)
- **Descripción**: Limitar intentos de cambio de contraseña
- **Dependencias**: Ninguna
- **Estimado**: 40 min
- **Prioridad**: Media (Recomendada para producción)

**Estrategia**:
- Usar Map en memoria o Redis
- Max 3 intentos fallidos por hora
- Lockout temporal de 15 minutos

---

### **Fase 4: Testing (⏳ Pendiente)**

#### ✅ Tarea 4.1: Tests Unitarios - User Queries
- **Archivo**: `application-base/src/lib/prisma/user-queries.test.ts` (nuevo)
- **Descripción**: Tests para funciones de perfil y contraseña
- **Dependencias**: Tareas 1.1, 1.2
- **Estimado**: 45 min

**Casos de prueba**:
- getUserProfile retorna datos correctos
- updateUserProfile actualiza correctamente
- changeUserPassword valida contraseña actual
- changeUserPassword rechaza contraseña incorrecta
- userHasCredentials detecta OAuth vs credentials

---

#### ✅ Tarea 4.2: Tests de Integración - API Routes
- **Archivo**: `application-base/src/app/api/user/profile/route.test.ts` (nuevo)
- **Descripción**: Tests para endpoints de perfil
- **Dependencias**: Tareas 1.4, 1.5, 1.6
- **Estimado**: 45 min

**Casos de prueba**:
- GET /api/user/profile requiere autenticación
- PATCH /api/user/profile actualiza correctamente
- POST /api/user/change-password valida contraseña
- Validaciones Zod funcionan correctamente

---

#### ✅ Tarea 4.3: Testing Manual de UI
- **Descripción**: Verificar funcionamiento completo en navegador
- **Dependencias**: Todas las tareas de Fase 2
- **Estimado**: 30 min

**Checklist**:
- [ ] Formulario de perfil carga datos correctamente
- [ ] Actualización de nombre/apellido funciona
- [ ] Email se muestra como readonly
- [ ] Cambio de contraseña valida correctamente
- [ ] Validaciones Zod se muestran en UI
- [ ] Toast notifications aparecen
- [ ] Loading states funcionan
- [ ] Responsive en móvil funciona

---

## 📊 Estimaciones

### Tiempo Total Estimado

| Fase | Tareas | Tiempo Estimado |
|------|--------|-----------------|
| Fase 1: Backend (API) | 6 tareas | 125 min (~2h) |
| Fase 2: Frontend (UI) | 6 tareas | 160 min (~2.7h) |
| Fase 3: Mejoras (Opcional) | 4 tareas | 110 min (~1.8h) |
| Fase 4: Testing | 3 tareas | 120 min (~2h) |
| **TOTAL (Mínimo)** | **12 tareas** | **~4.7 horas** |
| **TOTAL (Completo)** | **19 tareas** | **~8.5 horas** |

### Distribución Sugerida

#### MVP (Mínimo Viable)
**Tiempo:** ~4.7 horas

- **Sesión 1** (2 horas): Fase 1 completa (Backend)
- **Sesión 2** (2.7 horas): Fase 2 completa (Frontend)

#### Producción (Completo + Mejoras)
**Tiempo:** ~8.5 horas

- **Sesión 1** (2 horas): Fase 1 (Backend)
- **Sesión 2** (2.7 horas): Fase 2 (Frontend)
- **Sesión 3** (1.8 horas): Fase 3 (Mejoras de seguridad)
- **Sesión 4** (2 horas): Fase 4 (Testing)

---

## ✅ Criterios de Aceptación

### Funcionales

1. ⏳ El usuario puede acceder a `/settings` desde el menú
2. ⏳ El usuario puede ver su información personal
3. ⏳ El usuario puede actualizar su nombre y apellido
4. ⏳ El email se muestra pero NO es editable
5. ⏳ Usuarios con credentials pueden cambiar su contraseña
6. ⏳ Usuarios con OAuth ven mensaje explicativo (no pueden cambiar contraseña)
7. ⏳ La contraseña actual se valida antes de cambiar
8. ⏳ Las validaciones de contraseña funcionan (8 chars, mayúscula, número, especial)
9. ⏳ Los cambios se reflejan inmediatamente en la UI
10. ⏳ Se muestran notificaciones de éxito/error

### Técnicos

1. ⏳ Solo el usuario puede editar su propio perfil
2. ⏳ Todas las operaciones requieren sesión activa
3. ⏳ Las contraseñas se hashean con bcrypt
4. ⏳ Los endpoints validan datos con Zod
5. ⏳ Los errores se manejan correctamente
6. ⏳ Los formularios usan react-hook-form
7. ⏳ La página es responsive (móvil y desktop)

### UX

1. ⏳ Los formularios muestran validaciones en tiempo real
2. ⏳ Los botones muestran loading state durante operaciones
3. ⏳ Toast notifications claras y descriptivas
4. ⏳ Los formularios se resetean después de operaciones exitosas
5. ⏳ El diseño es consistente con el resto de la aplicación

---

## 🚨 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Usuario pierde contraseña nueva | Media | Alto | Validar confirmación de contraseña |
| Intentos de fuerza bruta | Media | Alto | Implementar rate limiting (Tarea 3.4) |
| Sesiones activas tras cambio | Baja | Medio | Logout de otras sesiones (Tarea 3.3) |
| Validación de contraseña débil | Baja | Medio | Requisitos estrictos con Zod |
| Usuarios OAuth confundidos | Media | Bajo | Mensaje claro explicando limitación |

---

## 📝 Notas Adicionales

### Extensiones Futuras (Post-MVP)

1. **Upload de Avatar**: Permitir cambiar imagen de perfil
2. **Verificación de Email**: Flujo para verificar email
3. **2FA (Two-Factor Auth)**: Autenticación de dos factores
4. **Historial de Actividad**: Log de cambios de perfil
5. **Preferencias**: Idioma, zona horaria, notificaciones
6. **Eliminar Cuenta**: Opción de auto-eliminación

### Dependencias Externas

- `react-hook-form`: Para manejo de formularios ✅ (ya instalado)
- `zod`: Para validaciones ✅ (ya instalado)
- `@hookform/resolvers`: Para integrar Zod con react-hook-form ✅ (ya instalado)
- `bcrypt`: Para hash de contraseñas ✅ (ya instalado)
- `lucide-react`: Para iconos ✅ (ya instalado)

### Seguridad

**Importante para Producción:**
1. ✅ Implementar rate limiting (Tarea 3.4)
2. ✅ Logout de otras sesiones al cambiar contraseña (Tarea 3.3)
3. ⚠️ Considerar agregar verificación por email antes de cambiar contraseña
4. ⚠️ Considerar agregar log de auditoría para cambios de perfil
5. ⚠️ Considerar agregar CAPTCHA para cambio de contraseña

---

## 🎯 Próximos Pasos

Una vez aprobado este plan:

1. ⏳ Confirmar alcance (MVP vs Completo)
2. ⏳ Iniciar implementación por fases
3. ⏳ Hacer commits incrementales por tarea
4. ⏳ Testing continuo durante implementación
5. ⏳ Documentar cualquier desviación del plan

---

## 📋 Checklist de Implementación

### Fase 1: Backend ✅ / ❌
- [ ] Tarea 1.1: Query - Obtener perfil
- [ ] Tarea 1.2: Query - Cambiar contraseña
- [ ] Tarea 1.3: Validaciones Zod
- [ ] Tarea 1.4: API - GET perfil
- [ ] Tarea 1.5: API - PATCH perfil
- [ ] Tarea 1.6: API - POST cambiar contraseña

### Fase 2: Frontend ✅ / ❌
- [ ] Tarea 2.1: Tipos TypeScript
- [ ] Tarea 2.2: Formulario de perfil
- [ ] Tarea 2.3: Formulario de contraseña
- [ ] Tarea 2.4: Información de cuenta
- [ ] Tarea 2.5: Página de settings
- [ ] Tarea 2.6: Link en sidebar

### Fase 3: Mejoras (Opcional) ✅ / ❌
- [ ] Tarea 3.1: Indicador de fuerza
- [ ] Tarea 3.2: Confirmación modal
- [ ] Tarea 3.3: Logout otras sesiones
- [ ] Tarea 3.4: Rate limiting

### Fase 4: Testing ✅ / ❌
- [ ] Tarea 4.1: Tests unitarios
- [ ] Tarea 4.2: Tests integración
- [ ] Tarea 4.3: Testing manual UI

---

**Estado**: 🔴 Pendiente de inicio
**Última Actualización**: 2025-11-04
**Autor**: Claude Code + Rex2002xp
