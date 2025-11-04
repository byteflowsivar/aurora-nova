/**
 * Prueba simple de registro
 */

import { registerUser } from "../src/actions/auth"
import { prisma } from "../src/lib/prisma/connection"

async function test() {
  console.log("🧪 Prueba simple de registro\n")

  const result = await registerUser({
    email: `simple.test.${Date.now()}@example.com`,
    password: "TestPassword123",
    confirmPassword: "TestPassword123",
    firstName: "Test",
    lastName: "User",
  })

  if (result.success) {
    console.log("✅ Registro exitoso!")
    console.log(`   ID: ${result.data.userId}`)
    console.log(`   Email: ${result.data.email}`)

    // Verificar rol
    const user = await prisma.user.findUnique({
      where: { id: result.data.userId },
      include: { userRoles: { include: { role: true } } },
    })

    console.log(`   Roles: ${user?.userRoles.map((ur) => ur.role.name).join(", ")}`)

    // Limpiar
    await prisma.user.delete({ where: { id: result.data.userId } })
    console.log("\n✅ Usuario de prueba eliminado")
  } else {
    console.error("❌ Error:", result.error)
  }

  await prisma.$disconnect()
}

test()
