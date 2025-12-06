# Security Policy - Aurora Nova

**Última actualización**: December 5, 2025

---

## 🔒 Introducción

La seguridad es una prioridad fundamental en Aurora Nova. Este documento describe nuestras políticas de seguridad, vulnerabilidades soportadas y cómo reportar vulnerabilidades de manera responsable.

---

## 📋 Versiones Soportadas

| Versión | Estado | Soporte de Seguridad |
|---------|--------|----------------------|
| **v1.0.x** | Actual | ✅ Activo |
| **v0.9.x** | Anterior | ❌ No soportada |
| **< v0.9** | Antigua | ❌ No soportada |

- **v1.0.0** recibe parches de seguridad durante un mínimo de **12 meses**
- Cambios mayores de versión se realizan anualmente
- Recomendamos mantener tu instalación actualizada a la última versión

---

## 🛡️ Prácticas de Seguridad Implementadas

### 1. Autenticación y Autorización

**NextAuth.js v5** con JWT y sesiones en BD:
- ✅ **Hybrid strategy**: JWT para velocidad + sesiones en BD para revocación
- ✅ **Secure cookies**: httpOnly, Secure, SameSite=Strict
- ✅ **RBAC**: Roles y permisos granulares (patrón `módulo:acción`)
- ✅ **Session revocation**: Los administradores pueden revocar sesiones del servidor
- ✅ **Automatic logout**: Al cambiar contraseña, todas las otras sesiones se cierran
- ✅ **Password reset**: Tokens únicos con expiración de 24 horas

### 2. Validación de Entrada

- ✅ **Zod schemas**: Validación en tiempo de compilación y runtime
- ✅ **Type checking**: TypeScript strict mode en todo el código
- ✅ **SQL Injection prevention**: ORM (Prisma) con parámetros seguros
- ✅ **XSS prevention**: Sanitización automática en React
- ✅ **CSRF protection**: Tokens CSRF en formularios (NextAuth.js)

### 3. Base de Datos

- ✅ **PostgreSQL**: Base de datos relacional robusta
- ✅ **Prisma ORM**: Queries seguras sin riesgo de SQL injection
- ✅ **Bcryptjs**: Hashing de contraseñas con salt (10 rounds)
- ✅ **Índices únicos**: Email con constraint UNIQUE
- ✅ **Foreign keys**: Integridad referencial en relaciones
- ✅ **Migrations**: Control de versiones de BD

### 4. Comunicación

- ✅ **HTTPS requerido**: Solo en producción (enforced por servidor)
- ✅ **JWT signing**: Tokens firmados con secret seguro
- ✅ **Rate limiting**: Implementable en endpoints críticos
- ✅ **CORS**: Configurado para origen específico

### 5. Logging y Auditoría

- ✅ **Structured logging**: Pino con contexto completo (x-request-id)
- ✅ **Audit trail**: Registro automático de todas las acciones críticas
- ✅ **IP tracking**: User-Agent e IP registradas en sesiones
- ✅ **Non-repudiation**: Los usuarios no pueden negar sus acciones

### 6. Contraseñas

- ✅ **Bcryptjs hashing**: Algoritmo seguro con salt
- ✅ **Minimum requirements**: Configurables (actualmente no hay mínimo, recomendamos agregar)
- ✅ **Password reset**: Flujo seguro con tokens únicos
- ✅ **No plaintext storage**: Nunca se almacenan contraseñas en texto plano
- ✅ **Session revocation on change**: Cierre forzado de otras sesiones

### 7. Secretos y Variables

- ✅ **Environment variables**: Nunca en código
- ✅ **.env.local**: Gitignored automáticamente
- ✅ **NEXTAUTH_SECRET**: Requerido en producción
- ✅ **DATABASE_URL**: Nunca en commits
- ✅ **No secrets in logs**: Sanitización de output

---

## 🔑 Requisitos de Seguridad para Producción

Antes de desplegar a producción, asegúrate de:

