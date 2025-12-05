# Plantillas Mustache - Aurora Nova

**Proyecto:** Aurora Nova
**Versión:** 1.0
**Última actualización:** 2025-12-04

---

## 📁 Estructura de Directorios

Las plantillas están organizadas por **contexto de uso** para facilitar expansión futura y mantener separadas las responsabilidades:

```
templates/
├── admin/                          # Plantillas para área administrativa
│   └── email/
│       ├── welcome.mustache        (Bienvenida a nuevo usuario admin)
│       ├── password-reset.mustache (Reset de contraseña)
│       ├── password-changed.mustache (Notificación de cambio de contraseña)
│       └── login-notification.mustache (Notificación de login)
│
├── customer/                       # Plantillas para usuarios clientes (futuro)
│   └── email/
│       └── .gitkeep                (Preparado para futuras plantillas)
│
├── public/                         # Plantillas para sitio público (futuro)
│   └── email/
│       └── .gitkeep                (Preparado para futuras plantillas)
│
└── README.md                       (Este archivo)
```

---

## 🎯 Contextos de Uso

### Admin Context (`/templates/admin/email/`)

Plantillas para emails enviados en el contexto **administrativo** de Aurora Nova.

**Usuarios**: Administradores del sistema y super administradores
**Función**: Gestión de usuarios, seguridad, notificaciones administrativas

**Plantillas disponibles:**

1. **welcome.mustache** - Bienvenida a nuevo usuario
   - Se envía cuando un nuevo usuario es creado
   - Incluye link al dashboard administrativo
   - Personalización con nombre del usuario

2. **password-reset.mustache** - Reset de contraseña
   - Se envía cuando usuario solicita reset
   - Incluye link seguro con token
   - Token expira en 30 minutos

3. **password-changed.mustache** - Notificación de cambio
   - Se envía después de cambio exitoso
   - Diferencia entre cambio por usuario vs. por admin
   - Incluye contacto de soporte

4. **login-notification.mustache** - Notificación de login
   - Se envía después de cada login
   - Incluye IP y detalles del navegador
   - Alerta de seguridad para logins sospechosos

### Customer Context (`/templates/customer/email/`)

**Estado**: 🚧 Preparado para futuro
**Usuarios**: Usuarios clientes de la plataforma
**Ejemplos de plantillas futuras**:
- Confirmación de cuenta
- Notificación de cambios en perfil
- Recordatorios de suscripción

### Public Context (`/templates/public/email/`)

**Estado**: 🚧 Preparado para futuro
**Usuarios**: Visitantes del sitio público
**Ejemplos de plantillas futuras**:
- Confirmación de registro en landing page
- Newsletter
- Notificación de demo

---

## 📖 Documentación

### Para Desarrolladores

1. **[VARIABLES.md](../docs/templates/VARIABLES.md)** - Guía completa de variables
   - Variables de configuración global
   - Variables de usuario
   - Variables específicas por tipo de email
   - Formatos requeridos (timestamps, URLs, emails)
   - Ejemplos de contexto completo

2. **[AUDIT.md](../docs/templates/AUDIT.md)** - Auditoría de plantillas
   - Análisis detallado de cada plantilla
   - Variables utilizadas vs. requeridas
   - Issues identificados y estado
   - Recomendaciones

### Para QA / Testing

