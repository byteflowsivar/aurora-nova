/**
 * Módulo de Tipos para Perfil de Usuario - Aurora Nova
 *
 * Define tipos e interfaces para gestión del perfil de usuario en contextos administrativos.
 * Incluye tipos para visualización, actualización y cambio de contraseña.
 *
 * **Características**:
 * - Tipo de perfil completo con metadata de cuenta
 * - Tipos de actualización de datos de perfil
 * - Tipos para cambio seguro de contraseña
 * - Soporte para verificación de email
 * - Tracking de fechas de creación/actualización
 *
 * **Componentes Principales**:
 * 1. **UserProfile** - Perfil completo del usuario (visualización)
 * 2. **UpdateProfileData** - Datos editables del perfil
 * 3. **ChangePasswordData** - Datos para cambio de contraseña
 *
 * **Diagrama de Flujo**:
 * ```
 * UserProfile (BD) → Mostrar en UI
 *   ↓
 * UpdateProfileData (Form Input) → Validar + Actualizar
 *   ↓
 * ChangePasswordData (Form Input) → Validar + Cambiar Contraseña
 * ```
 *
 * **Ejemplo de Uso Completo**:
 * ```typescript
 * // 1. Cargar perfil del usuario
 * const profile = await db.user.findUnique({ where: { id: userId } })
 *
 * // 2. Mostrar perfil en componente
 * <ProfileCard profile={profile} />
 *
 * // 3. Usuario edita su perfil
 * const updatedData: UpdateProfileData = {
 *   firstName: 'Juan',
 *   lastName: 'Pérez',
 *   image: 'https://...'
 * }
 * await updateProfile(userId, updatedData)
 *
 * // 4. Usuario cambia contraseña
 * const passwordData: ChangePasswordData = {
 *   currentPassword: '...',
 *   newPassword: '...',
 *   confirmPassword: '...'
 * }
 * await changePassword(userId, passwordData)
 * ```
 *
 * @module admin/types/profile
 * @see {@link ../../shared/validations/auth.ts} para esquemas Zod relacionados
 * @see {@link ../../shared/types/action-response.ts} para respuestas de acciones
 */

