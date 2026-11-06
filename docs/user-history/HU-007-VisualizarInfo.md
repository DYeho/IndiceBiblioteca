# HU-007-Visualizar información

## Historia de usuario
Como administrador de biblioteca o estudiante, quiero ver la información de un libro, para corroborar el contenido de este.

## Criterio de aceptación

### CA-001-Abrir la información desde la búsqueda
**Dado** que una persona (con o sin sesión) tiene resultados de búsqueda en la página que le corresponde,
**cuando** selecciona la opción "Ver información" de un libro,
**entonces** el sistema abre un panel sobre la misma página de búsqueda con el título, autor, descripción, estante y cantidad de ese libro.

### CA-002-Libro sin descripción
**Dado** que el libro no tiene descripción registrada,
**cuando** se abre su información,
**entonces** el panel muestra el texto "Sin descripción" en lugar de la descripción.

### CA-003-Sinopsis e índice existentes
**Dado** que el libro tiene sinopsis, índice o ambos registrados,
**cuando** se abre su información,
**entonces** el panel muestra la sinopsis y el índice que existan, además de los demás datos.

### CA-004-Sinopsis e índice inexistentes
**Dado** que el libro no tiene sinopsis ni índice registrados,
**cuando** se abre su información,
**entonces** el panel no muestra esas secciones ni mensajes sobre su ausencia.

### CA-005-Libro agotado
**Dado** que el libro tiene cantidad 0,
**cuando** se abre su información,
**entonces** el panel muestra la cantidad 0 con la marca "agotado".

### CA-006-Libro sin estante
**Dado** que el libro todavía no tiene estante asignado,
**cuando** se abre su información,
**entonces** el panel muestra el texto "Estante no asignado".

### CA-007-Libro inexistente
**Dado** que el libro ya no existe (por ejemplo, fue eliminado después de la búsqueda),
**cuando** se intenta abrir su información,
**entonces** el sistema informa que el libro no existe y no muestra datos.

### CA-008-Misma información para todos
**Dado** que un estudiante sin sesión y un administrador con sesión válida abren la información del mismo libro,
**cuando** se muestra el panel,
**entonces** ambos ven los mismos datos. El administrador conserva además las opciones "Editar" y "Eliminar" (HU-004 y HU-005), que el estudiante no ve.

### CA-009-Cerrar el panel
**Dado** que el panel de información está abierto,
**cuando** la persona lo cierra,
**entonces** vuelve a los resultados de búsqueda que tenía, con el mismo texto buscado y los mismos resultados.

## Reglas del Negocio
RN-001: Ver la información es de solo lectura y no modifica ningún dato. Cualquier persona puede hacerlo sin cuenta ni sesión. El administrador la abre desde su página de búsqueda en el área de administración, que exige sesión válida (ver HU-001).
RN-002: La información de un libro incluye título, autor, descripción, estante y cantidad, y además la sinopsis y el índice cuando existen.
RN-003: Estudiantes y administradores ven los mismos datos. Las opciones "Editar" y "Eliminar" solo se muestran a la Administración con sesión válida.
RN-004: Cuando un dato no existe, se muestra así: descripción vacía como "Sin descripción", estante sin asignar como "Estante no asignado", cantidad 0 con la marca "agotado". La sinopsis y el índice ausentes no se muestran; no aparece su sección.
RN-005: Los textos se muestran como texto plano: no se interpreta formato ni código HTML. Se respetan los saltos de línea.
RN-006: Siempre se muestra la información vigente en el momento de abrirla, obtenida del backend. No se muestran identificadores internos ni fechas de registro o modificación.
RN-007: La información se presenta en un panel sobre la página de búsqueda, sin dirección propia. En el MVP no existen enlaces directos a un libro.

## Dependencias
* SPEC-000-foundation v2.0 (stack, estructura, seguridad y convenciones). Esta historia no exige cambios en la estructura de directorios.
* HU-002-Registrar Libro físico (deben existir libros registrados con título, autor y cantidad).
* HU-006-Búsqueda de libros por nombre o autor: la opción "Ver información" parte de sus resultados.
* HU-001-Inicio de sesión (necesaria para la página de búsqueda del administrador).
* HU-003-Organizar libros por estante: provee el estante que se muestra.
* HU-004-Editar Libros registrados: provee la descripción vigente, y "Editar" se ofrece desde el mismo punto de entrada. HU-005-Eliminar libro hace lo mismo con "Eliminar".
* Capacidad 8 del backlog (digitalización): es el origen de la sinopsis y el índice. No está especificada, y no existe en el MVP ninguna forma de cargarlos.
* Tabla `books` en SQLite: SPEC-001-modelo-de-datos debe reservar campos opcionales para sinopsis e índice, aunque su carga llegue después.

## Fuera de Alcance
* Digitalizar, escanear, extraer, escribir o editar la sinopsis y el índice (capacidad 8).
* Página propia de detalle por libro y enlaces directos para compartir un libro.
* Fechas de registro o modificación, historial de cambios o identificadores internos.
* Imágenes o portada del libro.
* Imprimir, descargar o compartir la información de un libro.
* Libros relacionados, sugerencias o recomendaciones.
* Reservar o solicitar préstamo de un libro (el sistema no maneja préstamos).
* Editar o eliminar libros (HU-004 y HU-005): esta historia solo coexiste con esas opciones.