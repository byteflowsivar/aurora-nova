/**
 * Extensiones de Tipos de NextAuth - Aurora Nova
 *
 * Extiende las interfaces de NextAuth para incluir campos personalizados
 * específicos de Aurora Nova (permisos, roles, datos adicionales del usuario).
 *
 * **Qué se hace aquí**:
 * - Extiende `NextAuth.Session` con campos personalizados
 * - Extiende `NextAuth.User` con campos de BD específicos
 * - Extiende `JWT` con payload personalizado
 *
 * **Por qué**:
 * - NextAuth provee tipos base genéricos
 * - Aurora Nova necesita campos adicionales (permissions, roles, firstName)
 * - Este archivo "merge" nuestros tipos con los de NextAuth
 *
 * **Flujo de Datos**:
 * ```
 * Login → User Object → JWT (encode) → Session (decode) → Cliente
 *          ↓ extraer permisos/roles del usuario
 *        JWT { ..., permissions, roles }
 *          ↓ usar en sesión
 *        Session { user: { ..., permissions, roles } }
 *          ↓ disponible en cliente
 *        useSession() → session.user.permissions
 * ```
 *
 * **Type Augmentation (Module Declaration)**:
 * - `declare module "next-auth"`: Merge con tipos de NextAuth
 * - Usa intersection type `& DefaultSession["user"]`
 * - Esto preserva tipos default mientras agrega custom fields
 *
 * @module types/next-auth
 * @see {@link ../types/auth.ts} para tipos base (User, Role, Permission)
 * @see {@link ../lib/auth/auth.ts} para configuración de NextAuth
 * @see {@link https://next-auth.js.org/getting-started/typescript} para docs
 */

import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";
import type { UserRole } from '@/modules/shared/types';

/**
 * Extiende la Session de NextAuth
 *
 * **Campos Heredados** (de DefaultSession):
 * - `user.email`: Email del usuario
 * - `user.image`: Avatar URL
 * - `user.name`: Nombre del usuario
 * - `expires`: Fecha de expiración de la sesión
 *
 * **Campos Personalizados Agregados**:
 * - `sessionToken`: ID único de la sesión (para logout múltiple dispositivo)
 * - `user.id`: UUID del usuario
 * - `user.firstName`: Primer nombre del usuario
 * - `user.lastName`: Apellido del usuario
 * - `user.emailVerified`: Fecha de verificación de email
 * - `user.roles`: Array de roles del usuario
 * - `user.permissions`: Array de IDs de permiso (ej: ['user:create', 'role:read'])
 *
 * **Notas**:
 * - `SessionToken` se usa para logout omnibus (logout de todos los dispositivos)
 * - `permissions` se carga desde JWT en callback
 * - `roles` se carga desde JWT en callback
 * - Todos los custom fields son opcionales con `?`
 *
 * **Disponible en Cliente**:
 * ```typescript
 * const { data: session } = useSession()
 * const userEmail = session?.user.email
 * const userPermissions = session?.user.permissions  // Custom field
 * const userRoles = session?.user.roles  // Custom field
 * ```
 *
 * **Disponible en Servidor**:
 * ```typescript
 * const session = await getServerSession(authOptions)
 * const userId = session?.user.id
 * const permissions = session?.user.permissions
 * ```
 *
 * @see {@link User} para campos base
 * @see {@link JWT} para payload del token
 */
declare module "next-auth" {
  /**
   * Sesión del usuario autenticado
   *
   * Disponible después de login, usado por `useSession()` en cliente
   * y `getServerSession()` en servidor.
   *
   * @interface Session
   */
  interface Session extends DefaultSession {
    /**
     * ID único de la sesión de BD
     *
     * Usado para logout omnibus:
     * 1. Eliminar sesión de BD
     * 2. Invalidar JWT
     * 3. Desconectar de todos los dispositivos
     *
     * @type {string}
     * @optional
     */
    sessionToken?: string;

    /**
     * Información extendida del usuario autenticado
     *
     * Combina campos de NextAuth con custom fields de Aurora Nova
     *
     * @type {object}
     */
    user: {
      /**
       * ID único del usuario (UUID)
       *
       * Usado para identificar el usuario en BD
       *
       * @type {string}
       * @required
       */
      id: string;

      /**
       * Nombre completo del usuario (optional)
       *
       * Campo heredado de DefaultSession
       *
       * @type {string | null}
       * @optional
       */
      name?: string | null;

      /**
       * Email del usuario
       *
       * Usado para login
       *
       * @type {string | null}
       * @optional
       */
      email?: string | null;

      /**
       * URL del avatar del usuario
       *
       * @type {string | null}
       * @optional
       */
      image?: string | null;

      /**
       * Fecha de verificación del email
       *
       * null si no está verificado
       *
       * @type {Date | null}
       * @optional
       */
      emailVerified?: Date | null;

      /**
       * Primer nombre del usuario
       *
       * @type {string | null}
       * @optional
       */
      firstName?: string | null;

      /**
       * Apellido del usuario
       *
       * @type {string | null}
       * @optional
       */
      lastName?: string | null;

      /**
       * Roles asignados al usuario
       *
       * Array de objetos Role del usuario
       * Usualmente cargado en callback jwt/session
       *
       * @type {UserRole[]}
       * @optional
       */
      roles?: UserRole[];

      /**
       * Permisos del usuario
       *
       * Array de IDs de permiso (ej: 'user:create', 'role:read')
       * Se cargan en JWT callback desde roles del usuario
       * Disponibles inmediatamente sin consulta a BD
       *
       * @type {string[]}
       * @optional
       * @example ['user:create', 'user:read', 'role:list']
       */
      permissions?: string[];
    } & DefaultSession["user"];
  }