/**
 * Perfil completo de usuario en Aurora Nova
 *
 * Representa toda la información públicamente accesible de un usuario,
 * incluyendo datos personales, estado de verificación y timestamps.
 * Típicamente se obtiene de la base de datos y se muestra en la UI.
 *
 * **Campos Personales**:
 * - `id`: Identificador único del usuario (UUID)
 * - `email`: Email único (índice en BD, case-insensitive)
 * - `firstName`: Nombre (opcional, nullable)
 * - `lastName`: Apellido (opcional, nullable)
 * - `name`: Nombre completo calculado (opcional, nullable)
 * - `image`: URL de avatar/imagen de perfil (opcional, nullable)
 *
 * **Campos de Seguridad**:
 * - `hasCredentials`: true si el usuario tiene contraseña registrada
 * - `emailVerified`: Fecha de verificación de email (null si no verificado)
 *
 * **Campos de Auditoría**:
 * - `createdAt`: Timestamp de creación de cuenta
 * - `updatedAt`: Timestamp de última actualización
 *
 * **Estructura y Ejemplo**:
 * ```typescript
 * const userProfile: UserProfile = {
 *   id: 'clq1a2b3c4d5e6f7g8h9i0j1k2',
 *   email: 'juan@example.com',
 *   firstName: 'Juan',
 *   lastName: 'Pérez',
 *   name: 'Juan Pérez',
 *   image: 'https://api.example.com/avatars/juan.jpg',
 *   emailVerified: new Date('2024-12-01T10:30:00Z'),
 *   createdAt: new Date('2024-11-15T14:20:00Z'),
 *   updatedAt: new Date('2024-12-04T16:45:00Z'),
 *   hasCredentials: true
 * }
 * ```
 *
 * **Campos Opcionales (nullable)**:
 * - `firstName`: Usuario puede no tener nombre
 * - `lastName`: Usuario puede no tener apellido
 * - `name`: Campo calculado/denormalizado en BD
 * - `image`: Usuario puede no tener avatar
 * - `emailVerified`: null = email sin verificar, Date = email verificado
 *
 * **Seguridad**:
 * - NO contiene campos de contraseña
 * - NO contiene datos sensibles
 * - Seguro para enviar al cliente (Frontend)
 * - Las contraseñas se verifican comparándolas contra hash (nunca se devuelven)
 *
 * **hasCredentials vs emailVerified**:
 * - `hasCredentials: true` = Usuario registrado con email/password (puede login)
 * - `hasCredentials: false` = Usuario solo con OAuth (no tiene password)
 * - `emailVerified: null` = Email sin confirmar (puede necesitar verificación)
 * - `emailVerified: Date` = Email confirmado (usuario verificó su email)
 *
 * **Ejemplo de Renderización**:
 * ```typescript
 * function ProfileCard({ profile }: { profile: UserProfile }) {
 *   return (
 *     <div className="profile-card">
 *       {profile.image && <img src={profile.image} alt={profile.name} />}
 *       <h2>{profile.firstName} {profile.lastName}</h2>
 *       <p>{profile.email}</p>
 *       {profile.emailVerified ? (
 *         <Badge>Email verificado</Badge>
 *       ) : (
 *         <Alert>Email sin verificar</Alert>
 *       )}
 *       <small>Creado: {formatDate(profile.createdAt)}</small>
 *     </div>
 *   )
 * }
 * ```
 *
 * **Obtención de la BD**:
 * ```typescript
 * // Cargar perfil completo
 * const profile = await db.user.findUnique({
 *   where: { id: userId },
 *   select: {
 *     id: true,
 *     email: true,
 *     firstName: true,
 *     lastName: true,
 *     name: true,
 *     image: true,
 *     emailVerified: true,
 *     createdAt: true,
 *     updatedAt: true,
 *     // Incluir hasCredentials si existe en BD
 *   }
 * })
 * ```
 *
 * @interface
 * @example
 * ```typescript
 * // Mostrar nombre
 * const displayName = profile.name || `${profile.firstName} ${profile.lastName}`.trim()
 *
 * // Verificar si puede cambiar contraseña
 * const canChangePassword = profile.hasCredentials
 *
 * // Verificar si email está verificado
 * const isEmailVerified = profile.emailVerified !== null
 * ```
 *
 * @see {@link UpdateProfileData} para campos editables
 * @see {@link ChangePasswordData} para cambio de contraseña
 */
export interface UserProfile {
  /** Identificador único del usuario (UUID) */
  id: string
  /** Email único de la cuenta */
  email: string
  /** Nombre del usuario (opcional) */
  firstName: string | null
  /** Apellido del usuario (opcional) */
  lastName: string | null
  /** Nombre completo (calculado o denormalizado) */
  name: string | null
  /** URL de avatar/imagen de perfil (opcional) */
  image: string | null
  /** Fecha de verificación de email (null si no verificado) */
  emailVerified: Date | null
  /** Timestamp de creación de cuenta */
  createdAt: Date
  /** Timestamp de última actualización */
  updatedAt: Date
  /** true si el usuario tiene contraseña registrada (puede login con email/password) */
  hasCredentials: boolean
}

