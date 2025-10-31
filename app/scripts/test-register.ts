/**
 * Script de prueba para el registro de usuarios
 * Aurora Nova - Test T008
 *
 * Uso:
 *   npm run test:register
 */

import { registerUser } from "../src/actions/auth"
import { prisma } from "../src/lib/prisma/connection"

async function testRegisterUser() {
  console.log("\n🧪 Iniciando prueba de registro de usuario...\n")

  // Datos de prueba
  const testUser = {
    email: `test.user.${Date.now()}@example.com`,
    password: "TestPassword123",
    confirmPassword: "TestPassword123",
    firstName: "Usuario",
    lastName: "Prueba",
  }

  console.log("📝 Datos del usuario de prueba:")
  console.log(`   Email: ${testUser.email}`)
  console.log(`   Nombre: ${testUser.firstName} ${testUser.lastName}`)
  console.log()

  try {
    // Intentar registrar el usuario
    console.log("⏳ Registrando usuario...")
    const result = await registerUser(testUser)

    if (!result.success) {
      console.error("❌ Error al registrar usuario:")
      console.error(`   ${result.error}`)
      if (result.fieldErrors) {
        console.error("   Errores de campos:")
        Object.entries(result.fieldErrors).forEach(([field, errors]) => {
          console.error(`   - ${field}: ${errors.join(", ")}`)
        })
      }
      return
    }

    console.log("✅ Usuario registrado exitosamente!")
    console.log(`   ID: ${result.data.userId}`)
    console.log(`   Email: ${result.data.email}`)
    console.log()

    // Verificar que el usuario existe en la BD
    console.log("🔍 Verificando usuario en base de datos...")
    const dbUser = await prisma.user.findUnique({
      where: { id: result.data.userId },
      include: {
        credentials: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!dbUser) {
      console.error("❌ Usuario no encontrado en la base de datos")
      return
    }

    console.log("✅ Usuario encontrado en BD:")
    console.log(`   ID: ${dbUser.id}`)
    console.log(`   Email: ${dbUser.email}`)
    console.log(`   Nombre: ${dbUser.firstName} ${dbUser.lastName}`)
    console.log(`   Credenciales: ${dbUser.credentials ? "✅ Sí" : "❌ No"}`)
    console.log()

    // Verificar roles asignados
    console.log("🔍 Verificando roles asignados...")
    if (dbUser.userRoles.length === 0) {
      console.warn("⚠️  Usuario no tiene roles asignados")
    } else {
      console.log(`✅ Roles asignados: ${dbUser.userRoles.length}`)
      dbUser.userRoles.forEach((ur) => {
        console.log(`   - ${ur.role.name} (${ur.role.id})`)
      })
    }
    console.log()

    // Verificar que el password está hasheado
    if (dbUser.credentials) {
      console.log("🔍 Verificando hash de contraseña...")
      const hashedPassword = dbUser.credentials.hashedPassword

      if (hashedPassword.startsWith("$2")) {
        console.log("✅ Password correctamente hasheado con bcrypt")
      } else {
        console.warn("⚠️  Password no parece estar hasheado correctamente")
      }
      console.log(`   Hash: ${hashedPassword.substring(0, 30)}...`)
    }
    console.log()

    // Prueba de validaciones
    console.log("🧪 Probando validaciones...")

    // Test 1: Email duplicado
    console.log("   Test 1: Email duplicado")
    const duplicateResult = await registerUser(testUser)
    if (!duplicateResult.success && duplicateResult.error.includes("ya está registrado")) {
      console.log("   ✅ Validación de email duplicado funciona")
    } else {
      console.log("   ❌ Validación de email duplicado NO funciona")
    }

    // Test 2: Contraseña débil
    console.log("   Test 2: Contraseña débil")
    const weakPasswordResult = await registerUser({
      ...testUser,
      email: `weak.${Date.now()}@example.com`,
      password: "weak",
      confirmPassword: "weak",
    })
    if (!weakPasswordResult.success && weakPasswordResult.fieldErrors?.password) {
      console.log("   ✅ Validación de contraseña débil funciona")
    } else {
      console.log("   ❌ Validación de contraseña débil NO funciona")
    }

    // Test 3: Contraseñas no coinciden
    console.log("   Test 3: Contraseñas no coinciden")
    const mismatchResult = await registerUser({
      ...testUser,
      email: `mismatch.${Date.now()}@example.com`,
      confirmPassword: "DifferentPassword123",
    })
    if (!mismatchResult.success && mismatchResult.fieldErrors?.confirmPassword) {
      console.log("   ✅ Validación de contraseñas no coinciden funciona")
    } else {
      console.log("   ❌ Validación de contraseñas no coinciden NO funciona")
    }

    // Test 4: Email inválido
    console.log("   Test 4: Email inválido")
    const invalidEmailResult = await registerUser({
      ...testUser,
      email: "invalid-email",
    })
    if (!invalidEmailResult.success && invalidEmailResult.fieldErrors?.email) {
      console.log("   ✅ Validación de email inválido funciona")
    } else {
      console.log("   ❌ Validación de email inválido NO funciona")
    }

    console.log()
    console.log("✅ Todas las pruebas completadas!")
    console.log()
    console.log("📊 Resumen:")
    console.log(`   Usuario de prueba creado: ${testUser.email}`)
    console.log(`   ID: ${result.data.userId}`)
    console.log(
      `   Roles asignados: ${dbUser.userRoles.map((ur) => ur.role.name).join(", ") || "Ninguno"}`
    )
    console.log()

    // Limpiar usuario de prueba
    console.log("🧹 Limpiando usuario de prueba...")
    await prisma.user.delete({
      where: { id: result.data.userId },
    })
    console.log("✅ Usuario de prueba eliminado")
    console.log()
  } catch (error) {
    console.error("❌ Error durante la prueba:")
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar prueba
testRegisterUser()
  .then(() => {
    console.log("✅ Script de prueba finalizado")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Error fatal en el script:", error)
    process.exit(1)
  })
