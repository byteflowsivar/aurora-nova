# Módulo: Autenticación y Autorización

- **Estado:** ✅ Implementado
- **Feature Flag:** `FEATURE_AUTH_MODULE` (ejemplo, no implementado aún)

## Resumen

Este módulo proporciona un sistema completo y seguro para la gestión de usuarios, autenticación y autorización basada en roles (RBAC). Es el núcleo de la seguridad de Aurora Nova.

## Funcionalidades Principales

1.  **Autenticación Híbrida:**
    - Combina la velocidad de los **JSON Web Tokens (JWT)** para la validación de sesiones en el cliente con el control de un **registro de sesiones en la base de datos**.
    - Permite invalidación de sesiones en tiempo real, gestión de dispositivos y auditoría.

2.  **Autorización Basada en Roles (RBAC):**
    - Sistema granular de permisos con el formato `módulo:acción` (ej. `user:create`).
    - Roles que agrupan múltiples permisos.
    - Asignación de múltiples roles a los usuarios.
    - Verificación de permisos en todas las capas de la aplicación: Middleware, API, Server Actions y UI.

3.  **Gestión de Perfil de Usuario:**
    - Los usuarios pueden ver y actualizar su información personal.
    - Implementa un flujo seguro para el cambio de contraseña.

4.  **Menú Dinámico:**
    - El menú de navegación se genera dinámicamente desde la base de datos.
    - Los ítems del menú se muestran u ocultan según los permisos del usuario.

## Documentación Detallada

- **[Guía Conceptual](./guide.md):** Explica en detalle la arquitectura y el funcionamiento del sistema híbrido de autenticación, el sistema RBAC y la gestión de perfiles.
- **[Referencia Técnica](./reference.md):** Contiene detalles técnicos sobre la implementación del menú dinámico, incluyendo el esquema de la base de datos y la revisión de la API.