### Ambiente
- [ ] `NEXTAUTH_SECRET` configurado (genera con: `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` correctamente configurado (https://tudominio.com)
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` apunta a base de datos segura
- [ ] Variables sensibles NO están en `.env` versionado

### Base de Datos
- [ ] PostgreSQL con contraseña fuerte
- [ ] Backups automáticos habilitados
- [ ] SSL/TLS para conexión remota
- [ ] Restricción de acceso por IP (firewall)
- [ ] Usuarios de BD con permisos limitados

### Servidor
- [ ] HTTPS habilitado con certificado válido
- [ ] Headers de seguridad configurados
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security`
- [ ] CORS configurado para dominios específicos (no `*`)
- [ ] Rate limiting habilitado en endpoints críticos

### Código
- [ ] Todas las dependencias actualizadas (`npm audit fix`)
- [ ] Build compilado sin warnings
- [ ] TypeScript strict mode habilitado
- [ ] Tests pasando
- [ ] Logs de aplicación no exponen información sensible

### Monitoreo
- [ ] Logs centralizados (Datadog, CloudWatch, etc)
- [ ] Alerts configuradas para errores críticos
- [ ] Health check `/api/public/health` funcionando
- [ ] Métricas de performance siendo recolectadas

---

## 🐛 Reportar Vulnerabilidades

Aurora Nova sigue el proceso de **Responsible Disclosure**. Si descubres una vulnerabilidad de seguridad:

### ⚠️ IMPORTANTE: No abras un issue público

Las vulnerabilidades de seguridad no deben ser reportadas en issues públicos. En su lugar:

1. **Envía un email** a: **security@example.com**
   - Reemplaza `example.com` con tu dominio real
   - Asunto: `[SECURITY] Aurora Nova Vulnerability Report`

2. **Información a incluir**:
   ```
   Tipo de vulnerabilidad: [ej. SQL Injection, XSS, Autenticación]
   Ubicación: [endpoint, archivo, línea si es posible]
   Descripción: [explicación clara del problema]
   Impacto: [qué se puede lograr con esta vulnerabilidad]
   Pasos para reproducir: [instrucciones claras]
   Prueba de concepto: [código si es posible]
   Versión afectada: [v1.0.0, etc]
   ```

3. **Timeline**:
   - Recibirás confirmación dentro de **48 horas**
   - Evaluación dentro de **7 días**
   - Parche dentro de **14 días** (si es crítico, más rápido)
   - Divulgación pública después de que el parche esté disponible

4. **Atribución**:
   - Reconocimiento público en SECURITY.md (si lo deseas)
   - Mención en RELEASE_NOTES.md del parche
   - Puedes solicitar confidencialidad

---

## 🔍 Medidas de Mitigación Contra Ataques Comunes

### SQL Injection
- ✅ Prisma ORM con parámetros seguros
- ✅ Validación con Zod antes de queries
- ✅ Nunca concatenación de SQL

### Cross-Site Scripting (XSS)
- ✅ React sanitiza automáticamente
- ✅ Content Security Policy headers
- ✅ No usar `dangerouslySetInnerHTML`

### Cross-Site Request Forgery (CSRF)
- ✅ NextAuth.js incluye CSRF tokens automáticamente
- ✅ SameSite cookies en todas las cookies

### Broken Authentication
- ✅ NextAuth.js v5 (industria-estándar)
- ✅ JWT + sesiones en BD
- ✅ Validación en cada request
- ✅ Expiración de sesiones

### Broken Access Control
- ✅ RBAC granular
- ✅ Middleware de autenticación
- ✅ Validación en API routes
- ✅ Auditoría de accesos

### Sensitive Data Exposure
- ✅ HTTPS obligatorio en producción
- ✅ Contraseñas hasheadas con bcryptjs
- ✅ No secrets en logs
- ✅ Campos sensibles no retornados en APIs

### XML External Entities (XXE)
- ✅ No se procesan archivos XML en v1.0.0

### Broken Object Level Access Control
- ✅ Validación de propiedad de recurso
- ✅ Verificación de permisos antes de retornar datos

### Using Components with Known Vulnerabilities
- ✅ `npm audit` ejecutado regularmente
- ✅ Dependencias actualizadas
- ✅ Renovabot o Dependabot habilitado

### Insufficient Logging & Monitoring
- ✅ Pino con structured logging
- ✅ Sistema de auditoría completo
- ✅ Correlación de requests con x-request-id

---

## 📚 Recursos de Seguridad

- **[OWASP Top 10](https://owasp.org/Top10/)**: 10 riesgos de seguridad más críticos
- **[NextAuth.js Security](https://authjs.dev/guides/basics/security)**: Guía de seguridad oficial
- **[Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client#security-best-practices)**: Mejores prácticas
- **[NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)**: Framework de ciberseguridad
- **[CWE Top 25](https://cwe.mitre.org/top25/)**: Debilidades más peligrosas

---

## 🔄 Actualizaciones de Seguridad

Aurora Nova publica actualizaciones de seguridad:

- **Críticas** (RCE, Authentication bypass): Dentro de 48 horas
- **Altas** (Data disclosure, CSRF): Dentro de 7 días
- **Medias** (Information leak): Dentro de 30 días
- **Bajas** (Best practices): Con siguiente release

---

## 📞 Contacto

- **Seguridad**: security@example.com
- **General**: support@example.com
- **Issues**: Usar sistema de issues para no-seguridad

---

## ✅ Checklist de Seguridad para Desarrolladores

Antes de hacer commit:

- [ ] No hay secretos en el código (API keys, passwords)
- [ ] Validación con Zod en todas las entradas
- [ ] Manejo de errores sin exponer stack traces
- [ ] Auditoría registrada para acciones críticas
- [ ] Permisos verificados en endpoints privados
- [ ] TypeScript no tiene `any` o `@ts-ignore`
- [ ] No hay `console.log` de datos sensibles
- [ ] Tests pasando sin warnings

---

**Aurora Nova Security Team**

*Última actualización: December 5, 2025*
*Próxima revisión: June 5, 2026*
