# Plan de Ejecución - Fase 5: Auditoría y Organización de Plantillas Mustache

**Proyecto:** Aurora Nova - Application Base
**Fecha:** 2025-12-04
**Fase:** 5 - Auditoría y Organización de Plantillas Mustache
**Estado:** Iniciando
**Base Branch:** main
**Rama de Trabajo:** feature/fase-5-mustache-templates

---

## 1. Resumen Ejecutivo

### Objetivo
Realizar una auditoría completa de las plantillas Mustache del sistema, validar variables disponibles, documentar su uso, reorganizar por contexto de uso (admin), y preparar la estructura para futuros contextos (customer, public).

### Alcance
- **4 plantillas Mustache** de email existentes
- Auditoría de variables utilizadas vs. variables disponibles
- Validación de contextos de uso
- Documentación de estructura y variables
- **Reorganización por contextos** (admin, customer, public)
- Testing de generación de emails

### Ubicación Actual
```
/application-base/templates/
└── email/
    ├── welcome.mustache
    ├── password-reset.mustache
    ├── password-changed.mustache
    └── login-notification.mustache
```

### Nueva Estructura
```
/application-base/templates/
├── admin/
│   └── email/
│       ├── welcome.mustache           (para admin)
│       ├── password-reset.mustache    (para admin)
│       ├── password-changed.mustache  (para admin)
│       └── login-notification.mustache (para admin)
├── customer/
│   └── email/
│       └── (futuro - para usuarios customer)
├── public/
│   └── email/
│       └── (futuro - para sitio público)
└── README.md (documentación general)
```

**Beneficio:** Estructura clara que permite agregar contextos adicionales fácilmente.

---

## 2. Audit Inicial de Plantillas

### 2.1 Plantilla: welcome.mustache (3.5 KB)

**Propósito:** Email de bienvenida para nuevos usuarios en área admin

**Variables Utilizadas:**
- `{{appName}}` - Nombre de la aplicación
- `{{firstName}}` - Nombre del usuario
- `{{hasFirstName}}` - Flag condicional para nombre disponible
- `{{appUrl}}` - URL base de la aplicación
- `{{supportEmail}}` - Email de soporte

**Análisis:**
- ✅ Variables bien nombradas
- ✅ Lógica condicional clara con `{{#hasFirstName}}`
- ✅ HTML responsive inline
- ✅ Estilos incrustados (buena práctica para emails)
- ⚠️ URL hardcodeada: `/dashboard` (línea 124) - debería ser `/admin/dashboard`

**Contexto de Uso:**
- Se envía cuando un usuario admin es creado exitosamente
- Requiere datos del usuario (firstName, email)
- Requiere configuración de app (appName, appUrl, supportEmail)

### 2.2 Plantilla: password-reset.mustache (1.1 KB)

**Propósito:** Email para reset de contraseña

**Variables Utilizadas:**
- `{{appName}}` - Nombre de la aplicación
- `{{resetLink}}` - Link con token de reset
- `{{expirationTime}}` - Tiempo de expiración del token

**Análisis:**
- ✅ Variables claras y específicas
- ✅ Mensaje conciso
- ⚠️ Falta contexto del usuario (firstName, email)
- ⚠️ Estructura HTML más simple (verificar si cumple estándares de email)
- ⚠️ No hay variable de configuración APP_URL (link es absoluto en `resetLink`)

**Contexto de Uso:**
- Se envía cuando usuario solicita reset de contraseña
- Requiere token temporal con seguridad
- Requiere URL segura con token incluido

### 2.3 Plantilla: password-changed.mustache (2.8 KB)

**Propósito:** Notificación de cambio de contraseña

**Variables Utilizadas:**
- `{{appName}}` - Nombre de la aplicación
- `{{firstName}}` - Nombre del usuario
- `{{hasFirstName}}` - Flag condicional
- `{{changeTime}}` - Fecha/hora del cambio
- `{{supportEmail}}` - Email de soporte
- `{{appUrl}}` - URL base de la aplicación

