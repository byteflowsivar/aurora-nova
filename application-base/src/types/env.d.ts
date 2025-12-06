/**
 * Declaraciones de Variables de Entorno - Aurora Nova
 *
 * Define tipos TypeScript para todas las variables de entorno usadas en la aplicación.
 * Proporciona autocompletar y validación en tiempo de compilación para `process.env`.
 *
 * **Estructura**:
 * - `declare namespace NodeJS`: Extiende tipos de Node.js
 * - `interface ProcessEnv`: Define todas las env vars disponibles
 *
 * **Beneficios**:
 * - ✓ Autocompletar en `process.env.VARIABLE_NAME`
 * - ✓ Validación de tipos: error si intenta acceder a var inexistente
 * - ✓ Documentación centralizada de todas las env vars
 * - ✓ Facilita refactorización y cambios
 *
 * **Variables Requeridas vs Opcionales**:
 * - Sin `?`: Requerida (debe estar en .env)
 * - Con `?`: Opcional (puede estar ausente)
 *
 * **Cómo Usar**:
 * ```typescript
 * const dbUrl = process.env.DATABASE_URL  // ✓ Type-safe
 * const apiKey = process.env.NONEXISTENT  // ✗ Error de compilación
 * ```
 *
 * @module types/env
 * @see {@link .env.example} para template de variables
 * @see {@link ../lib/config} para parsed env variables
 */

declare namespace NodeJS {
  /**
   * Variables de Entorno de Aurora Nova
   *
   * Define todas las env vars disponibles en la aplicación.
   * Agrupadas por funcionalidad para mejor organización.
   *
   * @interface ProcessEnv
   */
  interface ProcessEnv {
    // ====================================================================
    // BASE DE DATOS
    // ====================================================================
    /**
     * URL de conexión a la base de datos
     *
     * **Formato**: `postgresql://user:password@host:port/database`
     *
     * **Requerida**: SÍ (sin valor causa error en startup)
     *
     * **Usado para**:
     * - Conectar a PostgreSQL
     * - Migraciones de Prisma
     * - Consultas de datos
     *
     * **Ejemplo**:
     * ```
     * DATABASE_URL=postgresql://aurora:password@localhost:5432/aurora_nova_db
     * ```
     *
     * @type {string}
     * @required
     */
    DATABASE_URL: string;

    // ====================================================================
    // AUTENTICACIÓN
    // ====================================================================
    /**
     * Secret para firmar JWT y sesiones de NextAuth
     *
     * **Generación**:
     * ```bash
     * openssl rand -base64 32
     * ```
     *
     * **Requerida**: SÍ (crítica para seguridad)
     *
     * **Notas**:
     * - Cambiar en cada environment (dev/staging/prod)
     * - Nunca compartir
     * - Usada por NextAuth para firmar cookies y JWT
     * - Si cambia, todos los JWT existentes se invalidan
     *
     * **Mínimo 32 caracteres** (recomendado 64)
     *
     * @type {string}
     * @required
     */
    AUTH_SECRET: string;

    /**
     * URL base de la aplicación para NextAuth
     *
     * **Formato**: `http://localhost:3000` (dev) o `https://app.com` (prod)
     *
     * **Requerida**: SÍ (necesaria para redirecciones de OAuth)
     *
     * **Notas**:
     * - Debe coincidir con URL real de la app
     * - Sin trailing slash
     * - Usada para generar callback URLs en OAuth providers
     * - En desarrollo: `http://localhost:3000`
     * - En producción: `https://tudominio.com`
     *
     * @type {string}
     * @required
     */
    NEXTAUTH_URL: string;

    // ====================================================================
    // APLICACIÓN
    // ====================================================================
    /**
     * Ambiente de ejecución
     *
     * **Valores posibles**:
     * - `development`: Desarrollo local (logs verbose, sin optimizaciones)
     * - `production`: Producción (logs mínimos, optimizaciones máximas)
     * - `test`: Testing automatizado (sin real I/O)
     *
     * **Requerida**: SÍ (default en Node: "production")
     *
     * **Afecta**:
     * - Nivel de logging
     * - Validaciones y manejo de errores
     * - Performance y caching
     * - Comportamiento de librerías (Next.js, Prisma, etc)
     *
     * @type {'development' | 'production' | 'test'}
     * @required
     */
    NODE_ENV: 'development' | 'production' | 'test';

    /**
     * Nombre de la aplicación
     *
     * **Requerida**: SÍ
     *
     * **Usado en**:
     * - Emails (From header)
     * - Logs (prefijo de contexto)
     * - UI (página de error, etc)
     *
     * **Ejemplo**: `Aurora Nova`
     *
     * @type {string}
     * @required
     */
    APP_NAME: string;

    /**
     * URL base de la aplicación
     *
     * **Formato**: URL completa sin trailing slash
     *
     * **Requerida**: SÍ
     *
     * **Usado para**:
     * - Generar links en emails
     * - Redirecciones after auth
     * - API calls desde cliente
     *
     * **Ejemplo**:
     * - Dev: `http://localhost:3000`
     * - Prod: `https://auroranowa.com`
     *
     * @type {string}
     * @required
     */
    APP_URL: string;

