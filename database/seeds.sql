-- Seeders de datos iniciales para Aurora Nova
-- Permisos base y rol de Super Administrador

-- Insertar permisos base del sistema
INSERT INTO "permission" ("id", "module", "description") VALUES
-- Permisos de usuarios
('user:create', 'Users', 'Crear nuevos usuarios'),
('user:read', 'Users', 'Ver información de usuarios'),
('user:update', 'Users', 'Actualizar información de usuarios'),
('user:delete', 'Users', 'Eliminar usuarios'),
('user:list', 'Users', 'Listar todos los usuarios'),

-- Permisos de roles
('role:create', 'Roles', 'Crear nuevos roles'),
('role:read', 'Roles', 'Ver información de roles'),
('role:update', 'Roles', 'Actualizar información de roles'),
('role:delete', 'Roles', 'Eliminar roles'),
('role:list', 'Roles', 'Listar todos los roles'),
('role:assign', 'Roles', 'Asignar roles a usuarios'),

-- Permisos de permisos (meta-permisos)
('permission:create', 'Permissions', 'Crear nuevos permisos'),
('permission:read', 'Permissions', 'Ver información de permisos'),
('permission:update', 'Permissions', 'Actualizar información de permisos'),
('permission:delete', 'Permissions', 'Eliminar permisos'),
('permission:list', 'Permissions', 'Listar todos los permisos')

ON CONFLICT (id) DO NOTHING;

-- Insertar roles base del sistema
INSERT INTO "role" ("id", "name", "description") VALUES
(uuidv7(), 'Super Administrador', 'Acceso completo al sistema con todos los permisos'),
(uuidv7(), 'Administrador', 'Acceso administrativo con permisos limitados'),
(uuidv7(), 'Usuario', 'Usuario estándar con permisos básicos')

ON CONFLICT (name) DO NOTHING;

-- Asignar TODOS los permisos al rol Super Administrador
INSERT INTO "role_permission" ("role_id", "permission_id")
SELECT
    r.id as role_id,
    p.id as permission_id
FROM "role" r
CROSS JOIN "permission" p
WHERE r.name = 'Super Administrador'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Asignar permisos limitados al rol Administrador
INSERT INTO "role_permission" ("role_id", "permission_id")
SELECT
    r.id as role_id,
    p.id as permission_id
FROM "role" r
CROSS JOIN "permission" p
WHERE r.name = 'Administrador'
AND p.id IN (
    'user:read', 'user:list', 'user:update',
    'role:read', 'role:list',
    'permission:read', 'permission:list'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Asignar permisos básicos al rol Usuario
INSERT INTO "role_permission" ("role_id", "permission_id")
SELECT
    r.id as role_id,
    p.id as permission_id
FROM "role" r
CROSS JOIN "permission" p
WHERE r.name = 'Usuario'
AND p.id IN ('user:read', 'permission:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Verificar datos insertados
DO $$
DECLARE
    perm_count INTEGER;
    role_count INTEGER;
    super_admin_perms INTEGER;
BEGIN
    SELECT COUNT(*) INTO perm_count FROM "permission";
    SELECT COUNT(*) INTO role_count FROM "role";

    SELECT COUNT(*) INTO super_admin_perms
    FROM "role_permission" rp
    JOIN "role" r ON rp.role_id = r.id
    WHERE r.name = 'Super Administrador';

    RAISE NOTICE 'Datos iniciales creados:';
    RAISE NOTICE '  - Permisos: %', perm_count;
    RAISE NOTICE '  - Roles: %', role_count;
    RAISE NOTICE '  - Permisos de Super Administrador: %', super_admin_perms;

    IF super_admin_perms = perm_count THEN
        RAISE NOTICE '✅ Super Administrador tiene todos los permisos asignados';
    ELSE
        RAISE WARNING '⚠️  Super Administrador no tiene todos los permisos';
    END IF;
END $$;