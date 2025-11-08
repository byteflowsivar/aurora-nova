# ADR-001: Elección del Stack Tecnológico Principal

- **Estado:** Aceptado
- **Fecha:** 2025-10-30

## Contexto

El proyecto Aurora Nova requiere una base tecnológica robusta, moderna y escalable para el desarrollo de una aplicación web con gestión de usuarios, roles y permisos. Es fundamental seleccionar un conjunto de tecnologías que permitan un desarrollo eficiente, mantengan altos estándares de seguridad y faciliten el mantenimiento a largo plazo.

## Decisión

Se ha decidido adoptar el siguiente stack tecnológico principal:

- **Framework Full-Stack:** **Next.js (React)** para renderizado del lado del servidor (SSR), generación de sitios estáticos (SSG) y rutas de API.
- **Base de Datos:** **PostgreSQL (Versión 18+)** por su fiabilidad y el soporte nativo de `uuidv7()`, crucial para nuestra estrategia de claves primarias (ver ADR-002).
- **Librería de Autenticación:** **Auth.js (NextAuth.js v5)**, una solución madura y flexible que nos da control total sobre los datos y la lógica de autenticación. (Esta es una actualización del ADR-004 que reemplaza a Lucia Auth).
- **Framework de Estilos:** **Tailwind CSS** para un desarrollo rápido de UI "utility-first".
- **Librería de Componentes:** **shadcn/ui** por su flexibilidad, accesibilidad y control, al ser componentes que se copian directamente en el código fuente.
- **Principios de Diseño:** **Principios SOLID** para asegurar un software comprensible, flexible y mantenible.

## Consecuencias

### Positivas
- **Desarrollo Eficiente:** El stack acelera la creación de frontend y backend.
- **Seguridad y Control:** Auth.js proporciona una base segura manteniendo el control total sobre los datos del usuario.
- **Escalabilidad:** PostgreSQL y Next.js son tecnologías probadas y escalables.
- **Consistencia de UI:** shadcn/ui asegura una interfaz coherente y moderna.

### Negativas
- **Curva de Aprendizaje:** El equipo puede necesitar tiempo para familiarizarse con las tecnologías.
- **Gestión de Infraestructura:** Requiere conocimientos para gestionar la base de datos y el despliegue.
- **Disciplina de Desarrollo:** La adherencia a los principios SOLID requiere revisiones de código constantes.
