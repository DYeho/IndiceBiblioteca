# HU-009-Filtrar lista de libros con IA

## Historia de usuario
Como administrador de biblioteca o estudiante, quiero describir el libro que busco, para obtener una lista de libros del catálogo seleccionados con IA.

## Criterio de aceptación

### CA-001-Búsqueda con IA exitosa
**Dado** que una persona (con o sin sesión) está en la página de búsqueda que le corresponde,
**cuando** escribe una descripción del libro que busca y selecciona "Buscar con IA",
**entonces** el sistema muestra una lista de libros registrados que se ajustan a esa descripción, cada uno con su título, autor, cantidad y estante, incluyendo la marca "agotado" cuando la cantidad es 0 y el texto "Estante no asignado" cuando no tiene estante.

### CA-002-Solo libros registrados
**Dado** que la IA propone resultados,
**cuando** el sistema los muestra,
**entonces** todos corresponden a libros realmente registrados en el catálogo. Ningún título que la IA invente o que no esté registrado aparece en la lista, y el sistema no muestra textos ni explicaciones escritos por la IA.

### CA-003-Orden y límite de resultados
**Dado** que varios libros se ajustan a la descripción,
**cuando** el sistema muestra la lista,
**entonces** los libros aparecen ordenados por relevancia, del más al menos adecuado, hasta un máximo definido en la implementación.

### CA-004-Sin coincidencias
**Dado** que ningún libro del catálogo se ajusta a la descripción, o que el catálogo está vacío,
**cuando** se ejecuta la búsqueda con IA,
**entonces** el sistema muestra un mensaje que indica que no se encontraron libros.

### CA-005-Descripción vacía
**Dado** que la persona está en la página de búsqueda,
**cuando** intenta usar "Buscar con IA" con el campo vacío o con solo espacios,
**entonces** el sistema no ejecuta la búsqueda, no consulta a la IA y muestra un mensaje que pide escribir una descripción.

### CA-006-Descripción demasiado larga
**Dado** que la persona escribe una descripción que supera la longitud máxima permitida,
**cuando** intenta buscar con IA,
**entonces** el sistema no ejecuta la búsqueda, no consulta a la IA e indica la longitud máxima permitida.

### CA-007-Aviso de sugerencia
**Dado** que el sistema muestra resultados de la búsqueda con IA,
**cuando** la persona los ve,
**entonces** junto a la lista aparece un aviso breve que indica que la selección es una sugerencia y puede no ser exacta.

### CA-008-Servicio de IA no disponible
**Dado** que el servicio de IA no responde o devuelve un error,
**cuando** la persona ejecuta la búsqueda con IA,
**entonces** el sistema informa que no se pudo completar la búsqueda y sugiere usar la búsqueda por título o autor. No reintenta automáticamente y no muestra resultados incompletos.

### CA-009-Límite de solicitudes
**Dado** que una persona supera el límite de búsquedas con IA permitido en un período,
**cuando** intenta una nueva búsqueda con IA,
**entonces** el sistema la rechaza, no consulta a la IA e indica que debe esperar antes de intentar de nuevo.

### CA-010-Opciones por perfil
**Dado** que se muestran resultados de la búsqueda con IA,
**cuando** la persona es un estudiante sin sesión,
**entonces** cada resultado le ofrece únicamente "Ver información".
**Y cuando** es un administrador con sesión válida en su página de búsqueda,
**entonces** cada resultado le ofrece "Ver información", "Editar", "Eliminar" y "Digitalizar", con las mismas reglas de HU-004, HU-005, HU-007 y HU-008.

## Reglas del Negocio
RN-001: La búsqueda con IA es de solo lectura y no modifica ningún dato. Cualquier persona puede usarla sin cuenta ni sesión. El administrador la usa desde su página de búsqueda en el área de administración, que exige sesión válida (ver HU-001).
RN-002: La búsqueda es una sola consulta en español, sin conversación ni preguntas de seguimiento. No se guardan los textos escritos ni estadísticas de uso. La opción "Buscar con IA" está en la misma página de búsqueda de cada área, junto a la búsqueda por título o autor.
RN-003: La IA considera el título, autor y descripción de cada libro y, cuando existen, su sinopsis e índice (HU-008). No usa el estante ni la cantidad como criterio. Si el catálogo no tiene sinopsis ni índice, la búsqueda funciona igual, con menor precisión.
RN-004: Los resultados son siempre libros registrados. El backend verifica que cada resultado corresponda a un libro existente y descarta cualquier otro. No se muestra texto generado por la IA. Los resultados se ordenan por relevancia con un máximo definido en la implementación. Los libros agotados o sin estante pueden aparecer.
RN-005: El servicio de IA es externo y solo se llama desde el backend. La clave de acceso se guarda en una variable de entorno y nunca está en el frontend ni en el repositorio. Al servicio se envía únicamente el texto de la consulta y los datos del catálogo indicados en RN-003; nunca datos de cuentas, sesiones o identificadores personales. La institución debe aceptar este envío antes de implementar.
RN-006: La búsqueda con IA tiene una limitación de solicitudes más estricta que la de HU-006. El umbral y la longitud máxima de la descripción se definen en la implementación y se validan en el backend.
RN-007: Si el servicio de IA falla o no responde, el sistema informa del error y sugiere la búsqueda por título o autor. No hay reintentos automáticos que multipliquen el uso del servicio.
RN-008: Todo resultado de la búsqueda con IA se acompaña de un aviso breve que advierte que es una sugerencia y puede no ser exacta.
RN-009: La búsqueda por título o autor de HU-006 no cambia: sigue funcionando sin IA y sin depender del servicio externo.

## Dependencias
* SPEC-000-foundation: requiere ampliarla antes de implementar (servicio de IA externo, clave en variables de entorno y salida a Internet desde el servidor). Ver las modificaciones propuestas.
* HU-001-Inicio de sesión (necesaria para la página de búsqueda del administrador).
* HU-002-Registrar Libro físico (deben existir libros registrados).
* HU-006-Búsqueda de libros por nombre o autor: comparte la página de búsqueda, el formato de resultados y la alternativa cuando falla la IA.
* HU-007-Visualizar información: provee la opción "Ver información".
* HU-008-Digitalizar sinopsis e índice: provee la sinopsis y el índice que la IA usa cuando existen. No es requisito: sin ellos la búsqueda funciona con menos precisión.
* HU-003-Organizar libros por estante, HU-004-Editar Libros registrados y HU-005-Eliminar libro: proveen el estante que se muestra y las opciones del administrador.
* SPEC-001-modelo-de-datos y SPEC-002-contrato-api (pendientes): el contrato debe incluir un endpoint público de búsqueda con IA con su propia limitación de solicitudes.
* Decisión de la institución: aceptar el envío de datos del catálogo a un proveedor externo, elegir el proveedor y asumir el costo de uso.
* Capacidad 9 del backlog, clasificada como Posterior: no forma parte del MVP.

## Fuera de Alcance
* Filtros manuales de la lista de libros (por estante, disponibilidad u otros).
* Conversaciones con la IA, preguntas de seguimiento e historial de consultas.
* Explicaciones, resúmenes o recomendaciones escritos por la IA.
* Mostrar libros que no estén registrados en el catálogo.
* IA que se ejecute dentro del servidor institucional.
* Usar el estante o la cantidad como criterio de la IA.
* Entrenar o ajustar un modelo con el catálogo.
* Idiomas distintos del español, búsqueda por voz o por imagen.
* Estadísticas o registro de las consultas de los estudiantes.
* Cambios en la búsqueda por título o autor (HU-006).