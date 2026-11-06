# HU-006-Búsqueda de libros por nombre o autor

## Historia de usuario
Como administrador de biblioteca o estudiante, quiero buscar un libro por título o autor, para encontrar la cantidad de ejemplares y su ubicación de forma más exacta.

## Criterio de aceptación

### CA-001-Búsqueda por título
**Dado** que una persona (con o sin sesión) está en la página de búsqueda que le corresponde,
**cuando** escribe parte del título de un libro registrado y ejecuta la búsqueda,
**entonces** el sistema muestra los libros cuyo título contiene ese texto, cada uno con su título, autor, cantidad y estante.

### CA-002-Búsqueda por autor
**Dado** que una persona está en la página de búsqueda que le corresponde,
**cuando** escribe parte del nombre de un autor y ejecuta la búsqueda,
**entonces** el sistema muestra los libros cuyo autor contiene ese texto, con los mismos datos que en CA-001.

### CA-003-Coincidencia flexible
**Dado** que existe un libro con título o autor "Gabriel García Márquez",
**cuando** la persona busca "garcia", "GARCÍA" o "marquez",
**entonces** el sistema encuentra el libro, sin importar mayúsculas, minúsculas ni tildes, y sin importar espacios al inicio o al final del texto escrito.

### CA-004-Búsqueda vacía
**Dado** que la persona está en la página de búsqueda,
**cuando** intenta buscar con el campo vacío o con solo espacios,
**entonces** el sistema no ejecuta la búsqueda, no muestra libros y muestra un mensaje que pide escribir un título o autor.

### CA-005-Sin resultados
**Dado** que ningún libro coincide con el texto buscado,
**cuando** la persona ejecuta la búsqueda,
**entonces** el sistema muestra un mensaje que indica que no se encontraron libros.

### CA-006-Libro agotado
**Dado** que un libro coincidente tiene cantidad 0,
**cuando** aparece en los resultados,
**entonces** se muestra con la marca "agotado" junto a su cantidad, y sigue apareciendo en los resultados.

### CA-007-Libro sin estante
**Dado** que un libro coincidente todavía no tiene estante asignado,
**cuando** aparece en los resultados,
**entonces** se muestra con el texto "Estante no asignado" y sigue apareciendo en los resultados.

### CA-008-Orden de los resultados
**Dado** que la búsqueda devuelve varios libros,
**cuando** el sistema los muestra,
**entonces** aparecen en orden alfabético por título, sin distinguir mayúsculas ni tildes. Si dos libros tienen el mismo título, se ordenan por autor.

### CA-009-Búsqueda del estudiante
**Dado** que un estudiante, sin cuenta ni sesión, está en la página pública de búsqueda,
**cuando** busca y ve los resultados,
**entonces** cada resultado le ofrece únicamente la opción "Ver información". No ve las opciones "Editar" ni "Eliminar".

### CA-010-Búsqueda del administrador
**Dado** que el administrador tiene una sesión válida y está en su página de búsqueda dentro del área de administración,
**cuando** busca y ve los resultados,
**entonces** se aplican las mismas reglas de búsqueda y cada resultado le ofrece las opciones "Ver información", "Editar" y "Eliminar".

## Reglas del Negocio
RN-001: La búsqueda es de solo lectura y no modifica ningún dato. Cualquier persona puede buscar sin cuenta ni sesión. El administrador usa una página de búsqueda propia dentro del área de administración, que exige sesión válida (ver HU-001).
RN-002: Un único campo de texto busca en el título y en el autor. Un libro coincide si el texto buscado aparece en cualquiera de los dos.
RN-003: La coincidencia es parcial y no distingue mayúsculas ni tildes. Los espacios al inicio y al final del texto se ignoran. El texto se busca como una frase y los caracteres especiales se tratan como texto normal. Esta regla de coincidencia es distinta de la de duplicados (HU-002 y HU-004), que no equipara tildes.
RN-004: Un texto vacío o formado solo por espacios no ejecuta la búsqueda y no devuelve el catálogo. La validación se ejecuta en el backend. La longitud máxima del texto se define en la implementación.
RN-005: Cada resultado muestra título, autor, cantidad y estante. Muestra la marca "agotado" cuando la cantidad es 0 y el texto "Estante no asignado" cuando no tiene estante. Los libros agotados o sin estante siempre pueden aparecer en los resultados.
RN-006: Los resultados se ordenan alfabéticamente por título, sin distinguir mayúsculas ni tildes, y por autor cuando los títulos coinciden. En el MVP no hay paginación ni límite de resultados.
RN-007: "Ver información" está disponible para todos. "Editar" y "Eliminar" solo se muestran a la Administración con sesión válida, y el backend rechaza igualmente cualquier intento de editar o eliminar sin sesión (ver HU-004 y HU-005).

## Dependencias
* SPEC-000-foundation v2.0 (stack, estructura, seguridad y convenciones).
* HU-002-Registrar Libro físico (deben existir libros registrados).
* HU-001-Inicio de sesión (necesaria para la búsqueda del administrador y para mostrar "Editar" y "Eliminar").
* HU-003-Organizar libros por estante (el estante asignado se muestra en los resultados).
* HU-004-Editar Libros registrados y HU-005-Eliminar libro (sus acciones parten de estos resultados).
* Historia de información del libro (capacidad 7): provee la opción "Ver información". Sin ella, los resultados se muestran sin esa opción.
* Tabla `books` en SQLite. La especificación del modelo de datos debe definir cómo se logra la búsqueda sin distinguir tildes.
* HU-009-Filtrar lista de libros con IA comparte esta página de búsqueda y es la alternativa cuando falla la IA.

## Fuera de Alcance
* Ver la información completa del libro (capacidad 7).
* Filtros manuales, orden elegido por el usuario y paginación.
* Búsqueda en lenguaje natural con IA (HU-009).
* Búsqueda por descripción, estante u otros campos.
* Búsqueda por palabras sueltas en cualquier orden, corrección de errores de escritura, sugerencias y autocompletado.
* Mostrar el catálogo completo sin escribir un texto de búsqueda.
* Historial o estadísticas de búsquedas.
* Reservar o solicitar préstamo de un libro (el sistema no maneja préstamos).
* Editar o eliminar libros (HU-004 y HU-005): esta historia solo provee el punto de entrada.
* Búsqueda dentro de la sinopsis o el índice digitalizados (HU-008 los guarda, pero no forman parte de la búsqueda).