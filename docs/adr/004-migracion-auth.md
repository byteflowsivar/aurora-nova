# ADR-004: Migración de Lucia Auth a Auth.js

- **Estado:** Aceptado
- **Fecha:** 2025-10-30

## Contexto

Durante la implementación, se descubrió que **Lucia Auth v3 será deprecado en marzo de 2025**. El equipo de Lucia recomienda migrar a otras soluciones, ya que no habrá una versión v4. Esta situación invalida una parte clave del [ADR-001](./001-stack-tecnologico.md).

## Decisión

Se ha decidido **migrar de Lucia Auth a Auth.js (NextAuth.js v5)**.

### Justificación
- **Madurez y Estabilidad:** Auth.js es una solución establecida y ampliamente adoptada en el ecosistema Next.js.
- **Soporte Activo:** Cuenta con un desarrollo activo y una comunidad robusta, garantizando la sostenibilidad a largo plazo.
- **Compatibilidad:** Funciona perfectamente con nuestro stack (Next.js, PostgreSQL, Drizzle/Prisma).
- **Flexibilidad:** Permite un control granular sobre las sesiones y la gestión de usuarios, alineándose con nuestros principios de no depender de servicios de terceros para la autenticación.
- **Migración de Bajo Impacto:** Es posible migrar sin afectar significativamente el diseño de la base de datos ya implementado.

## Consecuencias

### Positivas
- **Sostenibilidad a Largo Plazo:** Se elimina el riesgo de usar una librería que quedará obsoleta.
- **Ecosistema Robusto:** Acceso a una amplia documentación, ejemplos y soporte comunitario.
- **Funcionalidades Adicionales:** Facilita la integración con proveedores OAuth y ofrece hooks y utilidades avanzadas.

### Negativas
- **Cambio de Arquitectura:** Requiere adaptar el diseño original y la implementación que se había planeado para Lucia Auth.
- **Curva de Aprendizaje:** El equipo necesita familiarizarse con los patrones y la API de Auth.js.
- **Tiempo Adicional:** Se estima un pequeño tiempo adicional para la reconfiguración inicial.