**Análisis:**
- ✅ Variables bien estructuradas
- ✅ Mensaje de seguridad relevante
- ✅ Incluye footer con contacto de soporte
- ⚠️ Variable `changeTime` sin formato especificado (¿ISO? ¿Local?)
- ⚠️ Estructura similar a welcome.mustache (considerar abstracción)

**Contexto de Uso:**
- Se envía después de cambio exitoso de contraseña
- Confirmación de seguridad al usuario
- Información de soporte incluida

### 2.4 Plantilla: login-notification.mustache (2.4 KB)

**Propósito:** Notificación de login exitoso

**Variables Utilizadas:**
- `{{appName}}` - Nombre de la aplicación
- `{{firstName}}` - Nombre del usuario
- `{{hasFirstName}}` - Flag condicional
- `{{loginTime}}` - Fecha/hora del login
- `{{ipAddress}}` - IP desde la que se logueó
- `{{userAgent}}` - Browser/dispositivo
- `{{supportEmail}}` - Email de soporte

**Análisis:**
- ✅ Información de seguridad completa (IP, UA)
- ✅ Ayuda a detectar logins sospechosos
- ⚠️ Variable `loginTime` sin formato especificado
- ⚠️ `userAgent` muy largo, podría quebrar layout
- ⚠️ No hay link a settings de seguridad

**Contexto de Uso:**
- Se envía después de cada login exitoso en área admin
- Información de auditoría para el usuario
- Alerta de seguridad

---

## 3. Inventario de Variables Globales

### Variables de Configuración (Environment / App Config)

Estas variables deben estar disponibles cuando se renderizan las plantillas:

```typescript
// Desde variables de entorno o configuración
APP_NAME: "Aurora Nova"
APP_URL: "http://localhost:3000" o "https://aurora.nova.local"
SUPPORT_EMAIL: "soporte@aurora.nova.local"
```

### Variables del Usuario (User Context)

```typescript
// Del objeto usuario de sesión
firstName?: string
email: string
// Derivadas
hasFirstName: boolean (firstName && firstName.length > 0)
```

### Variables de Acción/Evento

```typescript
// Del evento que dispara el email

// Reset Password
resetLink: string (con token incluido)
expirationTime: string (ISO o formateado)

// Change Password / Login
changeTime?: string | Date
loginTime?: string | Date

// Login Notification
ipAddress?: string
userAgent?: string
```

---

## 4. Análisis de Uso (Dónde se envían los emails)

### 4.1 Buscar Referencias a las Plantillas

**Tarea:** Identificar dónde en el código se renderizan estas plantillas

```bash
grep -r "welcome.mustache" src/
grep -r "password-reset.mustache" src/
grep -r "password-changed.mustache" src/
grep -r "login-notification.mustache" src/

# O buscar por la función que las usa (ej: renderTemplate, sendEmail)
grep -r "renderTemplate\|mustache\|handlebar" src/
```

### 4.2 Servicios de Email Esperados

Buscar archivos de servicio de email:

```bash
find src/ -name "*email*" -o -name "*mail*" -o -name "*notification*" | grep -E "\.(ts|tsx|js)$"
```

---

## 5. Plan de Validación

### 5.1 Validación de Plantillas

**Checklist por plantilla:**

```
welcome.mustache:
  ☐ Verificar que todas las variables están documentadas
  ☐ Verificar URL destino (/admin/dashboard es correcto)
  ☐ Probar con y sin firstName
  ☐ Validar HTML responsive
  ☐ Probar rendering en email client

password-reset.mustache:
  ☐ Verificar que resetLink es construido correctamente
  ☐ Verificar que expirationTime está formateado
  ☐ Validar que el token es seguro en la URL
  ☐ Probar rendering en email client

password-changed.mustache:
  ☐ Verificar que changeTime está formateado (¿timezone?)
  ☐ Verificar que supportEmail está presente
  ☐ Probar con y sin firstName
  ☐ Validar HTML responsive

login-notification.mustache:
  ☐ Verificar que loginTime está formateado
  ☐ Verificar que ipAddress se captura correctamente
  ☐ Verificar que userAgent se trunca si es muy largo
  ☐ Probar rendering
```

