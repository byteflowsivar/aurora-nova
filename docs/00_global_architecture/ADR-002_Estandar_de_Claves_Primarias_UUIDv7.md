# ADR-002: Estandarización de Claves Primarias con UUID v7

## 1. Título
Estandarización de Claves Primarias (PK) y Foráneas (FK) con UUID v7

## 2. Estado
Aceptado

## 3. Contexto
Se requiere una estrategia de claves primarias consistente y escalable para toda la base de datos. El debate se centra entre el uso de enteros secuenciales (clásico) y UUIDs (moderno). Los enteros son performantes y simples, pero exponen información y dificultan la operación en sistemas distribuidos. Los UUIDs son seguros y flexibles, pero los UUID v4 (aleatorios) pueden causar fragmentación de índices y degradar el rendimiento de la base de datos a largo plazo.

## 4. Decisión
Se ha decidido adoptar `UUID` como el tipo de dato estándar para **todas** las claves primarias y foráneas en la base de datos de Aurora Nova. 

Para la generación de estos IDs, se utilizará la especificación **UUID v7**. Esta versión es cronológicamente ordenable, lo que combina los beneficios de rendimiento de los enteros secuenciales con la seguridad y flexibilidad de los UUIDs.

## 5. Consecuencias

### Positivas
*   **Consistencia del Esquema:** Todas las tablas siguen un único estándar, lo que simplifica el desarrollo y el razonamiento sobre los datos.
*   **Seguridad Mejorada:** Se elimina la posibilidad de ataques de enumeración a través de IDs secuenciales en las URLs de la API.
*   **Desacoplamiento:** Los IDs pueden ser generados por la aplicación (backend) sin necesidad de una consulta de ida y vuelta a la base de datos, simplificando la lógica de creación de entidades.
*   **Alto Rendimiento Sostenido:** Al usar UUID v7, que son ordenables por tiempo, se evita la fragmentación de los índices de la base de datos, asegurando un rendimiento de escritura rápido y estable, similar al de los enteros.
*   **Alineación con el Ecosistema:** La librería `Lucia Auth` ya utiliza IDs de tipo `string`, por lo que esta decisión unifica el comportamiento en todo el sistema.
*   **Preparado para el Futuro:** Facilita enormemente la transición a arquitecturas de microservicios o la fusión de bases de datos si fuera necesario.

### Negativas
*   **Mayor Tamaño de Almacenamiento:** Un UUID (16 bytes) ocupa más espacio que un `BIGINT` (8 bytes), lo que resulta en una base de datos ligeramente más grande. Este es un costo aceptable para los beneficios obtenidos.
*   **Menor Legibilidad Humana:** Los UUIDs son más difíciles de leer y comunicar para los desarrolladores durante la depuración en comparación con los enteros simples.
*   **Dependencia de una Función:** La generación de UUID v7 en PostgreSQL requiere una función personalizada o una extensión, ya que no es una funcionalidad nativa en la versión actual.
