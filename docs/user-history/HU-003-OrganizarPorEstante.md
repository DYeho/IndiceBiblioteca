# HU-003-Organizar libros por estante

## Historia de usuario
Como administrador de biblioteca, quiero asignar a un libro registrado la etiqueta del estante que yo elija, para tener una organización precisa.

## Criterio de aceptación

### CA-001-Ver libros sin estante
**Dado** que el administrador tiene una sesión válida y está en el área de administración,
**cuando** selecciona el botón "Asignar estantes",
**entonces** el sistema muestra la lista de los libros registrados que todavía no tienen estante, con su título, autor y cantidad.

### CA-002-Sin libros pendientes
**Dado** que todos los libros registrados ya tienen estante, o que no hay libros registrados,
**cuando** el administrador selecciona el botón "Asignar estantes",
**entonces** el sistema muestra una lista vacía con un mensaje que indica que no hay libros sin estante.

### CA-003-Asignación exitosa
**Dado** que el administrador ve la lista de libros sin estante,
**cuando** ingresa una etiqueta de estante válida para un libro y confirma,
**entonces** el sistema guarda la etiqueta, muestra un mensaje de confirmación y el libro desaparece de la lista de libros sin estante. Tras recargar la página o reiniciar el servidor, el libro sigue con el mismo estante.

### CA-004-Etiqueta inválida
**Dado** que el administrador está asignando un estante a un libro,
**cuando** deja la etiqueta vacía, la forma solo con espacios o supera la longitud máxima permitida,
**entonces** el sistema no guarda el cambio, el libro conserva su estado anterior y se indica el motivo.

### CA-005-Libro inexistente
**Dado** que el libro seleccionado ya no existe (por ejemplo, fue eliminado),
**cuando** el administrador intenta asignarle un estante,
**entonces** el sistema no guarda nada e informa que el libro no existe.

### CA-006-Ver libros con estante asignado
**Dado** que el administrador está en la vista de asignación de estantes,
**cuando** abre el menú de opciones (tres puntos, en una esquina de la vista) y elige ver los libros ya asignados,
**entonces** el sistema muestra la lista de los libros que tienen estante, con su título, autor, cantidad y estante actual.

### CA-007-Actualización de la etiqueta de estante
**Dado** que el administrador ve la lista de libros con estante asignado,
**cuando** ingresa una etiqueta válida distinta para un libro y confirma,
**entonces** el sistema sustituye la etiqueta anterior por la nueva, sin modificar ningún otro dato de ese libro ni de otros libros. Tras recargar la página o reiniciar el servidor, el libro conserva la nueva etiqueta.

### CA-008-Asignación restringida a la Administración
**Dado** que el usuario no ha iniciado sesión o su sesión no es válida,
**cuando** intenta ver las listas de asignación o asignar un estante,
**entonces** el sistema rechaza la operación, no muestra ni guarda nada y exige iniciar sesión.

## Reglas del Negocio
RN-001: Solo la Administración con sesión válida puede asignar estantes y consultar las listas de asignación (ver HU-001).
RN-002: El estante es una etiqueta de texto que registra la ubicación del libro. El sistema solo registra y actualiza esa etiqueta; no ubica ni traslada libros físicos, tarea que realiza el personal de la biblioteca. El estante no es una entidad con gestión propia: no se crean, renombran ni eliminan estantes por separado.
RN-003: La etiqueta la elige libremente la Administración. El sistema no la valida contra una lista de estantes existentes y la guarda tal como se escribe, sin normalizar mayúsculas ni formato.
RN-004: Un libro tiene como máximo un estante a la vez. Asignar uno nuevo reemplaza el anterior y no modifica ningún otro dato del libro (título, autor, descripción ni cantidad).
RN-005: Un mismo estante puede contener varios libros. No se exige que la etiqueta sea única entre libros.
RN-006: Un libro está "sin estante" mientras no tenga etiqueta asignada. Todo libro recién registrado (HU-002) está sin estante. Cada libro aparece en exactamente una de las dos listas: sin estante o con estante asignado, sea cual sea su cantidad (incluido 0).
RN-007: Las validaciones se ejecutan en el backend. Los espacios al inicio y al final se eliminan antes de guardar. La longitud máxima de la etiqueta se define en la especificación del modelo de datos.

## Dependencias
* SPEC-000-foundation v2.0 (stack, estructura, seguridad y convenciones).
* HU-001-Inicio de sesión (todas las operaciones exigen una sesión de Administración válida).
* HU-002-Registrar Libro físico (deben existir libros registrados).
* Columna del estante en la tabla `books` (SPEC-000 usa `shelf_label` como nombre de ejemplo), cuyo detalle se fijará en la especificación del modelo de datos.
* Esta historia no depende de la búsqueda: el libro se selecciona desde las listas de esta misma historia.
* Las historias de búsqueda y detalle (capacidades 6 y 7) muestran el estante asignado con esta historia.

## Fuera de Alcance
* Ubicar o trasladar físicamente los libros entre estantes (tarea del personal de la biblioteca).
* Crear, renombrar, eliminar o listar estantes como entidades independientes.
* Quitar el estante de un libro y dejarlo sin ubicación.
* Asignar la etiqueta a varios libros a la vez.
* Asignar el estante durante el registro del libro (HU-002 no lo incluye).
* Editar título, autor, descripción o cantidad, y eliminar libros (capacidades 4 y 5).
* Búsqueda, filtros, orden o paginación dentro de las listas de asignación.
* Otras opciones del menú de tres puntos distintas de ver los libros ya asignados.
* Cómo se muestra un libro sin estante en la consulta pública (capacidades 6 y 7).
* Normalización o corrección automática de etiquetas (mayúsculas, formato, errores de escritura).