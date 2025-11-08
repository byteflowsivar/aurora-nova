# Guía Conceptual del Módulo de Autenticación y Autorización

Este documento es una guía completa que explica la arquitectura y el funcionamiento de las principales características del módulo de autenticación y autorización de Aurora Nova.

## Tabla de Contenidos

1.  [Sistema Híbrido de Autenticación (JWT + Base de Datos)](#1-sistema-híbrido-de-autenticación)
2.  [Sistema de Autorización Basado en Roles (RBAC)](#2-sistema-de-autorización-basado-en-roles-rbac)
3.  [Gestión de Perfil de Usuario](#3-gestión-de-perfil-de-usuario)

---

## 1. Sistema Híbrido de Autenticación

Aurora Nova implementa un sistema de autenticación que combina la eficiencia de los **JSON Web Tokens (JWT)** con la seguridad y el control de un **registro de sesiones en la base de datos**.

### Arquitectura y Flujo

1.  **Login:**
    - El usuario envía sus credenciales.
    - El servidor valida las credenciales.
    - Se genera un `sessionToken` (UUID) y se guarda en la tabla `session` de la base de datos junto con metadatos (IP, User-Agent).
    - Se crea un JWT que contiene el `sessionToken` y se envía al cliente en una cookie `httpOnly`.

2.  **Request Autenticado:**
    - **Validación Rápida (JWT):** En cada request, el middleware valida la firma y expiración del JWT. Esto no requiere una consulta a la base de datos.
    - **Validación Estricta (Base de Datos):** Para rutas sensibles (ej. `/admin`, `/settings`), el middleware además verifica que el `sessionToken` del JWT exista y sea válido en la tabla `session` de la base de datos.

3.  **Logout:**
    - Se elimina el registro de la sesión de la tabla `session`.
    - Se elimina la cookie del JWT en el cliente.

### Ventajas del Sistema Híbrido

| Aspecto | Solo JWT | Solo Sesión en BD | **Sistema Híbrido** |
| :--- | :--- | :--- | :--- |
| **Rendimiento** | ✅ Excelente | ❌ 1 query/request | ✅ **Configurable** |
| **Invalidación Manual** | ❌ Imposible | ✅ Inmediata | ✅ **Inmediata** |
| **Gestión de Dispositivos**| ❌ No | ✅ Sí | ✅ **Sí** |
| **Auditoría** | ❌ Limitada | ✅ Completa | ✅ **Completa** |

### Gestión de Sesiones

El sistema permite a los usuarios y administradores:
- **Listar sesiones activas:** Ver todos los dispositivos donde la sesión está iniciada.
- **Invalidar una sesión específica:** Cerrar la sesión en un dispositivo de forma remota.
- **Cerrar todas las demás sesiones:** Ideal si se sospecha de actividad no autorizada.

---

## 2. Sistema de Autorización Basado en Roles (RBAC)

El sistema RBAC permite un control de acceso granular y flexible en toda la aplicación.

### Conceptos Clave

-   **Permisos (Permissions):** La unidad más pequeña de autorización. Siguen el formato `módulo:acción` (ej. `user:create`, `role:manage`).
-   **Roles (Roles):** Agrupaciones de permisos que representan una función en el sistema (ej. "Administrador", "Editor de Contenido").
-   **Usuarios (Users):** Se les asignan uno o más roles. Sus permisos efectivos son la suma de todos los permisos de sus roles.

### Capas de Verificación

La verificación de permisos se realiza en todas las capas de la aplicación para una "defensa en profundidad":

1.  **Capa de UI (Cliente):**
    - **Hooks (`usePermission`):** Permiten obtener el estado de un permiso para lógica condicional.
    - **Componentes (`<PermissionGate>`):** Envuelven partes de la UI para mostrarlas u ocultarlas declarativamente según los permisos del usuario.

2.  **Capa de Lógica (Servidor):**
    - **Middleware:** Protege rutas enteras de la aplicación, con soporte para lógica AND/OR y rutas dinámicas.
    - **Server Actions:** Se protegen usando `requirePermission` o HOFs como `withPermission` para asegurar que solo usuarios autorizados puedan ejecutar acciones.
    - **Server Components:** Pueden verificar permisos antes de renderizar contenido sensible.

### Ejemplo de Uso

```tsx
// 1. Proteger una ruta en el middleware
// /users/create requiere el permiso 'user:create'

// 2. Proteger la acción de crear en el servidor
export const createUser = withPermission(
  ['user:create'],
  async (data: UserData) => {
    // Lógica para crear usuario...
  }
);

// 3. Ocultar el botón de crear en la UI
<PermissionGate permission="user:create">
  <CreateUserButton />
</PermissionGate>
```

---

## 3. Gestión de Perfil de Usuario

Esta funcionalidad permite a los usuarios gestionar su propia información de cuenta.

### Características

1.  **Página de Perfil (`/settings`):**
    - Unifica la gestión de la información personal y la seguridad.
    - El layout es responsive, con una o dos columnas según el tamaño de la pantalla.

2.  **Formulario de Perfil:**
    - Permite a los usuarios ver y actualizar su **nombre** y **apellido**.
    - El **email** se muestra como de solo lectura para evitar cambios.

3.  **Formulario de Cambio de Contraseña:**
    - Requiere que el usuario ingrese su **contraseña actual** para verificar su identidad.
    - La **nueva contraseña** debe cumplir con requisitos de seguridad (longitud, mayúsculas, números, caracteres especiales).
    - Se debe confirmar la nueva contraseña.
    - **Importante:** Al cambiar la contraseña, todas las demás sesiones activas del usuario se cierran automáticamente por seguridad.

4.  **Información de la Cuenta:**
    - Muestra datos de solo lectura como el email, la fecha de creación de la cuenta y si el email ha sido verificado.
    - Indica si la cuenta usa credenciales (email/contraseña) o un proveedor externo (OAuth), ya que esto último deshabilita el cambio de contraseña.