    // ====================================================================
    // LOGGING
    // ====================================================================
    /**
     * Nivel de logging
     *
     * **Valores posibles**:
     * - `debug`: Todos los logs (muy verbose)
     * - `info`: Logs informativos (recomendado para prod)
     * - `warn`: Solo warnings y errores
     * - `error`: Solo errores
     *
     * **Requerida**: NO (default: 'info')
     *
     * **Notas**:
     * - En desarrollo: usar `debug` o `info`
     * - En producción: usar `info` o `warn`
     * - Cambios require reinicio del servidor
     *
     * @type {'debug' | 'info' | 'warn' | 'error'}
     * @optional
     */
    LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';

    // ====================================================================
    // EMAIL - GMAIL
    // ====================================================================
    /**
     * Email de Gmail para envío
     *
     * **Requerida**: NO (solo si usas Gmail)
     *
     * **Formato**: Email Gmail válido
     *
     * **Configuración**:
     * 1. Habilitar 2FA en Google Account
     * 2. Generar App Password en myaccount.google.com/apppasswords
     * 3. Guardar en GMAIL_USER y GMAIL_APP_PASSWORD
     *
     * **Nota**: NO es la contraseña de Gmail, es contraseña de app (16 chars)
     *
     * **Límites**:
     * - 500 emails/día desde aplicación
     * - No es para marketing masivo
     *
     * **Ejemplo**: `noreply@tudominio.com`
     *
     * @type {string}
     * @optional
     * @see {@link GMAIL_APP_PASSWORD}
     */
    GMAIL_USER?: string;

    /**
     * Contraseña de App de Gmail
     *
     * **Requerida**: NO (solo si GMAIL_USER está presente)
     *
     * **Generación**:
     * 1. Google Account → Security
     * 2. App passwords → Mail + Windows Computer
     * 3. Google genera 16 caracteres (xxxx xxxx xxxx xxxx)
     * 4. Guardar sin espacios: GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
     *
     * **Seguridad**:
     * - NO es la contraseña de Gmail
     * - Específica para esta app
     * - Puede revocar sin cambiar Gmail password
     * - Guardar en .env.local (nunca en git)
     *
     * **Notas**:
     * - Caracteres de espacios (xxxx xxxx) se ignoran
     * - Si no funciona, regenerar desde Google
     *
     * @type {string}
     * @optional
     * @see {@link GMAIL_USER}
     */
    GMAIL_APP_PASSWORD?: string;

    // ====================================================================
    // EMAIL - SMTP GENÉRICO
    // ====================================================================
    /**
     * Host SMTP para email genérico
     *
     * **Requerida**: NO (solo si usas SMTP)
     *
     * **Ejemplos**:
     * - SendGrid: `smtp.sendgrid.net`
     * - Mailgun: `smtp.mailgun.org`
     * - AWS SES: `email-smtp.us-east-1.amazonaws.com`
     * - Propio: `mail.tudominio.com`
     *
     * **Notas**:
     * - Requerida si quieres usar SMTP (sin GMAIL_USER)
     * - Junto con SMTP_USER y SMTP_PASS forma configuración completa
     * - Puerto 465 (TLS) o 587 (STARTTLS)
     *
     * @type {string}
     * @optional
     * @see {@link SMTP_PORT}, {@link SMTP_USER}, {@link SMTP_PASS}
     */
    SMTP_HOST?: string;

    /**
     * Puerto SMTP
     *
     * **Requerida**: NO (default: 465)
     *
     * **Valores comunes**:
     * - `465`: SSL/TLS (recomendado)
     * - `587`: STARTTLS
     * - `25`: SMTP plano (no recomendado, spam filter)
     *
     * **Puerto 465 vs 587**:
     * - 465: Conexión encriptada desde inicio
     * - 587: Inicia plano, luego STARTTLS
     * - Sistema auto-detecta: 465 = secure, otros = STARTTLS
     *
     * **Ejemplo**: `587`
     *
     * @type {string}
     * @optional
     * @default "465"
     */
    SMTP_PORT?: string;

    /**
     * Usuario SMTP
     *
     * **Requerida**: NO (solo si usas SMTP)
     *
     * **Formato depende del proveedor**:
     * - SendGrid: `apikey`
     * - Mailgun: `postmaster@sandbox.mailgun.org`
     * - AWS SES: `SMTP_USERNAME`
     * - Genérico: email del remitente
     *
     * **Notas**:
     * - NO es usuario de Gmail (ver GMAIL_USER)
     * - Específico de cada proveedor SMTP
     *
     * @type {string}
     * @optional
     */
    SMTP_USER?: string;

    /**
     * Contraseña SMTP
     *
     * **Requerida**: NO (solo si usas SMTP)
     *
     * **Formato depende del proveedor**:
     * - SendGrid: API key (SG.xxxxx)
     * - Mailgun: API key (key-xxxxx)
     * - AWS SES: SMTP password
     * - Genérico: contraseña del servidor
     *
     * **Seguridad**:
     * - Guardar en .env.local
     * - Nunca en git
     * - Usar API keys, no contraseñas reales
     *
     * @type {string}
     * @optional
     */
    SMTP_PASS?: string;

    /**
     * Email remitente (From) para SMTP
     *
     * **Requerida**: NO (opcional, default: SMTP_USER)
     *
     * **Formato**: Email válido (noreply@example.com)
     *
     * **Notas**:
     * - Puede ser diferente a SMTP_USER
     * - El que aparecerá en "From" del email
     * - Algunos proveedores requieren que sea verified
     * - Si no especificado, usar SMTP_USER
     *
     * **Ejemplo**: `noreply@app.com`
     *
     * @type {string}
     * @optional
     */
    FROM_EMAIL?: string;
  }
}