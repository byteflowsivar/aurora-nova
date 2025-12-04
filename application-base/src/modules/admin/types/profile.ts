/**
 * Tipos TypeScript para Perfil de Usuario
 */

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
  hasCredentials: boolean;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  image?: string | null;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
