# Requerimiento Funcional del MVP de la tienda en linea.

## 1. Descripción General

Este documento define los requerimientos funcionales y técnicos del MVP de una solución de comercio electrónico basada en Next.js como plataforma full‑stack, usando Postgres como base de datos, Prisma como ORM y NextAuth para autenticación con JWT. El objetivo es implementar una primera versión utilizable por clientes y personal administrativo, con funcionalidades esenciales de catálogo, carrito, checkout, gestión de productos, inventario y pedidos.

---

## 2. Objetivos del MVP

* Permitir a clientes visualizar productos, agregar al carrito y realizar pedidos con método de pago en efectivo y retiro en tienda.
* Proveer una interfaz administrativa para gestionar productos, variantes, inventario y pedidos.
* Implementar autenticación con roles utilizando el RBAC ya desarrollado.
* Unificar todas las operaciones mediante APIs internas dentro del mismo proyecto Next.js.

---

## 3. Roles del Sistema

### 3.1 Roles administrativos

* **Admin:** Acceso completo a todos los módulos.
* **Editor de productos:** Puede crear/editar productos y variantes.
* **Editor de inventario:** Realiza ajustes e ingresos.
* **Gestor de pedidos:** Gestiona el flujo de órdenes.

### 3.2 Roles públicos

* **Cliente:** Registra pedidos, consulta historial, administra su perfil.
* **Usuario invitado:** Puede navegar el catálogo y usar carrito local.

---

## 4. Funcionalidades del Área Pública (Clientes)

### 4.1 Catálogo de Productos

* Visualización de productos con descripción, precio e imágenes.
* Visualización de variantes por atributos como talla o color.
* Validación de stock por variante.

### 4.2 Carrito

* Carrito local para usuarios no autenticados.
* Persistencia del carrito al iniciar sesión.
* Actualización de cantidades y verificación de stock.

### 4.3 Checkout

* Obligatorio iniciar sesión o registrarse al confirmar pedido.
* Método de entrega: **Pickup en tienda**.
* Método de pago: **Efectivo al recoger**.
* Generación de un comprobante básico (PDF/HTML) del pedido.

### 4.4 Órdenes del Cliente

* Listado de pedidos realizados.
* Consulta del detalle del pedido.

---

## 5. Funcionalidades del Área Administrativa

### 5.1 Gestión de Productos

* Crear, editar y eliminar productos.
* Administración de variantes.
* Activación/inactivación de productos.

### 5.2 Gestión de Inventario

* Ajustes de stock por variante.
* Registro de ingresos simples de inventario.

### 5.3 Gestión de Pedidos

* Visualizar todas las órdenes con filtros por fecha, estado o cliente.
* Cambiar estado de los pedidos a:

  * Pendiente
  * Confirmado
  * Listo para pickup
  * Entregado
* Visualizar detalle del pedido.

---

## 6. API del Sistema

La estructura actual del proyecto ya separa las APIs por contexto. El MVP agregará rutas siguiendo esta organización:

### 6.1 API Pública (`/api/public`)

* Listado de productos.
* Detalle de producto.
* Carrito.
* Checkout.

### 6.2 API de Cliente Autenticado (`/api/customer`)

* Gestión del carrito persistente.
* Historial de pedidos.
* Detalle del pedido.

### 6.3 API Administrativa (`/api/admin`)

* CRUD de productos.
* CRUD de variantes.
* Inventario.
* Pedidos.

Cada endpoint aplicará autorización basada en roles.

---

## 7. Modelado Inicial de Datos (Resumen)

* **Product**: Información general del producto.
* **ProductVariant**: Variantes con atributos y stock.
* **InventoryMovement**: Registros de ajustes e ingresos.
* **Order**: Pedido del cliente.
* **OrderItem**: Detalle por variante y cantidad.
* **User**: Datos del cliente o empleado.
* **Role / Permission**: Gestionado mediante RBAC existente.

---

## 8. Interfaz de Usuario (UI)

### 8.1 Área Pública

* Catálogo limpio y accesible.
* Flujo de carrito y checkout simplificado.
* Panel de pedidos minimalista.

### 8.2 Panel Administrativo

* Construido con shadcn/ui.
* Secciones: Productos, Variantes, Inventario, Pedidos.
* Formularios y tablas optimizados para CRUD.

---

## 9. Infraestructura y Tecnologías

* **Frontend/Backend:** Next.js Full‑Stack.
* **Base de datos:** PostgreSQL.
* **ORM:** Prisma con migraciones.
* **Autenticación:** NextAuth v5 con JWT.
* **UI:** shadcn/ui.
* **Control de permisos:** RBAC ya implementado.
* **Almacenamiento de imágenes:** S3 o equivalente.

---

## 10. Fuera del Alcance (Roadmap futuro)

* Facturación electrónica.
* Métodos de pago online.
* Envío a domicilio.
* Multialmacén.
* Kardex.
* Reportes avanzados.
* Cupones y descuentos.

---

## 11. Criterios de Finalización del MVP

* Catálogo público funcional.
* Carrito y checkout operando.
* Flujo de pedido completo con cambio de estados.
* Panel administrativo operativo.
* Control de roles funcionando.
* Generación de comprobante de pedido.
* API única para web, admin y móvil.

---

**Fin del documento**.
