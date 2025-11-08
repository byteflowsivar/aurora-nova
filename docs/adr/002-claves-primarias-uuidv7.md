# ADR-002: Estandarización de Claves Primarias con UUID v7

- **Estado:** Aceptado
- **Fecha:** 2025-10-30

## Contexto

Se necesita una estrategia de claves primarias (PK) consistente. Los enteros secuenciales son simples pero pueden exponer información y complicar la escalabilidad en sistemas distribuidos. Los UUIDs son seguros, pero la versión 4 (aleatoria) puede causar fragmentación de índices y degradar el rendimiento de la base de datos.

## Decisión

Se ha decidido adoptar **UUID** como el tipo de dato estándar para **todas** las claves primarias y foráneas en la base de datos.

Se utilizará la especificación **UUID v7**, que es cronológicamente ordenable. Esto combina los beneficios de rendimiento de los enteros secuenciales con la seguridad y flexibilidad de los UUIDs.

## Consecuencias

### Positivas
- **Consistencia y Seguridad:** Todas las tablas siguen un único estándar, eliminando ataques de enumeración de IDs.
- **Desacoplamiento:** Los IDs pueden ser generados por la aplicación sin necesidad de consultar la base de datos.
- **Alto Rendimiento:** UUID v7 evita la fragmentación de los índices, asegurando un rendimiento de escritura rápido y estable.
- **Preparado para el Futuro:** Facilita la transición a arquitecturas de microservicios.

### Negativas
- **Mayor Almacenamiento:** Un UUID (16 bytes) ocupa más espacio que un `BIGINT` (8 bytes), un costo aceptable para los beneficios obtenidos.
- **Menor Legibilidad:** Los UUIDs son más difíciles de leer para los humanos durante la depuración.
- **Dependencia de Versión:** Requiere PostgreSQL 18+ para la función nativa `uuidv7()`, alineado con el ADR-001.
