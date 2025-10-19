# Flujo 1: Creación del Super Administrador

Este documento describe el flujo para la creación del primer usuario del sistema, el cual tendrá el rol de Super Administrador.

## Resumen

Este es un flujo crítico y único que se ejecuta una sola vez para inicializar el sistema con un usuario raíz que tiene todos los permisos.

## Disparador (Trigger)

- La aplicación se despliega por primera vez.
- La base de datos, específicamente la tabla de usuarios, está vacía.

## Método Recomendado

Se utilizará un **script de línea de comandos (CLI)** para garantizar la seguridad. No se debe exponer una API pública o una interfaz gráfica para esta acción inicial.

- Se puede configurar un comando en `package.json`, como `npm run setup:superadmin`.

## Proceso del Script

1.  El script se conecta a la base de datos de PostgreSQL.
2.  Verifica que la tabla `users` esté vacía. Si detecta que ya existen usuarios, el script debe detenerse con un mensaje de error para prevenir la creación accidental de múltiples super administradores.
3.  El script solicita de forma interactiva en la consola los datos para el nuevo usuario:
    - Nombre completo.
    - Dirección de correo electrónico.
    - Contraseña.
4.  El script crea una nueva entrada en la tabla `roles` con el nombre `Super Administrador`.
5.  El script hashea la contraseña introducida utilizando un algoritmo seguro como `bcrypt`.
6.  Crea el nuevo usuario en la tabla `users` con los datos proporcionados y lo asocia con el ID del rol `Super Administrador`.
7.  El script finaliza mostrando un mensaje de éxito en la consola.

## Resultado

El sistema queda inicializado con un usuario administrador que puede iniciar sesión para comenzar a configurar la aplicación, crear otros roles y añadir más usuarios.