### 5.2 Documentación de Variables

**Crear archivo:** `/application-base/docs/templates/VARIABLES.md`

Documentar cada variable global y cómo usarla en plantillas.

### 5.3 Testing

**Crear suite de tests:** `/application-base/src/__tests__/templates/`

Tests para:
- Verificar que todas las variables requeridas están presentes
- Verificar que la plantilla se renderiza sin errores
- Verificar que los valores se interpolan correctamente
- Verificar casos edge (firstName vacío, especialistas, etc.)

---

## 6. Etapas de Ejecución

### Etapa 1: Auditoría Completa (Sin cambios en código)

**1.1 Leer todas las plantillas y documentar**
- Listar variables utilizadas en cada una
- Verificar que variables están en contexto
- Documentar propósito y flujo de cada plantilla

**1.2 Buscar código que usa las plantillas**
- Grep para encontrar `renderTemplate`, `mustache`, etc.
- Identificar servicios de email
- Documentar cómo se construyen las variables

**1.3 Crear matriz de auditoría**
- Tabla: Plantilla → Variables → Contexto → Status

### Etapa 2: Reorganización de Estructura

**2.1 Crear nueva estructura de carpetas**
```bash
mkdir -p src/app/admin/templates/email
mkdir -p src/app/customer/templates/email
mkdir -p src/app/public/templates/email
```

**2.2 Mover archivos con git mv**
```bash
git mv templates/email/welcome.mustache templates/admin/email/welcome.mustache
git mv templates/email/password-reset.mustache templates/admin/email/password-reset.mustache
git mv templates/email/password-changed.mustache templates/admin/email/password-changed.mustache
git mv templates/email/login-notification.mustache templates/admin/email/login-notification.mustache
```

**2.3 Eliminar carpeta vacía**
```bash
rmdir templates/email/
```

**2.4 Crear .gitkeep para contextos futuros**
```bash
touch templates/customer/email/.gitkeep
touch templates/public/email/.gitkeep
```

### Etapa 3: Documentación

**3.1 Crear documento de variables** (`docs/templates/VARIABLES.md`)
- Explicar cada variable
- Mostrar formato esperado
- Mostrar ejemplos

**3.2 Crear README** (`templates/README.md`)
- Estructura de plantillas por contextos
- Cómo usar cada una
- Qué variables pasa cada servicio
- Guía para agregar nuevas plantillas

**3.3 Crear README específico por contexto** (`templates/admin/README.md`)
- Plantillas disponibles en contexto admin
- Ejemplos de uso

**3.4 Documentar en código** (JSDoc)
- Comentarios en servicios de email
- Tipos TypeScript para contexto de email

### Etapa 4: Validación y Fixes

**4.1 Validar URLs**
- ✅ Corregir `/dashboard` a `/admin/dashboard` en welcome.mustache
- Verificar que resetLink es construcción correcta

**4.2 Validar formatos de fecha**
- Documentar timezone esperada
- Verificar ISO 8601 vs. formato local

**4.3 Validar HTML**
- Verificar responsive design
- Probar en email clients (Litmus, Email on Acid)

### Etapa 5: Testing (Opcional)

**5.1 Crear test suite** (`src/__tests__/templates/`)
- Tests de rendering de Mustache
- Tests de validación de variables
- Tests de casos edge

**5.2 Crear helpers de testing**
- Mock de context de usuario
- Mock de configuración
- Helper para renderizar plantillas

**5.3 Ejecutar tests**
- Todos los tests pasen
- Coverage de variables completo

### Etapa 6: Commit y Merge

**6.1 Commit de auditoría**
```bash
git commit -m "docs(templates): Auditoría completa de plantillas Mustache

- Documentar todas las variables utilizadas en cada plantilla
- Crear matriz de auditoría
- Identificar gaps en variables o contexto
- Documentar ubicación de código que usa plantillas
"
```

