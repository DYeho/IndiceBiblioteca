# HU-002-Registrar Libro físico

## Historia de usuario
Como administrador de biblioteca, quiero registrar un nuevo libro con título, autor, descripción y cantidad, para tener un registro exacto de los ejemplares.

## Criterio de aceptación

### CA-001-Registro exitoso
**Dado** que el administrador tiene una sesión válida y está en el formulario de registro de libros,
**cuando** ingresa título, autor, descripción y una cantidad inicial de 1 o más, y confirma el registro,
**entonces** el sistema guarda el libro, muestra un mensaje de confirmación y los datos guardados coinciden con los ingresados.

### CA-002-Registro sin descripción
**Dado** que el administrador está en el formulario de registro de libros,
**cuando** ingresa título, autor y una cantidad inicial válida, y deja la descripción vacía,
**entonces** el sistema guarda el libro correctamente sin descripción.

### CA-003-Campos obligatorios vacíos
**Dado** que el administrador está en el formulario de registro de libros,
**cuando** intenta registrar con el título, el autor o la cantidad vacíos (o con título o autor formados solo por espacios),
**entonces** el sistema no guarda el libro e indica cada campo obligatorio que falta.

### CA-004-Cantidad inválida
**Dado** que el administrador está en el formulario de registro de libros,
**cuando** ingresa una cantidad de 0, negativa, con decimales o que no sea un número,
**entonces** el sistema no guarda el libro e indica que la cantidad inicial debe ser un número entero de 1 o más.

### CA-005-Registro restringido a la Administración
**Dado** que el usuario no ha iniciado sesión o su sesión no es válida,
**cuando** intenta registrar un libro,
**entonces** el sistema rechaza la operación, no guarda nada y exige iniciar sesión.

### CA-006-Persistencia del registro
**Dado** que el administrador registró un libro correctamente,
**cuando** recarga la página o el servidor se reinicia,
**entonces** el libro sigue almacenado con los mismos datos y la misma cantidad.

### CA-007-Libro duplicado
**Dado** que el administrador está en el formulario de registro de libros,
**cuando** ingresa un título y un autor que coinciden con los de un libro ya registrado,
**entonces** el sistema no guarda el libro e indica que ese libro ya existe, para que edite el libro existente.

## Reglas del Negocio
RN-001: Solo la Administración con sesión válida puede registrar libros (ver HU-001).
RN-002: El título y el autor son obligatorios y deben tener contenido tras eliminar los espacios al inicio y al final.
RN-003: La descripción es opcional y es texto libre escrito por la Administración.
RN-004: Al registrar se indica una cantidad inicial, obligatoria y entera, de 1 o más. Esa cantidad se puede modificar después con la funcionalidad de editar libros (incluido el valor 0).
RN-005: Cada registro representa un título con su cantidad de ejemplares. No se crea un registro por cada ejemplar físico.
RN-006: Las validaciones se ejecutan en el backend. La base de datos impide además cantidades negativas.
RN-007: Los espacios al inicio y al final de los textos se eliminan antes de guardar. Los límites de longitud de cada campo se definen en la especificación del modelo de datos.
RN-008: No pueden existir dos libros con el mismo título y autor. La comparación no distingue mayúsculas de minúsculas y omite los espacios al inicio y al final. La equivalencia de tildes no se aplica aquí.

## Dependencias
* SPEC-000-foundation v2.0 (stack, estructura, seguridad y convenciones).
* HU-001-Inicio de sesión (el registro exige una sesión de Administración válida).
* Tabla `books` en SQLite, cuyos campos definitivos se fijarán en la especificación del modelo de datos.
* HU-006-Búsqueda de libros por nombre o autor y la historia de información del libro (capacidad 7) muestran el estante asignado con esta historia.

## Fuera de Alcance
* Asignar o cambiar el estante del libro (capacidad 3, historia aparte).
* Editar la cantidad u otros datos del libro y eliminar libros (capacidades 4 y 5).
* Búsqueda y consulta de libros (capacidades 6 y 7).
* Digitalización de descripción, sinopsis o índice mediante escaneo (capacidad 8).
* Equivalencia de tildes al comparar duplicados.
* Campos adicionales como ISBN, editorial, año, categoría o portada.
* Registro de varios libros a la vez o importación desde archivos.