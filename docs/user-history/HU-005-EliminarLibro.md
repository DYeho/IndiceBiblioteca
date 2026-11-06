# HU-005-Eliminar libro

## Historia de usuario
Como administrador de biblioteca, quiero eliminar un libro ya registrado, para mantener el índice de libros actualizado al estado real de la biblioteca.

## Criterio de aceptación

### CA-001-Solicitar la eliminación desde la búsqueda
**Dado** que el administrador tiene una sesión válida y buscó un libro,
**cuando** el libro aparece en los resultados y selecciona la opción "Eliminar",
**entonces** el sistema muestra una confirmación con el título, autor y cantidad del libro, y pide confirmar la eliminación antes de realizarla.

### CA-002-Eliminación exitosa
**Dado** que el administrador ve la confirmación de eliminación de un libro,
**cuando** confirma,
**entonces** el sistema elimina el libro, muestra un mensaje de confirmación y el libro deja de aparecer en el catálogo. Tras recargar la página o reiniciar el servidor, el libro sigue sin existir.

### CA-003-Cancelación
**Dado** que el administrador ve la confirmación de eliminación de un libro,
**cuando** cancela,
**entonces** el sistema no elimina nada y el libro conserva todos sus datos.

### CA-004-Eliminar un libro agotado
**Dado** que un libro tiene cantidad 0,
**cuando** el administrador lo elimina y confirma,
**entonces** el sistema lo retira del catálogo.

### CA-005-Eliminar un libro con ejemplares
**Dado** que un libro tiene una cantidad de 1 o más,
**cuando** el administrador lo elimina y confirma,
**entonces** el sistema lo retira del catálogo, y la confirmación previa muestra la cantidad de ejemplares que se dejarán de registrar.

### CA-006-Libro inexistente
**Dado** que el libro que se quiere eliminar ya no existe (por ejemplo, fue eliminado por otra cuenta de Administración),
**cuando** el administrador confirma la eliminación,
**entonces** el sistema no hace ningún cambio e informa que el libro no existe.

### CA-007-Efecto en el resto del catálogo
**Dado** que el administrador eliminó un libro,
**cuando** consulta las listas de asignación de estantes, realiza una búsqueda o registra un libro con el mismo título y autor,
**entonces** el libro eliminado no aparece en ninguna lista ni búsqueda, los demás libros no cambian y el registro del mismo título y autor se permite como el de un libro nuevo.

### CA-008-Eliminación restringida a la Administración
**Dado** que el usuario no ha iniciado sesión o su sesión no es válida,
**cuando** intenta eliminar un libro,
**entonces** el sistema no le muestra la opción "Eliminar", y si envía la solicitud de todos modos, la rechaza, no elimina nada y exige iniciar sesión.

## Reglas del Negocio
RN-001: Solo la Administración con sesión válida puede eliminar libros (ver HU-001). La opción "Eliminar" solo se muestra a la Administración, pero el backend rechaza igualmente cualquier solicitud sin sesión válida.
RN-002: La eliminación es definitiva. Se borran todos los datos del libro (título, autor, descripción, cantidad y estante). No existe papelera, recuperación ni historial. Para volver a tener el libro en el catálogo, se registra de nuevo.
RN-003: Antes de eliminar, el sistema exige una confirmación que muestra el título, autor y cantidad del libro. Sin confirmación no se elimina nada.
RN-004: Se puede eliminar un libro sin importar su cantidad. Un libro con cantidad 0 sigue registrado y la eliminación es la única forma de retirarlo del catálogo.
RN-005: Se elimina un solo libro por operación.
RN-006: Eliminar un libro no modifica ningún otro libro. El título y el autor del libro eliminado quedan libres para registrar un libro nuevo, conforme a la regla de duplicados.
RN-007: Las validaciones se ejecutan en el backend. La operación es completa o no ocurre: no puede quedar un libro parcialmente eliminado.

## Dependencias
* SPEC-000-foundation v2.0 (stack, estructura, seguridad y convenciones).
* HU-001-Inicio de sesión (la eliminación exige una sesión de Administración válida).
* HU-002-Registrar Libro físico (deben existir libros registrados). Su regla de duplicados interactúa con esta HU (RN-006).
* HU-006-Búsqueda de libros por nombre o autor: la eliminación se inicia desde sus resultados, en la página de búsqueda del administrador.
* HU-003-Organizar libros por estante: sus listas dejan de mostrar el libro eliminado.
* HU-004-Editar Libros registrados: comparte con esta HU el punto de entrada desde la búsqueda, pero no es requisito para eliminar.
* Tabla `books` en SQLite, cuyos campos definitivos se fijarán en la especificación del modelo de datos.

## Fuera de Alcance
* Eliminación de varios libros a la vez.
* Papelera, recuperación o deshacer una eliminación.
* Historial o auditoría de eliminaciones (quién eliminó qué y cuándo).
* Eliminación automática de libros agotados.
* Reducir la cantidad de ejemplares sin eliminar el libro (HU-004).
* Cambiar el estante de un libro (HU-003).
* Buscar libros (HU-006) y ver su información (capacidad 7).
* Cómo se muestra la marca "agotado" en los resultados de búsqueda (definido en HU-006) y en el detalle del libro (capacidad 7).
* Retirar o trasladar físicamente los ejemplares (tarea del personal de la biblioteca).