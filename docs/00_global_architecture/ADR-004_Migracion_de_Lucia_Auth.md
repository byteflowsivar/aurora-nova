# ADR-004: Migración de Lucia Auth por Deprecación

## 1. Título
Migración de Lucia Auth a Auth.js debido a la deprecación de Lucia v3

## 2. Estado
Propuesto

## 3. Contexto
Durante la implementación de la tarea T006 (configuración de Lucia Auth), se descubrió que **Lucia Auth v3 será deprecado en marzo de 2025**. Según el anuncio oficial del equipo de Lucia:

- El paquete NPM de Lucia será mantenido hasta marzo de 2025 (principalmente correcciones de bugs)
- Lucia se convertirá en un recurso educativo para implementar autenticación desde cero
- No habrá una versión v4, sino que recomiendan migrar a otras soluciones

Este desarrollo afecta directamente a **ADR-001**, donde se eligió Lucia Auth como la solución de autenticación para Aurora Nova.

## 4. Decisión
Se propone **migrar de Lucia Auth a Auth.js (NextAuth.js v5)** por las siguientes razones:

### Auth.js como Reemplazo
- **Madurez y Estabilidad**: Solución establecida y ampliamente adoptada en el ecosistema Next.js
- **Soporte Activo**: Desarrollo activo y comunidad robusta
- **Compatibilidad**: Funciona perfectamente con PostgreSQL y Drizzle ORM
- **Flexibilidad**: Permite control granular sobre sesiones y gestión de usuarios
- **Migración Gradual**: Posible migrar sin afectar el diseño de base de datos existente

### Alternativas Consideradas
1. **Clerk**: Solución managed, pero introduce dependencia externa y costos
2. **Supabase Auth**: Requiere cambios arquitecturales significativos
3. **Auth0**: Orientado a enterprise, sobrecomplejo para nuestras necesidades
4. **BetterAuth**: Muy nuevo, falta madurez en producción
5. **Implementación Custom**: Siguiendo las guías educativas de Lucia, pero requiere más tiempo de desarrollo

### Justificación de Auth.js
- **Alineación con ADR-001**: Mantiene los principios de control total sobre datos y lógica de autenticación
- **Compatibilidad con Stack**: Funciona perfectamente con Next.js 15, PostgreSQL 18+, Drizzle ORM
- **Esquema de BD Compatible**: Puede utilizar el esquema de tablas ya implementado con ajustes mínimos
- **Experiencia del Equipo**: Más documentación y recursos disponibles

## 5. Impacto en el Proyecto

### Cambios Requeridos
1. **T006 Modificado**: Instalar Auth.js en lugar de Lucia Auth
2. **T007 Ajustado**: Adaptar tipos TypeScript para Auth.js
3. **Esquema de BD**: Ajustes menores en las tablas `user`, `session` y `key`
4. **Estimación de Tiempo**: +2h para la migración conceptual

### Ventajas del Cambio
- **Sostenibilidad a Largo Plazo**: Solución mantenida activamente
- **Ecosistema Robusto**: Amplia documentación y ejemplos
- **Compatibilidad Futura**: Garantiza soporte a largo plazo
- **Funcionalidades Adicionales**: OAuth integrado, múltiples proveedores

### Desventajas
- **Cambio de Arquitectura**: Requiere adaptar el diseño original
- **Curva de Aprendizaje**: El equipo necesita familiarizarse con Auth.js
- **Dependencia Externa**: Aunque es open-source, introduce una dependencia adicional

## 6. Consecuencias

### Positivas
- **Estabilidad a Largo Plazo**: No habrá deprecación inesperada
- **Soporte Comunitario**: Amplia base de usuarios y contribuidores
- **Funcionalidades Avanzadas**: OAuth, middleware, hooks, etc.
- **Mejor Documentación**: Recursos exhaustivos y ejemplos

### Negativas
- **Tiempo Adicional**: 2h extra para reconfiguración
- **Cambio de API**: Diferentes patrones de implementación
- **Posible Vendor Lock-in**: Aunque menor que con soluciones managed

## 7. Decisiones Técnicas

### Configuración Propuesta
```typescript
// Auth.js v5 con Drizzle Adapter
import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    // Email/Password personalizado
    // OAuth providers opcionales
  ],
  session: { strategy: "database" },
  // Configuración personalizada para RBAC
})
```

### Ajustes al Esquema
- **Tabla `user`**: Compatible, ajustes menores en campos
- **Tabla `session`**: Adaptar para formato Auth.js
- **Tabla `key`**: Reemplazar por `account` y `verification_token`
- **RBAC**: Mantener `role`, `permission`, `user_role`, `role_permission` sin cambios

## 8. Implementación

### Pasos Inmediatos
1. Remover paquetes Lucia instalados
2. Instalar Auth.js v5 y Drizzle adapter
3. Actualizar esquemas de BD según Auth.js
4. Configurar Auth.js básico
5. Integrar con sistema RBAC existente

### Cronograma Actualizado
- **T006**: Instalar y configurar Auth.js (4h + 2h migración = 6h)
- **T007**: Modelos TypeScript para Auth.js (4h sin cambios)
- **Resto del plan**: Sin cambios significativos

## 9. Revisión
Esta decisión debe ser revisada y aprobada antes de proceder con T006. Una vez aprobada, se actualizará ADR-001 para reflejar el cambio.

---

**Fecha**: 2025-10-30
**Responsable**: Equipo de Desarrollo
**Estado**: Pendiente de Aprobación