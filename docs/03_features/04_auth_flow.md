# Flujo 4: Autenticación y Autorización

Este documento describe el flujo mediante el cual un usuario inicia sesión y el sistema valida sus permisos para acceder a diferentes recursos.

## Resumen

Este flujo es la combinación de la autenticación (verificar quién es el usuario) y la autorización (verificar qué puede hacer el usuario). Es fundamental para la seguridad y la experiencia de usuario en la aplicación.

--- 

## 1. Flujo de Autenticación (Login)

**Actor:** Cualquier usuario con una cuenta.
**Ubicación:** Página de inicio de sesión (ej: `/login`).

1.  **Entrada de Credenciales:**
    - El usuario introduce su `email` y `contraseña` en el formulario de login.

2.  **Petición al Backend:**
    - El frontend (Next.js) envía una petición `POST` a una ruta de API (ej: `/api/auth/login`) con las credenciales.

3.  **Verificación en el Backend:**
    - La API recibe las credenciales.
    - Busca al usuario en la base de datos por su `email`.
    - Si el usuario no existe o está inactivo, devuelve un error `401 Unauthorized`.
    - Si el usuario existe, compara la `contraseña` recibida con el hash almacenado en la base de datos usando una función segura (ej: `bcrypt.compare`).
    - Si la contraseña no coincide, devuelve un error `401 Unauthorized`.

4.  **Generación de Sesión (JWT):**
    - Si las credenciales son correctas, el backend genera un **JSON Web Token (JWT)**.
    - **Payload del JWT (Contenido Recomendado):**
      - `sub` (Subject): El ID del usuario (`userId`).
      - `role`: El nombre del rol del usuario (ej: "Editor").
      - `permissions`: Un **array de strings** con todos los permisos asociados al rol del usuario (ej: `['VIEW_USERS', 'EDIT_ARTICLES']`).
      - `iat` (Issued At): Timestamp de cuándo se emitió el token.
      - `exp` (Expiration): Timestamp de cuándo expirará el token.
    - **Firma del Token:** El token es firmado en el backend con una clave secreta (`JWT_SECRET`) para asegurar su integridad.

5.  **Respuesta al Frontend:**
    - El backend envía el JWT al frontend.
    - El frontend almacena el token de forma segura (ej: en una cookie `httpOnly` para mayor seguridad, o en `localStorage`).

--- 

## 2. Flujo de Autorización (Acceso a Recursos)

Este flujo ocurre en cada interacción del usuario con la aplicación después de iniciar sesión.

### Autorización en el Frontend

1.  **Persistencia de Sesión:** Al recargar la página, el frontend lee el JWT almacenado para mantener al usuario autenticado.
2.  **Renderizado Condicional:**
    - La UI se adapta a los permisos del usuario.
    - Se decodifica el payload del JWT para acceder al array de `permissions`.
    - Componentes o elementos de la UI (botones, enlaces de menú, etc.) se muestran u ocultan condicionalmente.
    - **Ejemplo en React:**
      ```jsx
      const { hasPermission } = useAuth(); // Un custom hook

      return (
        <div>
          {hasPermission('CREATE_USERS') && <button>Crear Usuario</button>}
        </div>
      );
      ```

### Autorización en el Backend (API Middleware)

1.  **Petición a Ruta Protegida:**
    - El frontend realiza una petición a una API protegida (ej: `POST /api/users`), incluyendo el JWT en la cabecera `Authorization` (ej: `Bearer <token>`).

2.  **Middleware de Verificación:**
    - Un middleware en el backend intercepta todas las peticiones a rutas protegidas.
    - Verifica la firma y la expiración del JWT. Si es inválido, devuelve `401 Unauthorized`.
    - Extrae el payload (incluyendo `userId`, `role` y `permissions`).

3.  **Middleware de Permisos:**
    - La ruta específica puede tener un segundo middleware que verifique los permisos necesarios para esa acción.
    - **Ejemplo:** La ruta `POST /api/users` requiere el permiso `CREATE_USERS`.
    - El middleware comprueba si el array `permissions` del token incluye la cadena `'CREATE_USERS'`.
    - Si el permiso no se encuentra, el middleware devuelve un error `403 Forbidden` (el usuario está autenticado pero no autorizado para esta acción).
    - Si el permiso existe, la petición continúa hacia el controlador final de la ruta.
