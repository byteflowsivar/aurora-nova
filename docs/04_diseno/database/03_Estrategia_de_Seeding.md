# Estrategia de Seeding (Datos Iniciales)

Para que la aplicación sea funcional desde el primer momento, es necesario precargar ciertos datos en la base de datos. Esto se realizará mediante un script de "seeding" que se ejecutará después de las migraciones.

## 1. Carga de Permisos

El script de seeding deberá insertar en la tabla `permission` todos los permisos definidos en el código fuente de la aplicación. La fuente de verdad para esta lista será un objeto o enum en el código.

**Ejemplo de datos a insertar:**
```sql
INSERT INTO "permission" ("id", "module", "description") VALUES
('user:create', 'Users', 'Permite crear nuevos usuarios'),
('user:read', 'Users', 'Permite ver la lista de usuarios'),
('user:update', 'Users', 'Permite actualizar usuarios existentes'),
('user:delete', 'Users', 'Permite desactivar usuarios'),
('role:create', 'Roles', 'Permite crear nuevos roles'),
('role:read', 'Roles', 'Permite ver la lista de roles'),
('role:update', 'Roles', 'Permite actualizar roles existentes'),
('role:delete', 'Roles', 'Permite eliminar roles'),
-- ... y así sucesivamente para todos los permisos de la aplicación.
;
```

## 2. Carga del Rol "Super Administrador"

Una vez que todos los permisos existan en la base de datos, el script creará el rol `Super Administrador`.

```sql
INSERT INTO "role" ("name", "description") VALUES
('Super Administrador', 'Rol con acceso total a todas las funcionalidades del sistema');
```

## 3. Asignación de Todos los Permisos al Super Administrador

Finalmente, el script asignará todos los permisos existentes en la tabla `permission` al nuevo rol `Super Administrador`.

**Lógica del script:**
```javascript
// Pseudocódigo
const superAdminRole = db.query("SELECT id FROM role WHERE name = 'Super Administrador'");
const allPermissions = db.query("SELECT id FROM permission");

const assignments = allPermissions.map(permission => ({
  role_id: superAdminRole.id,
  permission_id: permission.id
}));

db.insertInto("role_permission").values(assignments);
```
Este paso asegura que el Super Administrador, por defecto, pueda realizar cualquier acción en el sistema, como se define en los requerimientos.
