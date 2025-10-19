# RNF-001: Requerimientos No Funcionales Generales

**ID:** RNF-001
**Título:** Requerimientos No Funcionales Generales
**Categoría:** Seguridad, Rendimiento
**Prioridad:** Crítica

## 1. Seguridad

| ID | Requerimiento | Descripción |
|---|---|---|
| **SEC-01** | Hashing de Contraseñas | Todas las contraseñas de los usuarios deben ser almacenadas utilizando un algoritmo de hashing adaptativo y con "sal" (salt). El hash debe ser resistente a ataques de fuerza bruta y de diccionario. **Ejemplo:** Bcrypt, Argon2. |
| **SEC-02** | Seguridad de Tokens de Sesión | Los tokens de sesión (JWT) deben ser firmados digitalmente con un secreto robusto y almacenado de forma segura en el backend. El payload del token no debe contener información personal sensible. |
| **SEC-03** | Expiración de Sesiones | Los tokens de sesión deben tener una política de expiración definida y razonable (ej. entre 1 y 24 horas) para limitar la ventana de oportunidad en caso de robo de token. |
| **SEC-04** | Comunicación Segura | Toda la comunicación entre el cliente (navegador) y el servidor debe ser cifrada utilizando TLS 1.2 o superior (HTTPS). |
| **SEC-05** | Protección contra Ataques Comunes | La aplicación debe contar con protecciones básicas contra vulnerabilidades web comunes, como Cross-Site Scripting (XSS) y Cross-Site Request Forgery (CSRF). |

## 2. Rendimiento

| ID | Requerimiento | Descripción |
|---|---|---|
| **PERF-01** | Tiempo de Respuesta de API | Bajo una carga de usuarios concurrente del 80% del máximo esperado, el tiempo de respuesta del percentil 95 (p95) para las operaciones críticas de la API (login, CRUD de roles/usuarios) debe ser inferior a 500 milisegundos. |
| **PERF-02** | Tiempo de Carga de la Interfaz | El tiempo de carga inicial de la interfaz principal de la aplicación (dashboard) debe ser inferior a 3 segundos en una conexión de banda ancha estándar. Esto incluye la carga de todos los recursos críticos (CSS, JS). |