/**
 * Datos editables del perfil de usuario
 *
 * Interfaz que define qué campos del perfil pueden ser editados por el usuario.
 * Todos los campos son opcionales para soportar actualizaciones parciales.
 * Se valida contra `updateProfileSchema` de Zod.
 *
 * **Campos Editables**:
 * - `firstName`: Nombre (opcional, puede ser null para limpiar)
 * - `lastName`: Apellido (opcional, puede ser null para limpiar)
 * - `image`: URL de avatar (opcional, puede ser null para remover)
 *
 * **Campos NO Editables**:
 * - `id`: Identificador inmutable
 * - `email`: Email se cambia con proceso separado
 * - `emailVerified`: Controlado por sistema de verificación
 * - `createdAt`: Auditoría, no se modifica
 * - `updatedAt`: Se actualiza automáticamente en BD
 * - `hasCredentials`: Se controla con login/registración
 *
 * **Validación Zod**:
 * ```typescript
 * const updateProfileSchema = z.object({
 *   firstName: z.string().min(1).max(50).optional(),
 *   lastName: z.string().min(1).max(50).optional(),
 *   image: z.string().url().nullable().optional()
 * })
 * ```
 *
 * **Ejemplo**:
 * ```typescript
 * // Actualización parcial (solo nombre)
 * const update1: UpdateProfileData = {
 *   firstName: 'Juan'
 * }
 *
 * // Actualización completa
 * const update2: UpdateProfileData = {
 *   firstName: 'Juan',
 *   lastName: 'Pérez',
 *   image: 'https://api.example.com/avatars/juan.jpg'
 * }
 *
 * // Limpiar avatar
 * const update3: UpdateProfileData = {
 *   image: null
 * }
 *
 * // Ningún campo (no hacer nada)
 * const update4: UpdateProfileData = {}
 * ```
 *
 * **Patrón de Uso en Server Action**:
 * ```typescript
 * async function updateProfile(userId: string, data: UpdateProfileData) {
 *   // Validar (aunque ya validado en client)
 *   const validated = updateProfileSchema.parse(data)
 *
 *   // Actualizar en BD (solo los campos definidos)
 *   const updated = await db.user.update({
 *     where: { id: userId },
 *     data: validated
 *   })
 *
 *   return successResponse(updated, 'Perfil actualizado')
 * }
 * ```
 *
 * **Validaciones**:
 * - firstName/lastName: min 1, max 50 caracteres
 * - image: debe ser URL válida o null
 * - Todos son opcionales (pueden omitirse)
 * - No se actualiza simultáneamente con email o contraseña
 *
 * @interface
 * @example
 * ```typescript
 * // En formulario
 * const form = {
 *   firstName: 'Juan',
 *   lastName: 'Pérez',
 *   image: null // Usuario quitó avatar
 * }
 *
 * // Validar y actualizar
 * const result = await updateProfile(userId, form)
 * if (result.success) {
 *   toast.success('Perfil actualizado')
 * }
 * ```
 *
 * @see {@link UserProfile} para perfil completo
 * @see {@link ChangePasswordData} para cambio de contraseña
 */
export interface UpdateProfileData {
  /** Nombre a actualizar (opcional, puede ser null) */
  firstName?: string
  /** Apellido a actualizar (opcional, puede ser null) */
  lastName?: string
  /** URL de avatar a actualizar (opcional, puede ser null para remover) */
  image?: string | null
}

