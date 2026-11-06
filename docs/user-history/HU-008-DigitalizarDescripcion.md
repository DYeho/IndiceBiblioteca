# HU-008-Digitalizar sinopsis e índice

## Historia de usuario
Como administrador de biblioteca, quiero digitalizar la sinopsis y el índice de un libro, para tener una mejor contextualización de cara a la búsqueda inteligente.

## Criterio de aceptación

### CA-001-Iniciar la digitalización desde la búsqueda
**Dado** que el administrador tiene una sesión válida y buscó un libro,
**cuando** selecciona la opción "Digitalizar" en los resultados y elige si va a digitalizar la sinopsis o el índice,
**entonces** el sistema le pide seleccionar un archivo de imagen o PDF con el contenido a digitalizar.

### CA-002-Extracción y revisión
**Dado** que el administrador seleccionó un archivo válido,
**cuando** lo envía,
**entonces** el sistema extrae el texto y lo muestra en un cuadro editable para que lo revise y corrija. En este paso todavía no se guarda nada.

### CA-003-Guardar el texto revisado
**Dado** que el administrador revisó el texto extraído,
**cuando** confirma,
**entonces** el sistema guarda el texto como la sinopsis o el índice del libro, según lo elegido, y muestra un mensaje de confirmación. Tras recargar la página o reiniciar el servidor, el texto sigue guardado, y la información del libro lo muestra (HU-007).

### CA-004-Reemplazo de un texto existente
**Dado** que el libro ya tiene guardada la sección elegida (sinopsis o índice),
**cuando** el administrador llega al paso de guardar,
**entonces** el sistema advierte que el texto actual será reemplazado y solo lo reemplaza si el administrador confirma. Si no confirma, el texto actual se conserva.

### CA-005-Cancelación
**Dado** que el administrador está en cualquier paso de la digitalización antes de confirmar el guardado,
**cuando** cancela,
**entonces** el sistema no guarda nada, descarta el archivo subido y el libro conserva todos sus datos.

### CA-006-Archivo no válido
**Dado** que el administrador seleccionó un archivo que no es una imagen ni un PDF, o que supera el tamaño máximo permitido,
**cuando** lo envía,
**entonces** el sistema no lo procesa, no guarda nada e indica el motivo.

### CA-007-Fallo de extracción
**Dado** que el sistema no puede extraer texto legible del archivo, o el proceso falla,
**cuando** termina el procesamiento,
**entonces** el sistema informa que no se pudo obtener el texto, no guarda nada y permite intentar de nuevo con otro archivo.

### CA-008-Texto vacío al confirmar
**Dado** que el administrador está revisando el texto extraído,
**cuando** deja el cuadro vacío o con solo espacios y confirma,
**entonces** el sistema no guarda nada e indica que el texto no puede estar vacío.

### CA-009-Libro inexistente
**Dado** que el libro ya no existe (por ejemplo, fue eliminado durante el proceso),
**cuando** el administrador intenta continuar o guardar,
**entonces** el sistema no guarda nada e informa que el libro no existe.

### CA-010-Digitalización restringida a la Administración
**Dado** que el usuario no ha iniciado sesión o su sesión no es válida,
**cuando** intenta digitalizar o enviar un archivo,
**entonces** el sistema no le muestra la opción "Digitalizar", y si envía la solicitud de todos modos, la rechaza, no procesa ni guarda nada y exige iniciar sesión.

## Reglas del Negocio
RN-001: Solo la Administración con sesión válida puede digitalizar (ver HU-001). La opción "Digitalizar" solo se muestra a la Administración, pero el backend rechaza igualmente cualquier solicitud sin sesión válida.
RN-002: Se digitalizan únicamente la sinopsis y el índice, cada uno por separado y cada uno opcional. Un libro puede tener uno, ambos o ninguno. La descripción no se digitaliza: sigue siendo texto escrito a mano (HU-002 y HU-004).
RN-003: El texto se extrae en el servidor con una herramienta de reconocimiento de texto (OCR) de código abierto, en español, sin enviar archivos a servicios externos. La herramienta concreta se define al actualizar SPEC-000.
RN-004: Cada operación procesa un solo libro, una sola sección y un solo archivo. Se aceptan imágenes y PDF. El tipo de archivo se valida en el backend, y el tamaño máximo por archivo se define en la implementación.
RN-005: Nada se guarda sin que el administrador haya revisado el texto en un cuadro editable y haya confirmado.
RN-006: El archivo subido no se conserva. Se descarta al terminar la extracción, al fallar o al cancelar, y solo se almacena el texto confirmado.
RN-007: Al guardar sobre una sección que ya tiene texto, el sistema lo reemplaza, previa confirmación del administrador. No hay edición manual de la sinopsis ni del índice fuera de este flujo, ni historial de versiones.
RN-008: Los textos se guardan y muestran como texto plano, respetando los saltos de línea. La longitud máxima se define en SPEC-001-modelo-de-datos.
RN-009: La sinopsis y el índice digitalizados no forman parte de la búsqueda de HU-006, que sigue limitada a título y autor. Sí los usa la búsqueda con IA (HU-009). Los derechos de autor del contenido digitalizado son responsabilidad de la institución y el sistema no los valida.

## Dependencias
* SPEC-000-foundation: requiere ampliarla antes de implementar (nuevas dependencias de OCR y de recepción de archivos, y límites de tamaño). Ver las modificaciones propuestas.
* HU-001-Inicio de sesión (la digitalización exige una sesión de Administración válida).
* HU-002-Registrar Libro físico (deben existir libros registrados).
* HU-006-Búsqueda de libros por nombre o autor: la opción "Digitalizar" parte de sus resultados en la página del administrador.
* HU-007-Visualizar información: muestra la sinopsis y el índice que esta historia genera.
* HU-004 y HU-005: comparten el mismo punto de entrada, pero no son requisito.
* Tabla `books` en SQLite: SPEC-001-modelo-de-datos debe reservar campos separados para sinopsis e índice, ambos opcionales, con su longitud máxima.
* SPEC-002-contrato-api: debe separar la extracción (recepción del archivo) del guardado del texto confirmado.
* Capacidad 8 del backlog, clasificada como Posterior: no forma parte del MVP.

## Fuera de Alcance
* Digitalizar o editar la descripción (HU-002 y HU-004).
* Búsqueda con IA (HU-009) y uso de la sinopsis o el índice en la búsqueda por título o autor (HU-006).
* Edición manual de la sinopsis o el índice fuera del flujo de digitalización.
* Conservar el archivo original o la imagen subida.
* Historial de versiones, o registro de quién digitalizó qué y cuándo.
* Procesar varios archivos, varias secciones o varios libros en una sola operación.
* Reconocimiento de idiomas distintos del español, o de escritura a mano.
* Validar derechos de autor del contenido digitalizado.
* Servicios externos de OCR.
* Eliminar solo la sinopsis o solo el índice sin reemplazarlos.