  /**
   * Objeto User de NextAuth
   *
   * Usado internamente por NextAuth durante el flujo de auth
   * (login, session callback, etc)
   *
   * @interface User
   */
  interface User extends DefaultUser {
    /**
     * ID único del usuario (UUID)
     *
     * @type {string}
     * @required
     */
    id: string;

    /**
     * Primer nombre del usuario
     *
     * @type {string | null}
     * @optional
     */
    firstName?: string | null;

    /**
     * Apellido del usuario
     *
     * @type {string | null}
     * @optional
     */
    lastName?: string | null;

    /**
     * Fecha de verificación del email
     *
     * Almacenado en BD, usado para validar email
     *
     * @type {Date | null}
     * @optional
     */
    emailVerified?: Date | null;

    /**
     * IP del cliente que se autenticó
     *
     * Usado para auditoría y seguridad
     *
     * @type {string}
     * @optional
     */
    ipAddress?: string;

    /**
     * User-Agent del navegador del cliente
     *
     * Usado para identificar dispositivo
     *
     * @type {string}
     * @optional
     */
    userAgent?: string;

    /**
     * Permisos del usuario
     *
     * Cargado desde roles en callback
     * Disponible en JWT para acceso rápido
     *
     * @type {string[]}
     * @optional
     */
    permissions?: string[];
  }
}

/**
 * Extiende el JWT de NextAuth
 *
 * El JWT contiene el payload firmado que se envía al cliente
 * en forma de cookie/header
 *
 * **Campos Heredados** (de DefaultJWT):
 * - `iat`: Issued at (timestamp)
 * - `exp`: Expiration (timestamp)
 * - `jti`: JWT ID
 *
 * **Campos Personalizados Agregados**:
 * - `id`: UUID del usuario
 * - `email`: Email del usuario
 * - `name`: Nombre del usuario
 * - `firstName`: Primer nombre
 * - `lastName`: Apellido
 * - `emailVerified`: Fecha de verificación
 * - `sessionToken`: ID de sesión de BD
 * - `permissions`: Array de permisos
 *
 * **Notas**:
 * - JWT se firmacon AUTH_SECRET
 * - Se envía en cookie al cliente (segura, httpOnly)
 * - Cliente no puede modificarlo (firmado)
 * - Se decodifica en session callback para crear sesión
 *
 * **Flujo**:
 * ```
 * 1. Autenticación exitosa → NextAuth genera JWT
 * 2. JWT callback: extrae datos de User → agrega a JWT
 * 3. JWT se firma con AUTH_SECRET
 * 4. JWT se envía en cookie al cliente
 * 5. Cada request: JWT se valida (firma) → se decodifica → session callback
 * 6. Session callback: JWT → Session (para useSession())
 * ```
 *
 * **Validación de Firma**:
 * - NextAuth valida automáticamente la firma
 * - Si AUTH_SECRET cambia, todos los JWT existentes se invalidan
 * - Esto es por seguridad (previene token tampering)
 *
 * @see {@link Session} para conversión a Session
 * @see {@link User} para campos iniciales
 */
declare module "next-auth/jwt" {
  /**
   * JWT Token de NextAuth extendido
   *
   * @interface JWT
   */
  interface JWT extends DefaultJWT {
    /**
     * ID del usuario (UUID)
     *
     * @type {string}
     * @optional
     */
    id?: string;

    /**
     * Email del usuario
     *
     * @type {string}
     * @optional
     */
    email?: string;

    /**
     * Nombre completo del usuario
     *
     * @type {string}
     * @optional
     */
    name?: string;

    /**
     * Primer nombre del usuario
     *
     * @type {string | null}
     * @optional
     */
    firstName?: string | null;

    /**
     * Apellido del usuario
     *
     * @type {string | null}
     * @optional
     */
    lastName?: string | null;

    /**
     * Fecha de verificación del email
     *
     * @type {Date | null}
     * @optional
     */
    emailVerified?: Date | null;

    /**
     * Token de sesión de BD
     *
     * Usado para logout omnibus (eliminar sesión de BD)
     *
     * @type {string}
     * @optional
     */
    sessionToken?: string;

    /**
     * Permisos del usuario
     *
     * Array de IDs de permiso cargado desde roles
     * Incluido en JWT para acceso rápido sin consultar BD
     *
     * @type {string[]}
     * @optional
     * @example ['user:create', 'user:read', 'role:list']
     */
    permissions?: string[];
  }
}
