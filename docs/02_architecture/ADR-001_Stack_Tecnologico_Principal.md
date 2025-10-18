# ADR-001: Elección del Stack Tecnológico Principal

## 1. Título
Elección del Stack Tecnológico Principal para Aurora Nova

## 2. Estado
Aceptado

## 3. Contexto
El proyecto Aurora Nova requiere una base tecnológica robusta, moderna y escalable para el desarrollo de una aplicación web con gestión de usuarios, roles y permisos. Es fundamental seleccionar un conjunto de tecnologías que permitan un desarrollo eficiente, mantengan altos estándares de seguridad y faciliten el mantenimiento a largo plazo.

## 4. Decisión
Se ha decidido adoptar el siguiente stack tecnológico principal:

*   **Framework Frontend/Backend (API):** **Next.js (React)**
    *   **Justificación:** Permite el desarrollo full-stack con React, ofreciendo renderizado del lado del servidor (SSR), generación de sitios estáticos (SSG) y rutas de API. Esto simplifica la gestión del proyecto y optimiza el rendimiento y la SEO.
*   **Base de Datos:** **PostgreSQL**
    *   **Justificación:** Base de datos relacional de código abierto, conocida por su fiabilidad, robustez, extensibilidad y soporte para características avanzadas como JSONB, lo que la hace adecuada para datos estructurados y semi-estructurados.
*   **Librería de Autenticación:** **Lucia Auth**
    *   **Justificación:** Tras una evaluación, se ha optado por Lucia Auth. Es una librería de autenticación open-source que proporciona una base segura y flexible para la gestión de sesiones y usuarios. A diferencia de soluciones de servicio (Auth-as-a-Service), Lucia Auth permite mantener el control total sobre los datos y la lógica de autenticación dentro de la aplicación, mitigando riesgos asociados a dependencias de terceros y costos. Se encarga de las complejidades de bajo nivel de la seguridad de sesiones, permitiendo al equipo enfocarse en la implementación del sistema RBAC específico del negocio.
*   **Framework de Estilos UI:** **Tailwind CSS**
    *   **Justificación:** Un framework CSS "utility-first" que acelera el desarrollo de interfaces de usuario personalizadas y responsivas. Promueve la consistencia visual y reduce la necesidad de escribir CSS personalizado extenso.

## 5. Consecuencias

### Positivas
*   **Desarrollo Eficiente:** Next.js y Tailwind CSS acelerarán el desarrollo del frontend y la integración con el backend.
*   **Seguridad Robusta:** Lucia Auth proporciona una base de autenticación segura, reduciendo la superficie de ataque y la complejidad de implementar seguridad desde cero.
*   **Control Total:** Al usar Lucia Auth (librería) en lugar de un servicio, mantenemos el control total sobre los datos de usuario y la lógica de autenticación.
*   **Escalabilidad:** PostgreSQL y Next.js son tecnologías probadas y escalables.
*   **Comunidad y Ecosistema:** Todas las tecnologías seleccionadas cuentan con grandes comunidades y ecosistemas activos, facilitando el soporte y la disponibilidad de recursos.

### Negativas
*   **Curva de Aprendizaje:** Puede haber una curva de aprendizaje inicial para el equipo si no están familiarizados con alguna de estas tecnologías (especialmente Next.js y Lucia Auth).
*   **Configuración Inicial:** Lucia Auth requiere una configuración inicial más manual en comparación con soluciones "plug-and-play" o servicios de autenticación.
*   **Gestión de Infraestructura:** La gestión de la base de datos PostgreSQL y el despliegue de Next.js requerirán conocimientos de infraestructura.
