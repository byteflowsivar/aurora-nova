/**
 * Script para crear el primer usuario Super Administrador
 * T029: Script de creación de Super Admin
 */

import * as dotenv from 'dotenv';
import prompts from 'prompts';
import { hash } from 'bcryptjs';
import { prisma } from '../src/lib/prisma/connection';

dotenv.config({ path: '.env.local' });

async function createSuperAdmin() {
  try {
    console.log('🚀 Iniciando script de creación de Super Administrador...');

    // 1. Verificar si ya existen usuarios
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.error('❌ Error: Ya existen usuarios en la base de datos. El script solo se puede ejecutar en una instalación nueva.');
      process.exit(1);
    }

    console.log('✅ Verificación de usuarios completa. No existen usuarios.');

    // 2. Solicitar datos del Super Administrador
    const response = await prompts([
      {
        type: 'text',
        name: 'firstName',
        message: 'Nombre del Super Administrador:',
        validate: value => value.length > 0 ? true : 'El nombre es requerido'
      },
      {
        type: 'text',
        name: 'lastName',
        message: 'Apellido del Super Administrador:',
        validate: value => value.length > 0 ? true : 'El apellido es requerido'
      },
      {
        type: 'text',
        name: 'email',
        message: 'Email del Super Administrador:',
        validate: value => /\S+@\S+\.\S+/.test(value) ? true : 'Email inválido'
      },
      {
        type: 'password',
        name: 'password',
        message: 'Contraseña del Super Administrador:',
        validate: value => value.length >= 8 ? true : 'La contraseña debe tener al menos 8 caracteres'
      }
    ]);

    if (!response.firstName || !response.lastName || !response.email || !response.password) {
      console.log('🛑 Creación cancelada por el usuario.');
      process.exit(0);
    }

    // 3. Verificar que el rol "Super Administrador" exista
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'Super Administrador' },
    });

    if (!superAdminRole) {
      console.error('❌ Error: El rol "Super Administrador" no existe. Asegúrate de haber ejecutado el seeder de la base de datos primero (`npm run db:seed`).');
      process.exit(1);
    }

    console.log('✅ Rol "Super Administrador" encontrado.');

    // 4. Hash de la contraseña
    const hashedPassword = await hash(response.password, 12);

    // 5. Crear usuario y asignar rol en una transacción
    console.log('⏳ Creando usuario y asignando rol...');
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: `${response.firstName} ${response.lastName}`,
          firstName: response.firstName,
          lastName: response.lastName,
          email: response.email,
          emailVerified: new Date(),
          credentials: {
            create: {
              hashedPassword: hashedPassword,
            },
          },
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: superAdminRole.id,
          createdBy: user.id, // El mismo usuario se crea a sí mismo en este caso
        },
      });

      return user;
    });

    console.log('🎉 ¡Super Administrador creado exitosamente!');
    console.log(`   - ID: ${newUser.id}`);
    console.log(`   - Email: ${newUser.email}`);
    console.log('   - Rol: Super Administrador');

  } catch (error) {
    console.error('❌ Error inesperado durante la creación del Super Administrador:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