/**
 * Datos para cambio de contraseña seguro
 *
 * Interfaz que define los datos necesarios para cambiar la contraseña de un usuario.
 * Requiere la contraseña actual para validar que el usuario autoriza el cambio.
 * Se valida contra `changePasswordSchema` de Zod que valida cross-field.
 *
 * **Campos Requeridos**:
 * - `currentPassword`: Contraseña actual (sin encriptar, se valida contra hash)
 * - `newPassword`: Nueva contraseña (debe cumplir complejidad)
 * - `confirmPassword`: Confirmación de nueva contraseña (debe coincidir con newPassword)
 *
 * **Validaciones Zod**:
 * ```typescript
 * const changePasswordSchema = z.object({
 *   currentPassword: z.string().min(1),
 *   newPassword: z.string()
 *     .min(8)
 *     .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Debe tener mayúscula, minúscula y número'),
 *   confirmPassword: z.string().min(1)
 * })
 * .refine((data) => data.newPassword === data.confirmPassword, {
 *   message: 'Las contraseñas no coinciden',
 *   path: ['confirmPassword']
 * })
 * .refine((data) => data.currentPassword !== data.newPassword, {
 *   message: 'La nueva contraseña debe ser diferente a la actual',
 *   path: ['newPassword']
 * })
 * ```
 *
 * **Requisitos de Nueva Contraseña**:
 * - Mínimo 8 caracteres
 * - Máximo 100 caracteres
 * - Al menos 1 mayúscula (A-Z)
 * - Al menos 1 minúscula (a-z)
 * - Al menos 1 dígito (0-9)
 * - No puede ser igual a la contraseña actual
 * - Debe coincidir con confirmPassword
 *
 * **Seguridad**:
 * - currentPassword se valida comparándola con hash en BD (nunca se almacena)
 * - Si currentPassword es incorrecta, rechazar (no revelar por qué)
 * - newPassword se encripta antes de almacenar
 * - Se usa bcrypt u algoritmo similar
 * - Las contraseñas anteriores pueden ser invalidadas (session invalidation)
 *
 * **Ejemplo**:
 * ```typescript
 * // Usuario llena formulario
 * const formData: ChangePasswordData = {
 *   currentPassword: 'MiContraseña123',
 *   newPassword: 'NuevaContraseña456',
 *   confirmPassword: 'NuevaContraseña456'
 * }
 *
 * // Validar con Zod
 * try {
 *   const validated = changePasswordSchema.parse(formData)
 *   // Proceder al cambio
 * } catch (error) {
 *   // fieldErrors de validación
 * }
 * ```
 *
 * **Patrón de Uso en Server Action**:
 * ```typescript
 * async function changePassword(userId: string, data: ChangePasswordData) {
 *   // 1. Validar formato
 *   const validated = changePasswordSchema.parse(data)
 *
 *   // 2. Obtener usuario actual
 *   const user = await db.user.findUnique({ where: { id: userId } })
 *   if (!user) return errorResponse('Usuario no encontrado')
 *
 *   // 3. Verificar contraseña actual
 *   const isValid = await bcrypt.compare(validated.currentPassword, user.passwordHash)
 *   if (!isValid) return errorResponse('Contraseña actual incorrecta')
 *
 *   // 4. Hash de nueva contraseña
 *   const newHash = await bcrypt.hash(validated.newPassword, 10)
 *
 *   // 5. Actualizar en BD
 *   await db.user.update({
 *     where: { id: userId },
 *     data: { passwordHash: newHash }
 *   })
 *
 *   // 6. Opcional: invalidar sesiones activas
 *   await invalidateSessions(userId)
 *
 *   return successResponse(undefined, 'Contraseña actualizada')
 * }
 * ```
 *
 * **Errores Posibles**:
 * - currentPassword incorrecta: "Contraseña actual incorrecta"
 * - newPassword no cumple requisitos: errors por campo
 * - confirmPassword no coincide: "Las contraseñas no coinciden"
 * - newPassword igual a current: "La nueva contraseña debe ser diferente"
 *
 * **UX Consideraciones**:
 * - Mostrar medidor de fortaleza de contraseña
 * - Mostrar requisitos de complejidad
 * - No revelar si currentPassword es válida o no (seguridad)
 * - Usar input type="password" con toggle para ver
 * - Confirmación adicional (email/OTP) es opcional pero recomendado
 *
 * @interface
 * @example
 * ```typescript
 * // En formulario React
 * const [data, setData] = useState<ChangePasswordData>({
 *   currentPassword: '',
 *   newPassword: '',
 *   confirmPassword: ''
 * })
 *
 * const handleSubmit = async () => {
 *   const result = await changePassword(data)
 *   if (result.success) {
 *     toast.success('Contraseña actualizada')
 *     setData({ currentPassword: '', newPassword: '', confirmPassword: '' })
 *   }
 * }
 * ```
 *
 * @see {@link UserProfile} para perfil del usuario
 * @see {@link UpdateProfileData} para actualización de datos
 */
export interface ChangePasswordData {
  /** Contraseña actual del usuario (se valida contra hash) */
  currentPassword: string
  /** Nueva contraseña (debe cumplir: min 8 chars, 1 mayús, 1 minús, 1 dígito) */
  newPassword: string
  /** Confirmación de nueva contraseña (debe coincidir exactamente con newPassword) */
  confirmPassword: string
}
