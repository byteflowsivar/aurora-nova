# ADR-003: Uso de Clave Primaria Semántica para Permisos

- **Estado:** Aceptado
- **Fecha:** 2025-11-07 (Fecha de documentación)

## Contexto

El [ADR-002](./002-claves-primarias-uuidv7.md) establece que todas las claves primarias (PK) del sistema deben ser de tipo UUID para mantener la consistencia y seguridad. Sin embargo, al aplicar esta regla a la tabla `permission`, se identificó un conflicto con la claridad del código y la experiencia del desarrollador (Developer Experience).

El identificador de un permiso no es un puntero arbitrario, sino un string con significado propio (ej. `'user:create'`) que se utiliza directamente en la lógica de autorización del código.

## Decisión

Se ha decidido que la tabla `permission` será una **excepción documentada** a la regla global de claves primarias.

La clave primaria de la tabla `permission` (`permission.id`) será de tipo `VARCHAR` (o `TEXT`). Almacenará el string identificador, legible por humanos, que se usará directamente en el código para la verificación de permisos.

## Consecuencias

### Positivas
- **Mejora la Experiencia del Desarrollador (DX):** El código de autorización es mucho más legible y auto-documentado. Un desarrollador puede leer y escribir `if (hasPermission('user:create'))` sin necesidad de una capa de indirección para mapear un UUID a un string.
- **Eficiencia:** Se elimina la necesidad de consultar la base de datos o un objeto de mapeo para encontrar a qué permiso corresponde un UUID.
- **Claridad Conceptual:** La identidad de un permiso en la base de datos es la misma que su identidad en la lógica de la aplicación, lo que reduce la carga cognitiva.

### Negativas
- **Inconsistencia Controlada:** Es una desviación deliberada y justificada del estándar global. Este ADR sirve como documentación para justificar por qué esta inconsistencia es deseable.
- **Supuesto de Inmutabilidad:** Se asume que el `id` de un permiso, una vez creado, no cambiará. Renombrar un permiso (ej. de `'user:create'` a `'user:add'`) requeriría una migración de datos y una refactorización en toda la base de código que lo referencie. Este es un supuesto aceptable para este tipo de identificador.
