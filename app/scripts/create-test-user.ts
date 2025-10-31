/**
 * Script para crear usuario de prueba
 * Aurora Nova - Test User Creation
 *
 * Uso:
 *   npm run create-test-user
 */

import { registerUser } from "../src/actions/auth"
import { prisma } from "../src/lib/prisma/connection"

async function createTestUser() {
  console.log("\n🔧 Creando usuario de prueba...\n")

  const testUser = {
    email: "test@example.com",
    password: "Test123456",
    confirmPassword: "Test123456",
    firstName: "Usuario",
    lastName: "Prueba",
  }

  try {
    // Verificar si ya existe
    const existing = await prisma.user.findUnique({
      where: { email: testUser.email },
    })

    if (existing) {
      console.log("⚠️  El usuario de prueba ya existe:")
      console.log(`   Email: ${testUser.email}`)
      console.log(`   ID: ${existing.id}`)
      console.log(`   Creado: ${existing.createdAt}`)
      console.log()
      console.log("✅ Puedes usar estas credenciales para hacer login")
      console.log()
      return
    }

    // Registrar nuevo usuario
    const result = await registerUser(testUser)

    if (!result.success) {
      console.error("❌ Error al crear usuario:")
      console.error(`   ${result.error}`)
      if (result.fieldErrors) {
        console.error("   Errores de campos:")
        Object.entries(result.fieldErrors).forEach(([field, errors]) => {
          console.error(`   - ${field}: ${errors.join(", ")}`)
        })
      }
      return
    }

    console.log("✅ Usuario de prueba creado exitosamente!")
    console.log()
    console.log("📧 Credenciales para login:")
    console.log("   ┌─────────────────────────────────┐")
    console.log("   │ Email:    test@example.com      │")
    console.log("   │ Password: Test123456            │")
    console.log("   └─────────────────────────────────┘")
    console.log()
    console.log("🆔 Información del usuario:")
    console.log(`   ID: ${result.data.userId}`)
    console.log(`   Nombre: ${result.data.firstName} ${result.data.lastName}`)
    console.log()

    // Verificar roles asignados
    const user = await prisma.user.findUnique({
      where: { id: result.data.userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (user?.userRoles && user.userRoles.length > 0) {
      console.log("👤 Roles asignados:")
      user.userRoles.forEach((ur) => {
        console.log(`   - ${ur.role.name}`)
      })
    } else {
      console.log("⚠️  Sin roles asignados")
    }

    console.log()
    console.log("🚀 Próximos pasos:")
    console.log("   1. Inicia el servidor: npm run dev")
    console.log("   2. Abre el navegador: http://localhost:3000")
    console.log("   3. Usa las credenciales de arriba para hacer login")
    console.log()
  } catch (error) {
    console.error("❌ Error inesperado:", error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar
createTestUser()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Error fatal:", error)
    process.exit(1)
  })