**Email Preview:**
- Usar [Litmus](https://litmus.com/) o [Email on Acid](https://www.emailonacid.com/) para preview
- Validar responsive design en diversos clientes de email
- Testear con diferentes tamaños de pantalla

**Variables Edge Cases:**
- firstName vacío
- FirstName con caracteres especiales (ñ, á, ü, etc.)
- userAgent muy largo (truncar a 80 caracteres)
- IPv6 addresses

---

## 🚀 Cómo Usar

### 1. Renderizar una plantilla

```typescript
import Mustache from 'mustache';
import fs from 'fs';

// Leer plantilla
const template = fs.readFileSync('templates/admin/email/welcome.mustache', 'utf-8');

// Preparar contexto
const context = {
  appName: process.env.APP_NAME,
  firstName: user.firstName,
  hasFirstName: Boolean(user.firstName?.trim().length > 0),
  appUrl: process.env.APP_URL,
  supportEmail: process.env.SUPPORT_EMAIL
};

// Renderizar
const html = Mustache.render(template, context);
```

### 2. Enviar email

```typescript
// Ejemplo con servicio de email (ej: Nodemailer, SendGrid, etc.)
await emailService.send({
  to: user.email,
  subject: 'Bienvenido a Aurora Nova',
  html: html
});
```

### 3. Agregar nueva plantilla

```bash
# 1. Crear archivo en contexto apropriado
touch templates/admin/email/new-email.mustache

# 2. Definir variables en VARIABLES.md
# 3. Agregar ejemplos de uso
# 4. Crear tests
# 5. Documentar dónde se envía
```

---

## ✅ Checklist de Calidad

Antes de mergear cambios de plantillas:

```
Plantilla
  ☐ Archivo en directorio correcto (admin/customer/public)
  ☐ Nombre descriptivo (lowercase, dash-separated)
  ☐ HTML válido
  ☐ Responsive design
  ☐ Estilos incrustados (mejor para email clients)

Variables
  ☐ Todas documentadas en VARIABLES.md
  ☐ Requeridas vs. opcionales claramente indicadas
  ☐ Formatos especificados (timestamp ISO, URL absoluta, etc.)
  ☐ Restricciones documentadas (ej: mutuamente excluyentes)

Código
  ☐ Sintaxis Mustache correcta
  ☐ Sin hardcoding de valores que deberían ser variables
  ☐ Condicionales {{#if}} vs {{^if}} claros
  ☐ Comentarios en condicionales complejos

Testing
  ☐ Preview en email clients (Litmus/Email on Acid)
  ☐ Testear variables presentes y ausentes
  ☐ Testear valores muy largos (truncados)
  ☐ Tests automatizados de rendering

Documentación
  ☐ Actualizar VARIABLES.md
  ☐ Actualizar AUDIT.md
  ☐ Ejemplos de contexto en código
  ☐ Notas sobre dónde se envía

Performance
  ☐ Tamaño de archivo razonable (< 10KB)
  ☐ Imágenes optimizadas o externos
  ☐ Sin JavaScript (email clients no lo soportan)
```

---

## 📧 Servicio de Email Esperado

Las plantillas deben ser consumidas por un servicio centralizado de email.

**Interfaz esperada:**

```typescript
interface EmailService {
  send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;  // Versión plaintext
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
  }): Promise<{ success: boolean; messageId: string }>;
}

// Métodos específicos para cada tipo de email
async sendWelcomeEmail(user: User): Promise<void>
async sendPasswordResetEmail(user: User, resetLink: string): Promise<void>
async sendPasswordChangedEmail(user: User, changedByAdmin: boolean): Promise<void>
async sendLoginNotificationEmail(user: User, loginDetails: LoginDetails): Promise<void>
```

---

## 🔄 Versioning

Las plantillas siguen versionado semántico:

- **MAJOR**: Cambios en estructura de variables requeridas
- **MINOR**: Agregar variables opcionales, nuevas plantillas
- **PATCH**: Fixes de styling, correcciones de typos, reformatting

**Changelog:**

```
v1.0 (2025-12-04)
  - 4 plantillas de email para contexto admin
  - Reorganización por contextos (admin/customer/public)
  - Auditoría completa y documentación
  - Fix: URL hardcodeada en welcome.mustache (/dashboard → /admin/dashboard)
```

---

## 🚧 Roadmap

### Corto Plazo (Próximas iteraciones)
- [ ] Refactorizar password-reset para incluir appName como variable
- [ ] Tests automatizados de rendering de plantillas
- [ ] Servicio centralizado de email
- [ ] Preview de emails en development

### Mediano Plazo
- [ ] Plantillas para contexto customer
- [ ] Plantillas para sitio público
- [ ] Internacionalización (i18n) - español/inglés
- [ ] Validación de variables en compilación

### Largo Plazo
- [ ] SMS templates (Twilio, etc.)
- [ ] Push notifications templates
- [ ] Webhooks para eventos de email
- [ ] Dashboard de estadísticas de email

---

## 📞 Contacto y Soporte

Para preguntas o cambios a las plantillas:

1. Revisar [VARIABLES.md](../docs/templates/VARIABLES.md) para documentación de variables
2. Revisar [AUDIT.md](../docs/templates/AUDIT.md) para análisis detallado
3. Abrir issue en repositorio con detalles específicos

---

**Fin de README - Plantillas Mustache v1.0**
