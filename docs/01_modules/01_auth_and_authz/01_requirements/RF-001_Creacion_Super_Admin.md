# RF-001: Creación del Super Administrador

**ID:** RF-001
**Título:** Creación del Super Administrador
**Prioridad:** Crítica

## Descripción

El sistema debe proveer un mecanismo seguro y controlado para la creación del primer usuario de la aplicación. Este usuario inicial será asignado al rol de "Super Administrador" y poseerá todos los permisos del sistema.

## Criterios de Aceptación

- **Condición de Ejecución Única:** El mecanismo de creación solo debe poder ejecutarse si no existe ningún usuario previamente en la base de datos.
- **Prevención de Duplicados:** Si el mecanismo es invocado cuando ya existen uno o más usuarios, la operación debe fallar y notificar al operador que el sistema ya ha sido inicializado.
- **Entrada de Datos:** El proceso debe solicitar, como mínimo, un nombre de usuario, una dirección de correo electrónico válida y una contraseña.
- **Creación del Rol:** El sistema debe asegurar la existencia del rol "Super Administrador" antes de la creación del usuario.
- **Seguridad de Contraseña:** La contraseña proporcionada por el operador debe ser procesada con un algoritmo de hash robusto y unidireccional antes de ser almacenada.
- **Asignación de Rol:** El usuario recién creado debe ser automáticamente asignado al rol "Super Administrador".
- **Mecanismo de Ejecución:** La creación debe realizarse a través de una herramienta de sistema interna, como un script de línea de comandos (CLI), y no debe ser expuesta a través de una API o interfaz de usuario pública.
