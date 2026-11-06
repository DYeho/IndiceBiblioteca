# HU-004-Editar Libros registrados

## Historia de usuario
Como administrador de biblioteca, quiero editar el título, autor, descripción y cantidad de un libro ya registrado, para corregir errores de registro o actualizar esos datos.

## Criterio de aceptación

### CA-001-Abrir la edición desde la búsqueda
**Dado** que el administrador tiene una sesión válida y buscó un libro,
**cuando** el libro aparece en los resultados y selecciona la opción "Editar",
**entonces** el sistema muestra un formulario con el título, autor, descripción y cantidad actuales del libro, listos para modificar.

### CA-002-Edición exitosa
**Dado** que el administrador está en el formulario de edición de un libro,
**cuando** modifica uno o más de los cuatro datos con valores válidos y confirma,
**entonces** el sistema guarda los cambios y muestra un mensaje de confirmación. Tras recargar la página o reiniciar el servidor, el libro conserva los datos nuevos.

### CA-003-Cantidad en cero
**Dado** que el administrador está en el formulario de edición de un libro,
**cuando** escribe 0 como cantidad y confirma,
**entonces** el sistema guarda el libro con cantidad 0 y el libro sigue registrado en el catálogo.

### CA-004-Campos obligatorios vacíos
**Dado** que el administrador está en el formulario de edición de un libro,
**cuando** deja el título, el autor o la cantidad vacíos (o con título o autor formados solo por espacios),
**entonces** el sistema no guarda ningún cambio, el libro conserva sus datos anteriores e indica cada campo obligatorio que falta.

### CA-005-Cantidad inválida
**Dado** que el administrador está en el formulario de edición de un libro,
**cuando** escribe una cantidad negativa, con decimales o que no sea un número,
**entonces** el sistema no guarda ningún cambio e indica que la cantidad debe ser un número entero de 0 o más.

### CA-006-Libro duplicado
**Dado** que el administrador está en el formulario de edición de un libro,
**cuando** cambia el título o el autor de modo que coinciden con los de otro libro ya registrado,
**entonces** el sistema no guarda ningún cambio e indica que ese libro ya existe, para que edite el libro existente.

### CA-007-Libro inexistente
**Dado** que el libro que se está editando ya no existe (por ejemplo, fue eliminado),
**cuando** el administrador intenta guardar los cambios,
**entonces** el sistema no guarda nada e informa que el libro no existe.

### CA-008-Edición restringida a la Administración
**Dado** que el usuario no ha iniciado sesión o su sesión no es válida,
**cuando** intenta editar un libro,
**entonces** el sistema no le muestra la opción "Editar", y si envía la solicitud de todos modos, la rechaza, no guarda nada y exige iniciar sesión.

## Reglas del Negocio
RN-001: Solo la Administración con sesión válida puede editar libros (ver HU-001). La opción "Editar" solo se muestra a la Administración, pero el backend rechaza igualmente cualquier solicitud sin sesión válida.
RN-002: Los datos editables son título, autor, descripción y cantidad. El estante no se modifica en esta historia; se cambia únicamente con la funcionalidad de organizar libros por estante (HU-003).
RN-003: El título y el autor son obligatorios y deben tener contenido tras eliminar los espacios al inicio y al final. La descripción es opcional y se puede dejar vacía.
RN-004: La cantidad se edita escribiendo el valor total nuevo, un número entero de 0 o más. No se suma ni se resta sobre la cantidad actual. Un libro con cantidad 0 sigue registrado y solo se retira del catálogo eliminándolo (capacidad 5).
RN-005: No pueden existir dos libros con el mismo título y autor. La comparación no distingue mayúsculas de minúsculas y omite los espacios al inicio y al final. Al editar, el libro se compara únicamente contra los demás libros, no contra sí mismo.
RN-006: Las validaciones se ejecutan en el backend. La base de datos impide además cantidades negativas. Si algún dato es inválido, no se guarda ningún cambio. La longitud máxima de cada campo se define en la especificación del modelo de datos.
RN-007: Editar un libro no modifica otros libros ni su estante. No se guarda historial de cambios.

## Dependencias
* SPEC-000-foundation v2.0 (stack, estructura, seguridad y convenciones).
* HU-001-Inicio de sesión (la edición exige una sesión de Administración válida).
* HU-002-Registrar Libro físico (deben existir libros registrados). Esta HU introduce la regla de duplicados, por lo que HU-002 debe incorporarla también.
* Historia de búsqueda de libros (capacidad 6): la edición se inicia desde sus resultados.
* HU-006-Búsqueda de libros por nombre o autor: la edición se inicia desde sus resultados, en la página de búsqueda del administrador.
* HU-003-Organizar libros por estante: el estante se modifica allí y no en esta historia.
* Tabla `books` en SQLite, cuyos campos definitivos se fijarán en la especificación del modelo de datos.

## Fuera de Alcance
* Cambiar el estante del libro (HU-003).
* Eliminar libros (capacidad 5).
* Buscar libros (HU-006) y ver su información (capacidad 7).
* Sumar o restar ejemplares sobre la cantidad actual.
* Historial o auditoría de cambios (quién editó qué y cuándo).
* Edición de varios libros a la vez.
* Campos adicionales como ISBN, editorial, año, categoría o portada.
* Digitalización de descripción, sinopsis o índice mediante escaneo (capacidad 8).
* Cómo se muestra la marca "agotado" en los resultados de búsqueda (definido en HU-006) y en el detalle del libro (capacidad 7).
* Equivalencia de tildes al comparar duplicados.