# Plan de Implementación: MVP de Tienda en Línea

Este documento detalla el plan de trabajo para la implementación del MVP de la tienda en línea para el proyecto Aurora Nova.

**Nota sobre el MVP:** La primera versión de este proyecto (MVP) se lanzará **sin una pasarela de pagos integrada**. El objetivo es validar el flujo de creación de pedidos, gestión de inventario y la experiencia del usuario. La gestión del pago se realizará por fuera del sistema.

---

## Fase 1: Cimientos del Backend y Datos

*Objetivo: Crear la estructura de la base de datos, configurar el almacenamiento de archivos y desarrollar las APIs primarias.*

- [x] **Tarea 1.1: Configurar MinIO en Docker.**
  - **Descripción:** Añadir el servicio de MinIO al `docker-compose.yml` y configurar las variables de entorno para el usuario y la contraseña.
  - **Agente Recomendado:** Agente DevOps/Infraestructura.

- [x] **Tarea 1.2: Modificar `schema.prisma`.**
  - **Descripción:** Añadir los modelos `Product`, `ProductVariant` (con `attributes Json @db.JsonB`), `ProductImage`, `InventoryMovement`, `Order`, y `OrderItem`.
  - **Agente Recomendado:** Agente Backend (Prisma/API).

- [x] **Tarea 1.3: Ejecutar Migración de Base de Datos.**
  - **Descripción:** Aplicar los cambios del esquema a la base de datos usando `prisma migrate dev`.
  - **Agente Recomendado:** Agente Backend (Prisma/API).

- [x] **Tarea 1.4: Actualizar Seed Script.**
  - **Descripción:** Modificar `scripts/seed.ts` para poblar la base de datos con datos de prueba para la tienda (productos, variantes, etc.).
  - **Agente Recomendado:** Agente Backend (Prisma/API).

- [x] **Tarea 1.5: Implementar Lógica de Generación de SKU.**
  - **Descripción:** Crear una función de utilidad para generar SKUs únicos y automáticos al crear una `ProductVariant`.
  - **Agente Recomendado:** Agente Backend (Prisma/API).

- [x] **Tarea 1.6: Implementar API de Administración.**
  - **Descripción:** Desarrollar los endpoints en `/api/admin` para el CRUD de Productos, Variantes e Imágenes, incluyendo la lógica de subida de archivos a MinIO y protegiendo las rutas con el RBAC existente.
  - **Agente Recomendado:** Agente Backend (Prisma/API).

---

## Fase 2: Panel de Administración (CRUDs)

*Objetivo: Construir la interfaz de usuario para que los administradores gestionen la tienda.*

- [x] **Tarea 2.1: Crear Layout y Rutas del Admin.**
  - **Descripción:** Establecer las rutas y el layout base para el panel de la tienda en `/app/admin/store/...`.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).

- [x] **Tarea 2.2: UI de Gestión de Productos.**
  - **Descripción:** Desarrollar los componentes (`shadcn/ui`) para el CRUD de productos, incluyendo formularios con subida de imágenes a MinIO.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).

- [x] **Tarea 2.3: UI de Gestión de Inventario y Pedidos.**
  - **Descripción:** Crear las interfaces para visualizar el stock y los pedidos entrantes.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).

---

## Fase 3: Área Pública y Flujo del Cliente

*Objetivo: Desarrollar la experiencia de compra para el cliente final.*

- [x] **Tarea 3.1: UI de Catálogo y Detalle de Producto.**
  - **Descripción:** Crear las páginas públicas para que los usuarios exploren los productos y vean sus detalles.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).

- [x] **Tarea 3.2: Lógica del Carrito Local.**
  - **Descripción:** Implementar el carrito de compras en `localStorage` para usuarios no autenticados.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).

- [x] **Tarea 3.3: API y Lógica del Carrito Persistente.**
  - **Descripción:** Crear los endpoints y hooks necesarios para gestionar el carrito de usuarios autenticados en la base de datos.
  - **Agente Recomendado:** Agente Full-Stack.

---

## Fase 4: Checkout e Historial de Pedidos

*Objetivo: Finalizar el flujo de compra y habilitar la consulta de pedidos.*

- [x] **Tarea 4.1: Lógica de Fusión de Carritos.**
  - **Descripción:** Al iniciar sesión, implementar la lógica para fusionar el carrito de `localStorage` con el carrito del servidor.
  - **Agente Recomendado:** Agente Full-Stack.

- [x] **Tarea 4.2: UI de Checkout.**
  - **Descripción:** Construir la interfaz donde el usuario confirma su pedido, ve el total y finaliza la compra.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).

- [x] **Tarea 4.3: API de Creación de Pedidos.**
  - **Descripción:** Desarrollar el endpoint que recibe la solicitud de checkout, crea la orden en la base de datos y descuenta el stock.
  - **Agente Recomendado:** Agente Backend (Prisma/API).

- [x] **Tarea 4.4: Envío de Email de Confirmación.**
  - **Descripción:** Integrar un servicio de email (ej. Resend) y enviar un correo de confirmación al cliente después de que el pedido se cree exitosamente en la Tarea 4.3.
  - **Agente Recomendado:** Agente Backend (Prisma/API).

- [x] **Tarea 4.5: UI de Comprobante y Historial.**
  - **Descripción:** Crear el componente React para el **comprobante HTML imprimible** y la página de historial de pedidos del cliente.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).

---

## Fase 5: Iteración 2 - Mejoras de UX y Performance

*Objetivo: Mejorar la experiencia de usuario en la administración de productos y optimizar la carga del catálogo público.*

### Sub-Fase 5.1: Refactor del Flujo de Creación de Productos

- [ ] **Tarea 5.1.1:** Crear ruta y página `/admin/store/products/new`.
  - **Descripción:** Crear la página que albergará el nuevo formulario de creación de productos.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).

- [ ] **Tarea 5.1.2:** Crear ruta y página `/admin/store/products/[id]/edit`.
  - **Descripción:** Crear la página de edición que permitirá gestionar el producto y sus variantes.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).

- [ ] **Tarea 5.1.3:** Adaptar el `ProductForm`.
  - **Descripción:** Modificar el formulario para que en la ruta `new` solo muestre los campos base (nombre, descripción). En la ruta `edit`, mostrará la gestión completa de variantes.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).

- [ ] **Tarea 5.1.4:** Actualizar la lógica de la API y el Frontend.
  - **Descripción:** Al crear un producto base, la API devolverá el ID del nuevo producto y el frontend redirigirá a la página de edición.
  - **Agente Recomendado:** Agente Full-Stack.

- [ ] **Tarea 5.1.5:** Actualizar la UI de `ProductList`.
  - **Descripción:** Cambiar el botón "Añadir Producto" para que navegue a `/admin/store/products/new` y eliminar el modal. El botón "Editar" deberá navegar a la página de edición.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).

### Sub-Fase 5.2: Optimización de Endpoints Públicos

- [ ] **Tarea 5.2.1:** Modificar endpoint `GET /api/products`.
  - **Descripción:** Ajustar la consulta de Prisma para que devuelva una lista de productos simplificada, incluyendo solo el nombre, slug, imagen principal y el precio más bajo.
  - **Agente Recomendado:** Agente Backend (Prisma/API).

- [ ] **Tarea 5.2.2:** Actualizar componentes del área pública.
  - **Descripción:** Refactorizar `ProductCard` y la página de catálogo para que funcionen con la nueva estructura de datos simplificada.
  - **Agente Recomendado:** Agente Frontend (Next.js/UI).