**6.2 Commit de reorganización**
```bash
git commit -m "refactor(templates): Reorganizar plantillas por contexto (admin/customer/public)

- Mover plantillas de email a templates/admin/email/
- Crear estructura para futuros contextos (customer, public)
- Agregar .gitkeep para directorios vacíos
- Mantener historial de commits con git mv
"
```

**6.3 Commit de documentación**
```bash
git commit -m "docs(templates): Crear documentación completa de plantillas Mustache

- Crear docs/templates/VARIABLES.md con guía de variables
- Crear templates/README.md con estructura general
- Crear templates/admin/README.md con guía específica
- Documentar cada plantilla: propósito, variables, contexto
"
```

**6.4 Commit de fixes (si hay)**
```bash
git commit -m "fix(templates): Corregir URLs y formatos en plantillas

- Actualizar URL /dashboard a /admin/dashboard en welcome.mustache
- Documentar formato esperado de fechas (ISO 8601)
- Validar longitud de userAgent en plantillas
"
```

**6.5 Commit de tests (si hay)**
```bash
git commit -m "test(templates): Crear suite de tests para plantillas Mustache

- Agregar tests de rendering de plantillas
- Validar variables requeridas vs. disponibles
- Tests de casos edge (firstName vacío, caracteres especiales, etc.)
"
```

**6.6 PR a main**
```bash
git push origin feature/fase-5-mustache-templates
# Crear PR con resumen de auditoría y documentación
```

---

## 7. Checklist de Ejecución

### Pre-ejecución
- [ ] Rama `feature/fase-5-mustache-templates` creada
- [ ] Plan aprobado por usuario ✅

### Auditoría
- [ ] Leer las 4 plantillas
- [ ] Documentar variables por plantilla
- [ ] Identificar código que usa las plantillas
- [ ] Crear matriz de auditoría

### Reorganización
- [ ] Crear estructura de carpetas por contexto
- [ ] Mover archivos con `git mv`
- [ ] Crear `.gitkeep` para directorios vacíos
- [ ] Verificar que estructura esté correcta

### Documentación
- [ ] Crear `docs/templates/VARIABLES.md`
- [ ] Crear `templates/README.md`
- [ ] Crear `templates/admin/README.md`
- [ ] Documentar cada plantilla

### Validación
- [ ] Verificar URLs
- [ ] Verificar formatos de fecha
- [ ] Verificar HTML responsive
- [ ] Validar estructura

### Testing (Opcional según auditoría)
- [ ] Crear test suite
- [ ] Escribir tests de rendering
- [ ] Escribir tests de variables
- [ ] Todos los tests pasen

### Commits
- [ ] Commit de auditoría
- [ ] Commit de reorganización
- [ ] Commit de documentación
- [ ] Commits de fixes (si hay)
- [ ] Commit de tests (si hay)

### Merge
- [ ] PR creada
- [ ] Revisión de cambios
- [ ] Merge a main
- [ ] Verificar en main

---

## 8. Decisiones Implementadas

1. **Estructura de carpetas:** ✅ `/templates/admin/email` (contextual)
2. **Futuros contextos:** ✅ Estructura lista para `/templates/customer/` y `/templates/public/`
3. **Cambiar URLs:** ✅ `/dashboard` → `/admin/dashboard`
4. **Crear tests:** A decidir después de auditoría

---

## 9. Notas Adicionales

- Las plantillas Mustache se usan para emails en área admin
- También se pueden usar para SMS (futuro)
- Considerar i18n (internacionalización) en el futuro
- Las plantillas están en `/templates/` fuera del código fuente principal
- NextAuth.js puede tener integration points para emails de reset
- La estructura permite agregar contextos fácilmente (customer, public)

---

**Fin del Plan - Fase 5 - Inicial**

Siguientes pasos: Iniciar Etapa 1 (Auditoría Completa)
