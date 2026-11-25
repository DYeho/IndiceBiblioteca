# SPEC-002-estante-edicion-eliminacion

## 1. Encabezado

| Campo | Valor |
|---|---|
| **Proyecto** | Índice Biblioteca |
| **Tipo** | Especificación funcional (Sprint 2) |
| **Versión** | 0.1 |
| **Estado** | Aprobado |
| **Fecha** | 20/11/2026 |
| **Base** | SPEC-000-foundation v2.2 y SPEC-001-acceso-registro-busqueda |
| **Archivo** | `docs/SPECT/SPECT-002-Estante-Edicion-Eliminacion.md` |

## 2. Propósito y HU relacionadas

Esta especificación define cómo se construyen las tres historias de usuario del Sprint 2: modelo de datos, API, interfaz, seguridad y pruebas. No repite lo ya fijado en SPEC-000 ni en SPEC-001; lo extiende.

| HU | Nombre | Perfil | Capacidad |
|---|---|---|---|
| HU-003 | Organizar libros por estante | Administración | 3 |
| HU-004 | Editar libros registrados | Administración | 4 |
| HU-005 | Eliminar libro | Administración | 5 |

También completa una parte de HU-006: las acciones «Editar» y «Eliminar» de la tarjeta del administrador (CA-010). «Ver información» pertenece a la capacidad 7, que no entra en este sprint.

Orden de construcción: verificación previa → HU-003 → HU-004 → HU-005.

Este documento es estable. El estado de las tareas se lleva en `docs/sprint/SPRINT-002-backlog.md`.

### 2.1. Decisiones incorporadas

La numeración continúa la de SPEC-001 (última: D-13).

| ID | Decisión |
|---|---|
| D-14 | Las listas de asignación de estante (libros sin estante y libros con estante) son la única excepción al principio «no existe listado del catálogo» (SPEC-000 §10 #2). Solo la Administración con sesión las consulta. Los estudiantes no tienen ningún listado. Se propone actualizar SPEC-000 (Anexo B). |
| D-15 | Las listas se obtienen con `GET /api/shelf-assignments?status=unassigned\|assigned`, y el estante se asigna con `PUT /api/books/:id/shelf`. `GET /api/books?q=` sigue público, con `q` obligatorio y sin listado. |
| D-16 | `GET /api/books/:id` existe solo para la Administración, para llenar el formulario de edición (la búsqueda no devuelve la descripción). No es la capacidad 7 y no se expone a los estudiantes. |
| D-17 | La edición usa `PUT /api/books/:id` con los cuatro datos editables. Si el cuerpo trae `shelfLabel`, se rechaza con 400. Una descripción ausente, nula o vacía borra la descripción guardada. Los demás campos desconocidos se ignoran, igual que en el registro. |
| D-18 | `updated_at` cambia solo cuando cambia algún dato. Guardar valores idénticos a los guardados, o asignar la misma etiqueta de estante, responde 200 sin modificar `updated_at`. |
| D-19 | `DELETE /api/books/:id` responde 204 sin cuerpo, o 404 si el libro no existe. Es un borrado físico en una sola sentencia. |
| D-20 | Un identificador que no sea un entero positivo se trata como un libro inexistente (404 `NOT_FOUND`), no como un error de formato. |
| D-21 | En las rutas con identificador, el orden de comprobaciones es: existencia del libro → validación del cuerpo → duplicado. El 404 prevalece sobre el 400. |
| D-22 | No hay cambios de esquema ni migraciones. `schema_migrations` sigue vacía (esto corrige SPEC-001 D-11, que preveía la primera migración en el Sprint 2). La tarea de verificación previa (T-28) confirma que las restricciones necesarias ya existen. |
| D-23 | `admin/index.html` pasa de dos a cuatro secciones: «Buscar libros», «Registrar libro», «Asignar estantes» y «Editar libro». Esta última no tiene botón propio en el encabezado: se abre desde «Editar» en una tarjeta. |
| D-24 | La confirmación de eliminación usa el elemento `<dialog>` nativo. El backend no exige ningún token de confirmación (la confirmación es de interfaz, SPEC-000 §10 #7). |
| D-25 | Al guardar una edición o al eliminar un libro, se vuelve a «Buscar libros» y se repite la última búsqueda, para que la lista refleje la base de datos. Un libro editado puede dejar de coincidir con el texto buscado. |
| D-26 | El mensaje 409 del registro sigue sin enlace de edición: la respuesta no devuelve el identificador del libro existente. La persona usa la búsqueda y «Editar». (Resuelve el aplazamiento de SPEC-001 §7.2.) |
| D-27 | «Ver información» y el panel de detalle se difieren con la capacidad 7 (SPEC-001 §7.5 los preveía para el Sprint 2). HU-006 CA-009 y CA-010 siguen parcialmente verificadas. |
| D-28 | El menú de tres puntos tiene una única opción: «Ver libros con estante asignado» (HU-003 deja fuera las demás). Para volver a la lista sin estante se pulsa de nuevo «Asignar estantes». |

## 3. Alcance y fuera de alcance

### 3.1. Dentro del alcance

- Verificación previa: ejecutar la suite de pruebas del Sprint 1 y confirmar las restricciones del esquema (T-27 y T-28).
- HU-003: listas de libros sin estante y con estante, asignación y cambio de la etiqueta de estante.
- HU-004: lectura de un libro por identificador (solo Administración) y edición de título, autor, descripción y cantidad.
- HU-005: eliminación de un libro con confirmación previa.
- Acciones «Editar» y «Eliminar» en la tarjeta del administrador (cierre parcial de HU-006 CA-010).
- Componentes de interfaz nuevos: botón de peligro, diálogo de confirmación, menú de opciones y fila de lista de asignación.

### 3.2. Fuera del alcance

- «Ver información», panel de detalle y capacidad 7 (D-27).
- Quitar el estante de un libro y dejarlo sin ubicación.
- Asignar una etiqueta a varios libros a la vez; edición o eliminación de varios libros a la vez.
- Búsqueda, filtros, orden elegido o paginación dentro de las listas de asignación.
- Otras opciones del menú de tres puntos.
- Papelera, deshacer, historial o auditoría de cambios y eliminaciones.
- Control de concurrencia entre cuentas (gana la última escritura).
- Campos adicionales (ISBN, editorial, año, categoría, portada), digitalización (HU-008) y filtrado con IA (HU-009).
- Un mecanismo de ejecución de migraciones (no hace falta mientras no haya migraciones, D-22).
- Despliegue, configuración de Nginx y respaldos (SPEC-000 §8.3).

### 3.3. Dependencias de paquetes

Ninguna nueva. Se mantienen las de SPEC-001 §3.3.

### 3.4. Archivos nuevos o modificados respecto a SPEC-001

No se crean directorios nuevos. Se añaden y modifican archivos dentro de directorios existentes:

| Archivo | Cambio |
|---|---|
| `src/modules/books/shelf-assignments.routes.js` | Nuevo. Rutas de `/api/shelf-assignments`. Usa el controlador, el servicio y el repositorio de `books`. |
| `src/modules/books/books.repository.js`, `books.service.js`, `books.controller.js` y sus rutas | Se amplían con listas, asignación, lectura por id, edición y eliminación. |
| `src/app.js` | Monta `/api/shelf-assignments` (§6.6). |
| `public/admin/index.html` | Pasa a cuatro secciones (D-23). |
| `public/js/admin/main.js` | Coordina las cuatro secciones. |
| `public/js/admin/books.js` | Rellena el contenedor de acciones de la tarjeta con «Editar» y «Eliminar». |
| `public/js/admin/shelves.js` | Nuevo. Sección «Asignar estantes». |
| `public/js/admin/book-edit.js` | Nuevo. Sección «Editar libro». |
| `public/js/admin/book-delete.js` | Nuevo. Diálogo de confirmación y eliminación. |
| `public/css/components.css` y `public/css/admin.css` | Botón de peligro, diálogo, menú de opciones, fila de lista de asignación. |
| `tests/books/shelf.test.js`, `edit.test.js` y `delete.test.js` | Nuevos. Pruebas de este sprint. |

## 4. Reglas de negocio

### 4.1. Estante (HU-003)

| ID | Regla |
|---|---|
| RN-S01 | Solo la Administración con sesión válida asigna estantes y consulta las listas de asignación. |
| RN-S02 | El estante es una etiqueta de texto que registra la ubicación del libro. No es una entidad: no se crean, renombran ni eliminan estantes por separado. El sistema no ubica ni traslada libros físicos. |
| RN-S03 | La etiqueta la elige libremente la Administración. Se eliminan los espacios al inicio y al final, y mide de 1 a 30 caracteres. Se guarda tal como se escribe: no se normalizan mayúsculas, tildes ni espacios internos. No se valida contra una lista de estantes. |
| RN-S04 | Un libro tiene como máximo un estante. Asignar uno nuevo reemplaza el anterior y no modifica título, autor, descripción ni cantidad. |
| RN-S05 | Varios libros pueden compartir estante. La etiqueta no es única entre libros. |
| RN-S06 | Un libro está «sin estante» mientras `shelf_label` sea nulo. Todo libro recién registrado está sin estante. Cada libro aparece en exactamente una de las dos listas, sea cual sea su cantidad (incluido 0). |
| RN-S07 | Las listas se ordenan igual que la búsqueda: título normalizado, autor normalizado e identificador. No tienen búsqueda, filtros ni paginación. |
| RN-S08 | No se puede quitar el estante: la etiqueta enviada nunca es nula ni vacía. |
| RN-S09 | Asignar a un libro la misma etiqueta que ya tiene (tras recortar) es un éxito y no modifica `updated_at` (D-18). |

### 4.2. Edición (HU-004)

| ID | Regla |
|---|---|
| RN-E01 | Solo la Administración con sesión válida lee un libro por identificador y lo edita. |
| RN-E02 | Los datos editables son título, autor, descripción y cantidad. El estante no se edita aquí: se cambia únicamente con HU-003. |
| RN-E03 | Título y autor son obligatorios: tras quitar espacios al inicio y al final miden de 1 a 200 (título) y de 1 a 150 (autor), y su texto normalizado no queda vacío. La descripción es opcional, de hasta 2000 caracteres; vacía o solo con espacios se guarda como «sin descripción». |
| RN-E04 | La cantidad se edita escribiendo el valor total nuevo: un entero de 0 a 999. No se suma ni se resta. Un libro con cantidad 0 sigue registrado y solo se retira eliminándolo. |
| RN-E05 | No pueden existir dos libros con el mismo título y autor, comparados con los textos normalizados (RN-T01). Al editar, el libro no se compara consigo mismo. Se verifica en el servicio y con la restricción `UNIQUE` de la base de datos. |
| RN-E06 | Si algún dato es inválido, no se guarda ningún cambio. |
| RN-E07 | Editar actualiza `updated_at` solo si cambia algún dato (D-18). `id` y `created_at` nunca cambian. No se guarda historial de cambios. |
| RN-E08 | Editar un libro no modifica otros libros ni su estante. |
| RN-E09 | La edición reemplaza los cuatro datos con lo enviado. La interfaz siempre envía los cuatro. |

### 4.3. Eliminación (HU-005)

| ID | Regla |
|---|---|
| RN-D01 | Solo la Administración con sesión válida elimina libros. Cualquier cuenta de Administración puede eliminar cualquier libro. |
| RN-D02 | La eliminación es definitiva: se borra la fila completa (título, autor, descripción, cantidad y estante). No hay papelera, recuperación ni historial. Para recuperar el libro se registra de nuevo. |
| RN-D03 | Antes de eliminar, la interfaz pide confirmación mostrando título, autor y cantidad. Si la cantidad es 1 o más, indica cuántos ejemplares se dejarán de registrar. Sin confirmación no se envía la solicitud. |
| RN-D04 | Se puede eliminar un libro con cualquier cantidad, incluido 0. |
| RN-D05 | Se elimina un solo libro por operación. |
| RN-D06 | Eliminar un libro no modifica otros libros. Su título y autor quedan libres para registrar un libro nuevo. |
| RN-D07 | La operación es completa o no ocurre: se ejecuta en una sola sentencia. |

### 4.4. Reglas transversales

| ID | Regla |
|---|---|
| RN-T06 | Un identificador de libro que no sea un entero positivo, o que no exista, produce 404 `NOT_FOUND` con el mensaje «El libro no existe.» (D-20). |
| RN-T07 | Acciones por perfil: la interfaz del estudiante nunca incluye «Editar» ni «Eliminar». La tarjeta del administrador ofrece «Editar» y «Eliminar». «Ver información» llega con la capacidad 7 (D-27). Sustituye a RN-B07 de SPEC-001. |

## 5. Modelo de datos

### 5.1. Sin cambios estructurales

No se crean ni modifican tablas ni columnas (D-22). `schema.sql` no cambia y `schema_migrations` sigue vacía.

### 5.2. Uso de las columnas existentes

| Columna de `books` | Uso en este sprint |
|---|---|
| `shelf_label` | Nulo = sin estante. La asignación guarda la etiqueta recortada, de 1 a 30 caracteres. |
| `title`, `author`, `description`, `quantity` | Editables (HU-004). `quantity` entre 0 y 999. |
| `title_normalized`, `author_normalized` | El servicio los recalcula cada vez que se edita el título o el autor. |
| `updated_at` | Se actualiza al cambiar algún dato, con el mismo formato de fecha que `created_at`. |
| `id`, `created_at` | No cambian nunca. |

### 5.3. Verificación previa (T-28)

SPEC-001 §5.2 define como restricciones: `quantity` entre 0 y 999, `shelf_label` de 1 a 30 caracteres cuando existe y `UNIQUE (title_normalized, author_normalized)`. Antes de empezar HU-003 se comprueba en `schema.sql` que esas restricciones están. Si alguna falta, el trabajo se detiene y se decide cómo aplicarla, porque todavía no existe un ejecutor de migraciones (SPEC-000 §4.11). No se improvisa un mecanismo.

### 5.4. Notas

- Las listas recorren la tabla con `WHERE shelf_label IS NULL` o `IS NOT NULL`. No se crea ningún índice: es aceptable para el tamaño de un catálogo escolar.
- Eliminar un libro libera su combinación de título y autor, porque la restricción `UNIQUE` desaparece con la fila.

## 6. Contrato de la API

Formato de éxito y de error según SPEC-000 §4.7. Todas las rutas son JSON. Las solicitudes que modifican exigen `Content-Type: application/json` y `Origin` permitido (SPEC-001 §8.2), incluido `DELETE`. Todas las rutas de este sprint exigen sesión de Administración, también las de lectura. Las comprobaciones comunes (sesión, origen, tipo de contenido) son las de SPEC-001 §6.2 y §6.6.

Representación de un libro (se llama «libro completo» en las tablas): `id`, `title`, `author`, `description` (nulo si no hay), `quantity`, `shelfLabel` (nulo si no tiene), `createdAt` y `updatedAt`. Nunca incluye las columnas normalizadas.

### 6.1. `GET /api/shelf-assignments?status=` (HU-003)

**Entrada:** parámetro `status`, obligatorio, con uno de dos valores: `unassigned` (libros sin estante) o `assigned` (libros con estante). Debe aparecer una sola vez.

| Resultado | HTTP | Cuerpo |
|---|---|---|
| Éxito | 200 | `data`: lista de libros con `id`, `title`, `author`, `quantity` y `shelfLabel` (nulo en `unassigned`). `meta.total` con su cantidad. Sin descripción ni columnas normalizadas. |
| `status` ausente, repetido o con otro valor | 400 | `VALIDATION_ERROR` con `fields.status`: «Indique si desea los libros sin estante o con estante.» |
| Sin sesión | 401 | `UNAUTHENTICATED`: «Debe iniciar sesión.» |

Lista vacía (catálogo vacío o sin libros en esa lista): 200 con `data` vacío y `total` 0. No es un error. Orden: `title_normalized`, `author_normalized`, `id`.

### 6.2. `PUT /api/books/:id/shelf` (HU-003)

**Entrada:** `shelfLabel`.

**Orden de comprobaciones:** comprobaciones comunes → existencia del libro → validación (D-21).

| Campo | Regla | Mensaje |
|---|---|---|
| `shelfLabel` | Obligatorio y de tipo texto. Tras recortar, de 1 a 30 caracteres. | Ausente, nulo o vacío: «El estante es obligatorio.» No es texto: «El estante debe ser texto.» Más de 30: «El estante no puede superar 30 caracteres.» |

| Resultado | HTTP | Cuerpo |
|---|---|---|
| Asignado o actualizado | 200 | `data` con el libro completo y el estante guardado (recortado). |
| Misma etiqueta que ya tenía | 200 | Igual, sin modificar `updatedAt` (D-18). |
| Etiqueta inválida | 400 | `VALIDATION_ERROR`, con `fields.shelfLabel`. El libro no cambia. |
| Sin sesión | 401 | `UNAUTHENTICATED`. |
| Origen no permitido | 403 | `FORBIDDEN`. |
| Libro inexistente o `id` inválido | 404 | `NOT_FOUND`: «El libro no existe.» |

### 6.3. `GET /api/books/:id` (HU-004)

| Resultado | HTTP | Cuerpo |
|---|---|---|
| Éxito | 200 | `data` con el libro completo. |
| Sin sesión | 401 | `UNAUTHENTICATED`. |
| Libro inexistente o `id` inválido | 404 | `NOT_FOUND`: «El libro no existe.» |

Esta ruta no es pública (D-16). La consulta pública de detalle se definirá con la capacidad 7.

### 6.4. `PUT /api/books/:id` (HU-004)

**Entrada:** `title`, `author`, `description` (opcional) y `quantity`. El cuerpo debe ser un objeto JSON.

**Orden de comprobaciones:** comprobaciones comunes → existencia del libro → validación → duplicado (D-21).

**Validación (todos los errores se devuelven juntos en `fields`):**

| Campo | Regla | Mensaje |
|---|---|---|
| `title` | Texto, de 1 a 200 caracteres tras recortar, normalizado no vacío. | «El título es obligatorio.» / «El título no puede superar 200 caracteres.» |
| `author` | Texto, de 1 a 150 caracteres tras recortar, normalizado no vacío. | «El autor es obligatorio.» / «El autor no puede superar 150 caracteres.» |
| `description` | Ausente, nulo o texto. Si es texto, máximo 2000 tras recortar. Vacío se guarda como nulo. | «La descripción no puede superar 2000 caracteres.» |
| `quantity` | Obligatoria. Debe ser un número entero JSON de 0 a 999. Un texto como `"5"` no es válido. | Ausente: «La cantidad es obligatoria.» Inválida: «La cantidad debe ser un número entero entre 0 y 999.» |
| `shelfLabel` | No permitido. Si la clave está presente, con cualquier valor (incluso nulo), se rechaza (D-17). | «El estante no se modifica desde la edición. Use “Asignar estantes”.» |

| Resultado | HTTP | Cuerpo |
|---|---|---|
| Actualizado | 200 | `data` con el libro completo. Los textos son los guardados, ya recortados. |
| Datos idénticos a los guardados | 200 | Igual, sin modificar `updatedAt` (D-18). |
| Datos inválidos | 400 | `VALIDATION_ERROR`, con `fields`. No se guarda nada. |
| Sin sesión | 401 | `UNAUTHENTICATED`. |
| Origen no permitido | 403 | `FORBIDDEN`. |
| Libro inexistente o `id` inválido | 404 | `NOT_FOUND`: «El libro no existe.» |
| Duplicado | 409 | `CONFLICT`: «Ese libro ya existe. Edite el libro existente.» |

**Duplicados:** el servicio calcula las claves normalizadas y consulta si existe otro libro (con distinto `id`) que las tenga. Si dos solicitudes simultáneas pasan esa comprobación, la violación `UNIQUE` de la base de datos también se traduce a 409. Si el libro desaparece entre la lectura y la actualización, la sentencia no modifica filas y se responde 404. Si algo falla, no se guarda nada.

### 6.5. `DELETE /api/books/:id` (HU-005)

| Resultado | HTTP | Cuerpo |
|---|---|---|
| Eliminado | 204 | Sin cuerpo. |
| Sin sesión | 401 | `UNAUTHENTICATED`. |
| Origen no permitido | 403 | `FORBIDDEN`. |
| Libro inexistente, ya eliminado o `id` inválido | 404 | `NOT_FOUND`: «El libro no existe.» |

**Comportamiento interno:** una sola sentencia `DELETE ... WHERE id = ?`. Si no afecta ninguna fila, 404. No existe una ruta para eliminar varios libros: `DELETE /api/books` sin identificador responde 404 (404 JSON general de SPEC-001 §6.6) y no elimina nada.

### 6.6. Orden de middlewares en `app.js`

Igual que SPEC-001 §6.6, con una sola diferencia en el paso 5: las rutas son `/api/auth`, `/api/books` y `/api/shelf-assignments`.

## 7. Interfaz

Se respeta SPEC-000 §9 y se amplía SPEC-001 §7: español, mobile-first (600 y 900 px), plantilla común, sin estilos ni scripts inline, sin recursos de terceros, `textContent` para datos de la API y accesibilidad mínima. Los módulos no llaman a `fetch` directamente: usan `shared/api.js`, que redirige a `/login.html` ante un 401 en el área de administración. `api.js` debe manejar la respuesta 204 sin cuerpo, como ya hace el cierre de sesión. Una sesión vencida se detecta ahora también al cargar las listas y al abrir un libro para editar.

### 7.1. `admin/index.html`: estructura

- Encabezado con el nombre de la aplicación, «Administración» y los botones «Buscar libros», «Registrar libro», «Asignar estantes» y «Cerrar sesión».
- Cuatro secciones (D-23), una visible a la vez. Al cargar se muestra «Buscar libros». El botón de la sección activa se marca con `aria-current`. Mientras se ve «Editar libro» se marca «Buscar libros», por ser su origen.
- Todas las secciones tienen una zona de mensajes con `aria-live`.

### 7.2. Sección «Asignar estantes» (HU-003)

Cada vez que se pulsa «Asignar estantes» se muestra la lista de libros sin estante, recargada desde el servidor.

**Estructura:**
- `<h2>` «Libros sin estante» o «Libros con estante asignado», según la lista visible.
- Botón de menú en la esquina superior de la sección, con nombre accesible «Más opciones» y el símbolo «⋮» decorativo (`aria-hidden`). Usa `aria-expanded` y `aria-controls`. El panel contiene un único botón, «Ver libros con estante asignado» (D-28). Se cierra con Escape (el foco vuelve al botón de menú) y al hacer clic fuera.
- Resumen de la lista y la lista de libros.

**Estados de la lista:**

| Estado | Texto |
|---|---|
| Cargando | «Cargando…» |
| Sin estante, con libros | «N libros sin estante.» (singular: «1 libro sin estante.») |
| Con estante, con libros | «N libros con estante asignado.» (singular: «1 libro con estante asignado.») |
| Sin estante, vacía | «No hay libros sin estante.» |
| Con estante, vacía | «No hay libros con estante asignado.» |
| Error al cargar | «No se pudieron cargar los libros. Inténtelo de nuevo.» |

**Elemento de la lista:**
- Título como encabezado `<h3>`, «Autor: …» y «Cantidad: N». Si N es 0, la insignia con el texto «agotado» junto a la cantidad (no solo color). En la lista con estante, «Estante: …».
- Formulario propio con la etiqueta «Estante» (campo de texto, `maxlength` 30, descrito por el título del libro mediante `aria-describedby`) y el botón «Asignar estante» (lista sin estante) o «Cambiar estante» (lista con estante).
- El formulario usa `novalidate`. La validación visible usa los mismos mensajes que el backend, que es siempre la autoridad. El botón se desactiva mientras se espera la respuesta.

**Resultados de la acción:**

| Situación | Resultado |
|---|---|
| Éxito en la lista sin estante | Mensaje «Estante «A-3» asignado a «título».» El libro se retira de la lista, se actualiza el resumen y el foco pasa al encabezado de la lista. |
| Éxito en la lista con estante | La fila muestra el nuevo estante y el campo se vacía. Mensaje «Estante de «título» cambiado a «A-4».» El foco permanece en el campo. |
| 400 | El mensaje aparece junto al campo con `aria-describedby`. El foco va al campo. Se conserva el valor escrito y el libro conserva su estado. |
| 404 | Alerta «El libro no existe.» y se recarga la lista. |
| 401 | `api.js` redirige a `/login.html`. |
| Otro error | «No se pudo asignar el estante. Inténtelo de nuevo.» |

### 7.3. Búsqueda del administrador y tarjeta (HU-006, HU-004, HU-005)

Se mantienen las reglas de SPEC-001 §7.4. El contenedor de acciones de la tarjeta del administrador se rellena con dos botones: «Editar» (secundario) y «Eliminar» (de peligro). Cada botón lleva un nombre accesible que incluye el título del libro («Editar «título»», «Eliminar «título»»). «Ver información» no aparece (D-27). La tarjeta del estudiante no cambia.

### 7.4. Sección «Editar libro» (HU-004)

Al pulsar «Editar» se muestra la sección con «Cargando…» y se consulta `GET /api/books/:id`.

**Formulario:**

| Elemento | Detalle |
|---|---|
| Título | Etiqueta «Título», obligatorio, `maxlength` 200. |
| Autor | Etiqueta «Autor», obligatorio, `maxlength` 150. |
| Descripción | Etiqueta «Descripción (opcional)», área de texto, `maxlength` 2000. |
| Cantidad | Etiqueta «Cantidad». Campo de texto con teclado numérico, no `type="number"`, para que un texto no numérico reciba el mensaje correcto. |
| Estante | Solo lectura: «Estante: …» o «Estante no asignado», con la nota «El estante se cambia en “Asignar estantes”.» |
| Botones | «Guardar cambios» y «Cancelar». |

Los campos se llenan con los valores actuales. El formulario usa `novalidate`, con los mismos mensajes que el backend.

| Situación | Resultado |
|---|---|
| Éxito (200) | Vuelve a «Buscar libros», repite la última búsqueda (D-25) y muestra «Libro actualizado correctamente: «título» de autor, N ejemplares.» (singular: «1 ejemplar»). El foco va a la zona de mensajes. |
| 400 | Cada mensaje junto a su campo, con `aria-describedby`. Resumen de error. El foco va al primer campo inválido. Se conservan los valores. |
| 409 | Alerta «Ese libro ya existe. Edite el libro existente.» Se conservan los valores. |
| 404 (al cargar o al guardar) | «El libro no existe.» Vuelve a «Buscar libros» y repite la búsqueda. |
| 401 | `api.js` redirige a `/login.html`. |
| Otro error | Al cargar: «No se pudo cargar el libro. Inténtelo de nuevo.» Al guardar: «No se pudieron guardar los cambios. Inténtelo de nuevo.» |
| Cancelar | Vuelve a «Buscar libros» sin guardar. El foco vuelve al botón «Editar» de esa tarjeta, si sigue en la lista. |

### 7.5. Eliminación con confirmación (HU-005)

«Eliminar» abre un `<dialog>` modal (`showModal()`), con título «¿Eliminar este libro?» enlazado con `aria-labelledby`.

**Contenido:** el título del libro, «Autor: …», «Cantidad: N» y «Esta acción no se puede deshacer.» Si N es 1 o más, se añade «Se dejarán de registrar N ejemplares.» (singular: «Se dejará de registrar 1 ejemplar.»). Los datos son los de la tarjeta desde la que se abrió. **Botones:** «Cancelar» (con el foco inicial) y «Eliminar libro» (de peligro).

| Situación | Resultado |
|---|---|
| Cancelar o Escape | Cierra el diálogo sin enviar nada. El foco vuelve al botón «Eliminar» de origen. |
| Confirmar | Desactiva los botones mientras espera la respuesta. |
| 204 | Cierra el diálogo, vuelve a repetir la última búsqueda (D-25) y muestra «Libro eliminado: «título» de autor.» El foco va a la zona de mensajes. |
| 404 | Cierra el diálogo, muestra «El libro no existe. Puede que ya haya sido eliminado.» y repite la búsqueda. |
| 401 | `api.js` redirige a `/login.html`. |
| Otro error | El diálogo sigue abierto con «No se pudo eliminar el libro. Inténtelo de nuevo.» |

### 7.6. Componentes nuevos

- Botón de peligro: se distingue por el texto además del color. Contraste mínimo 4.5:1.
- Diálogo de confirmación: estilos propios del elemento `<dialog>` y de su fondo.
- Menú de opciones: botón y panel desplegable.
- Elemento de lista de asignación: tarjeta con formulario.
- Todos usan los tokens de SPEC-000 §9.2. No se añaden valores sueltos.

## 8. Seguridad

- `requireAdmin` protege todas las rutas nuevas, incluidas las de lectura: `GET /api/shelf-assignments` y `GET /api/books/:id` no son públicas.
- `PUT` y `DELETE` pasan por la verificación de `Origin` y de `Content-Type` de SPEC-001 §8.2. `DELETE` también.
- Todas las consultas son parametrizadas. El identificador de la ruta se valida como entero positivo antes de usarse.
- Los datos de la API se muestran con `textContent`, nunca con `innerHTML`. Una etiqueta de estante o un título con marcas HTML se guardan y se muestran como texto.
- La descripción solo se expone por `GET /api/books/:id`, que exige sesión. La búsqueda pública no la devuelve.
- Los mensajes de error no revelan información interna. Los cuerpos de las solicitudes no se registran.
- Se mantiene el límite general de 100 solicitudes por IP por minuto en `/api`.
- La eliminación es irreversible. La protección es la confirmación en la interfaz, el control de acceso y la restricción a la Administración.

## 9. Casos de prueba

Pruebas con `node:test` y `node:assert`, sin frameworks nuevos. Se usa `tests/test-app.js` (servidor en puerto efímero, base temporal creada desde `schema.sql`). Los libros agotados o con estante pueden prepararse ahora mediante la propia API de este sprint, o directamente en la base de pruebas.

**Pruebas del Sprint 1:** la suite completa (PN, PA, PB y PC) se ejecuta antes de empezar HU-003 y se registra el resultado (T-27). Ninguna prueba nueva debe romperla.

### 9.1. Asignación de estante (`tests/books/shelf.test.js`)

| ID | Caso | CA |
|---|---|---|
| PD-01 | Sin sesión, `GET /api/shelf-assignments` y `PUT /api/books/:id/shelf`: 401 y nada cambia. | HU-003 CA-008 |
| PD-02 | `status=unassigned`: devuelve solo libros con `shelfLabel` nulo, con `id`, `title`, `author` y `quantity`, ordenados y con `total` correcto. | CA-001 |
| PD-03 | Un libro recién registrado aparece en `unassigned` y no en `assigned`. | CA-001, RN-S06 |
| PD-04 | Catálogo vacío o sin libros en la lista: 200, lista vacía, `total` 0. | CA-002 |
| PD-05 | Un libro con cantidad 0 aparece en la lista que le corresponde. | RN-S06 |
| PD-06 | Asignación válida: 200, la etiqueta se devuelve recortada, el libro pasa de `unassigned` a `assigned` y sus otros datos y los de otros libros no cambian. | CA-003 |
| PD-07 | Tras asignar, reabrir la base y la aplicación conserva el estante. | CA-003 |
| PD-08 | Etiqueta ausente, nula, vacía o solo espacios: 400 con `fields.shelfLabel` y el libro conserva su estado. | CA-004 |
| PD-09 | Etiqueta de 30 caracteres: 200. De 31: 400. | CA-004 |
| PD-10 | Etiqueta que no es texto (número, objeto, lista): 400. | CA-004 |
| PD-11 | Libro inexistente o con `id` inválido (`abc`, `0`, `-1`, `1.5`): 404 `NOT_FOUND` y nada cambia. | CA-005, D-20 |
| PD-12 | `status=assigned`: devuelve los libros con estante, con `shelfLabel` actual y mismo orden. | CA-006 |
| PD-13 | Asignar una etiqueta distinta sustituye la anterior sin modificar ningún otro dato ni otros libros. Cambia `updatedAt` y no `createdAt`. | CA-007, RN-S04 |
| PD-14 | Asignar la misma etiqueta (también con espacios sobrantes): 200 y `updatedAt` sin cambios. | RN-S09, D-18 |
| PD-15 | Mayúsculas y espacios internos se guardan tal como se escriben (`" Pasillo  2 "` → `"Pasillo  2"`). | RN-S03 |
| PD-16 | `status` ausente, repetido o con valor distinto de `unassigned` y `assigned`: 400 con `fields.status`. | §6.1 |
| PD-17 | Dos libros pueden compartir la misma etiqueta. | RN-S05 |
| PD-18 | JSON mal formado: 400. `Origin` distinto: 403. `Content-Type` no JSON: 400. | SPEC-001 §8.2 |
| PD-19 | Directo sobre la base: `CHECK` rechaza `shelf_label` vacío o de más de 30 caracteres. | §5.3 |
| PD-20 | La suma de `total` de `unassigned` y `assigned` es igual al total de libros, y ningún libro aparece en ambas. | RN-S06 |

### 9.2. Edición (`tests/books/edit.test.js`)

| ID | Caso | CA |
|---|---|---|
| PE-01 | Sin sesión, `GET` y `PUT /api/books/:id`: 401 y nada cambia. | HU-004 CA-008 |
| PE-02 | `GET /api/books/:id` con sesión: 200 con todos los campos, con `description` nula si no tiene. | CA-001 |
| PE-03 | `GET` de un libro inexistente o con `id` inválido: 404. | CA-007 |
| PE-04 | `PUT` válido de uno o más datos: 200. Los datos devueltos coinciden con los enviados (recortados) y persisten tras reabrir la base. | CA-002 |
| PE-05 | Cantidad 0: 200. El libro sigue registrado y aparece en la búsqueda con cantidad 0. | CA-003 |
| PE-06 | Título o autor ausente, vacío o solo espacios, o cantidad ausente: 400 con los campos correspondientes. Todo vacío: los tres campos. Nada cambia. | CA-004 |
| PE-07 | Cantidad -1, 1.5, `"5"`, `"abc"`, nula o 1000: 400 con `fields.quantity`. Cantidades 0 y 999: 200. | CA-005 |
| PE-08 | Límites de longitud: título 200 sí y 201 no, autor 150 y 151, descripción 2000 y 2001. | CA-004 |
| PE-09 | Descripción ausente, nula, vacía o solo espacios: 200 y `description` nula (borra la anterior). | RN-E09 |
| PE-10 | Cambiar título o autor para igualar a otro libro (también con otras mayúsculas, espacios o tildes): 409 y nada cambia. | CA-006 |
| PE-11 | Guardar sin cambiar título ni autor, o cambiando solo mayúsculas o tildes del propio libro, no es duplicado: 200. | RN-E05 |
| PE-12 | Si la comprobación previa de duplicado no lo detecta (se simula omitiéndola), la violación `UNIQUE` se traduce igual a 409. | RN-E05 |
| PE-13 | `PUT` de un libro inexistente: 404, incluso con un cuerpo inválido (el 404 prevalece). | CA-007, D-21 |
| PE-14 | `shelfLabel` en el cuerpo (con cualquier valor, incluido nulo): 400 con `fields.shelfLabel` y el estante no cambia. | RN-E02, D-17 |
| PE-15 | Tras editar el título, la búsqueda por el título nuevo lo encuentra y por el antiguo no (se recalculan las columnas normalizadas). | RN-E05 |
| PE-16 | Enviar los mismos valores que están guardados: 200 y `updatedAt` sin cambios. | D-18 |
| PE-17 | Una edición con cambios actualiza `updatedAt` y no cambia `id`, `createdAt`, el estante ni otros libros. | RN-E07, RN-E08 |
| PE-18 | Con un campo válido y otro inválido, no se guarda ninguno. | RN-E06 |
| PE-19 | Un título con marcas HTML se guarda y se devuelve como texto, sin cambios. | §8 |
| PE-20 | JSON mal formado: 400. `Origin` distinto: 403. `Content-Type` no JSON: 400. | SPEC-001 §8.2 |

### 9.3. Eliminación (`tests/books/delete.test.js`)

| ID | Caso | CA |
|---|---|---|
| PF-01 | Sin sesión, `DELETE /api/books/:id`: 401 y el libro sigue existiendo. | HU-005 CA-008 |
| PF-02 | Eliminar un libro con cantidad de 1 o más: 204 sin cuerpo. Después, `GET` por id da 404 y la búsqueda ya no lo devuelve. | CA-002, CA-005 |
| PF-03 | Eliminar un libro con cantidad 0: 204. | CA-004 |
| PF-04 | Tras eliminar, reabrir la base y la aplicación: el libro sigue sin existir. | CA-002 |
| PF-05 | Eliminar un libro inexistente, ya eliminado o con `id` inválido: 404 y nada cambia. | CA-006 |
| PF-06 | Eliminar un libro no modifica los demás. | CA-007, RN-D06 |
| PF-07 | El libro eliminado no aparece en `unassigned` ni en `assigned` ni en la búsqueda. | CA-007 |
| PF-08 | Registrar el mismo título y autor tras eliminar: 201. | CA-007, RN-D06 |
| PF-09 | Un libro con estante se elimina completo: no queda ninguna fila con su `id`. | RN-D02 |
| PF-10 | `Origin` distinto: 403 y el libro sigue existiendo. | SPEC-001 §8.2 |
| PF-11 | `DELETE /api/books` sin identificador: 404 y no se elimina ningún libro. | RN-D05 |

### 9.4. Interfaz

Se verifica manualmente (§10). Además, una revisión del código confirma que no hay atributos `style`, manejadores `on…`, bloques `<script>` o `<style>` con contenido, ni uso de `innerHTML`.

## 10. Plan de verificación

Cada paso lo ejecuta una persona. El resultado lo registra quien lo ejecutó (SPEC-000 §7.2). No se marca como ejecutado un paso que no se ejecutó. La numeración continúa la de SPEC-001 (último: V-28).

### 10.1. Preparación

1. Partir de `develop` con el Sprint 1 integrado. Instalar dependencias con `npm install`.
2. Crear la base de desarrollo con `npm run db:init` y una cuenta con `npm run admin:create`.
3. Ejecutar `npm test` con la suite completa y registrar el resultado real.
4. Iniciar con `npm run dev`. Registrar desde la interfaz al menos cuatro libros de prueba, en la base de **desarrollo**, nunca en producción.

### 10.2. HU-003

| Paso | Acción | Resultado esperado |
|---|---|---|
| V-29 | Iniciar sesión y pulsar «Asignar estantes» con libros recién registrados. | Lista de libros sin estante con título, autor y cantidad. |
| V-30 | Dejar todos los libros con estante (o usar una base vacía) y pulsar «Asignar estantes». | Lista vacía con «No hay libros sin estante.» |
| V-31 | Asignar una etiqueta válida a un libro. | Mensaje de confirmación. El libro sale de la lista. |
| V-32 | Probar etiqueta vacía, solo espacios y de 31 caracteres. | No se guarda, se indica el motivo y el libro sigue en la lista. |
| V-33 | Eliminar un libro desde otra sesión y luego asignarle estante desde la primera. | «El libro no existe.» La lista se recarga. |
| V-34 | Abrir el menú «⋮» y elegir «Ver libros con estante asignado». | Lista con título, autor, cantidad y estante actual. |
| V-35 | Cambiar la etiqueta de un libro con estante. | Sustituye la anterior. Los demás datos no cambian. |
| V-36 | Detener y reiniciar el servidor, y revisar las dos listas. | Los estantes se conservan. |
| V-37 | Sin sesión, abrir `/admin/` y pedir `/api/shelf-assignments?status=unassigned` desde el navegador. | `/admin/` redirige a `login.html`. La API responde 401. |
| V-38 | En la búsqueda pública, buscar un libro con estante y uno sin estante. | «Estante: …» y «Estante no asignado». |

### 10.3. HU-004

| Paso | Acción | Resultado esperado |
|---|---|---|
| V-39 | En la búsqueda del administrador, pulsar «Editar» en un libro. | Formulario con título, autor, descripción y cantidad actuales. |
| V-40 | Modificar uno o más datos con valores válidos y guardar. | Mensaje de confirmación. La búsqueda muestra los datos nuevos. Persisten tras reiniciar. |
| V-41 | Guardar con cantidad 0. | Se guarda y la tarjeta muestra «agotado». |
| V-42 | Vaciar título, autor o cantidad (y probar solo espacios). | Mensajes por campo. No se guarda nada. |
| V-43 | Cantidad -1, 2.5, «abc» y 1000. | Mensaje «La cantidad debe ser un número entero entre 0 y 999.» |
| V-44 | Cambiar título y autor para igualar los de otro libro (con otras mayúsculas y tildes). | «Ese libro ya existe. Edite el libro existente.» |
| V-45 | Guardar sin cambiar nada. | Se guarda sin error. |
| V-46 | Eliminar el libro desde otra sesión y guardar la edición desde la primera. | «El libro no existe.» Vuelve a la búsqueda. |
| V-47 | Pulsar «Cancelar». | Vuelve a la búsqueda sin cambios. El foco vuelve al botón «Editar». |
| V-48 | Revisar el formulario de edición. | El estante solo se muestra. No se puede cambiar. |

### 10.4. HU-005

| Paso | Acción | Resultado esperado |
|---|---|---|
| V-49 | Pulsar «Eliminar» en un libro con 1 o más ejemplares. | Diálogo con título, autor, cantidad y los ejemplares que se dejarán de registrar. |
| V-50 | Cancelar con el botón y con Escape. | No se elimina nada. El foco vuelve al botón «Eliminar». |
| V-51 | Confirmar la eliminación. | Mensaje de confirmación. El libro desaparece. Sigue sin existir tras recargar y reiniciar. |
| V-52 | Eliminar un libro con cantidad 0. | Se elimina. |
| V-53 | Eliminar desde otra sesión y confirmar desde la primera. | «El libro no existe. Puede que ya haya sido eliminado.» |
| V-54 | Tras eliminar, revisar las listas de asignación y la búsqueda, y registrar el mismo título y autor. | El libro no aparece. El registro se permite como libro nuevo. |

### 10.5. Perfiles y acceso (HU-006 CA-009 y CA-010)

| Paso | Acción | Resultado esperado |
|---|---|---|
| V-55 | Buscar en la página pública, con y sin sesión. | Ninguna tarjeta muestra «Editar» ni «Eliminar». |
| V-56 | Buscar en el área de administración. | Cada tarjeta ofrece «Editar» y «Eliminar». No hay «Ver información» (capacidad 7). |
| V-57 | Sin sesión, enviar solicitudes directas de modificación (por ejemplo con `curl`) a las rutas de edición, estante y eliminación. | 401 en todas. No cambia nada. |
| V-58 | Con la sesión cerrada en otra pestaña, ejecutar una acción desde la primera. | Redirige a `login.html`. |

### 10.6. Interfaz

| Paso | Acción | Resultado esperado |
|---|---|---|
| V-59 | Revisar las cuatro secciones a 320 px y en escritorio. | Se ven y se usan bien. Sin desplazamiento horizontal. |
| V-60 | Usar todo solo con teclado: menú «⋮», formularios y diálogo. | Todo es alcanzable. El foco es visible y queda atrapado en el diálogo. Escape lo cierra. |
| V-61 | Revisar los anuncios `aria-live` de éxito y error. | Se anuncian. |
| V-62 | Revisar contraste y el botón de peligro. | Mínimo 4.5:1. Se entiende sin color. |
| V-63 | Revisar la consola del navegador. | Sin errores de política de seguridad de contenido. |

## 11. Definition of Done aplicable

Se aplica la Definition of Done de SPEC-000 §7 completa para este incremento:

| Apartado | Aplica |
|---|---|
| §7.1 Código | Sí. |
| §7.2 Calidad | Sí. Pasan las pruebas de §9, incluida la suite del Sprint 1, y se ejecutan los pasos de §10. |
| §7.3 Seguridad | Sí. |
| §7.4 Base de datos | Sí. No hay cambios de esquema (D-22). Se verifica la persistencia (PD-07, PE-04, PF-04). |
| §7.5 Interfaz | Sí. |
| §7.6 Documentación y Git | Sí. Ramas y commits según SPEC-000 §6. |
| §7.7 Cierre de SPEC-000 | No aplica. |

**Excepción declarada:** HU-006 CA-009 y CA-010 siguen **parcialmente verificadas** al cierre del Sprint 2: «Editar» y «Eliminar» quedan completas, «Ver información» queda pendiente hasta la capacidad 7 (D-27).

**Cierre de esta especificación:** el archivo existe en `docs/SPECT/`, fue aprobado por el equipo y se registró con un commit `docs:` en la rama correspondiente.

---

## Anexo A. Matriz de trazabilidad HU → CA → SPEC-002

| HU | CA | Elementos de SPEC-002 | Pruebas | Tareas |
|---|---|---|---|---|
| HU-003 | CA-001 Ver libros sin estante | §6.1, §7.2, RN-S06 | PD-02, PD-03, PD-20, V-29 | T-29 a T-32 |
| | CA-002 Sin libros pendientes | §6.1, §7.2 | PD-04, V-30 | T-29, T-31, T-32 |
| | CA-003 Asignación exitosa | §6.2, §7.2 | PD-06, PD-07, V-31, V-36 | T-29 a T-32 |
| | CA-004 Etiqueta inválida | §4.1, §6.2 | PD-08, PD-09, PD-10, PD-15, V-32 | T-29 a T-32 |
| | CA-005 Libro inexistente | §6.2, RN-T06 | PD-11, V-33 | T-29, T-30, T-32 |
| | CA-006 Ver libros con estante | §6.1, §7.2 | PD-12, V-34 | T-29 a T-32 |
| | CA-007 Actualización de la etiqueta | §6.2, RN-S04 | PD-13, PD-14, V-35 | T-29 a T-32 |
| | CA-008 Restringido a la Administración | §6.1, §6.2, §8 | PD-01, V-37 | T-30, T-32 |
| HU-004 | CA-001 Abrir la edición | §6.3, §7.3, §7.4 | PE-02, PE-03, V-39 | T-33 a T-36 |
| | CA-002 Edición exitosa | §6.4, §7.4 | PE-04, PE-15, PE-17, V-40 | T-33 a T-36 |
| | CA-003 Cantidad en cero | §6.4, RN-E04 | PE-05, V-41 | T-33, T-34, T-36 |
| | CA-004 Campos obligatorios vacíos | §4.2, §6.4 | PE-06, PE-08, PE-18, V-42 | T-33 a T-36 |
| | CA-005 Cantidad inválida | §6.4, §7.4 | PE-07, V-43 | T-33 a T-36 |
| | CA-006 Libro duplicado | §6.4, RN-E05 | PE-10, PE-11, PE-12, V-44 | T-33, T-34, T-36 |
| | CA-007 Libro inexistente | §6.3, §6.4, RN-T06 | PE-03, PE-13, V-46 | T-33, T-34, T-36 |
| | CA-008 Restringida a la Administración | §6.3, §6.4, §8 | PE-01, V-55, V-57 | T-34, T-36 |
| HU-005 | CA-001 Solicitar la eliminación | §7.3, §7.5, RN-D03 | V-49 | T-39 |
| | CA-002 Eliminación exitosa | §6.5, §7.5 | PF-02, PF-04, V-51 | T-37 a T-40 |
| | CA-003 Cancelación | §7.5 | V-50 | T-39 |
| | CA-004 Eliminar un libro agotado | §6.5, RN-D04 | PF-03, V-52 | T-37, T-38, T-40 |
| | CA-005 Eliminar un libro con ejemplares | §6.5, §7.5 | PF-02, V-49 | T-37 a T-40 |
| | CA-006 Libro inexistente | §6.5, RN-T06 | PF-05, V-53 | T-37, T-38, T-40 |
| | CA-007 Efecto en el resto del catálogo | §5.4, RN-D06 | PF-06, PF-07, PF-08, V-54 | T-37, T-40 |
| | CA-008 Restringida a la Administración | §6.5, §8 | PF-01, PF-10, V-55, V-57 | T-38, T-40 |
| HU-006 | CA-009 Búsqueda del estudiante (parcial) | RN-T07, §7.3 | V-55 | T-35, T-39 |
| | CA-010 Búsqueda del administrador (parcial) | RN-T07, §7.3 | V-56 | T-35, T-39 |

---

## Anexo B. Ajustes documentales y actualizaciones propuestas

### B.1. Actualizaciones propuestas a SPEC-000

Conforme a SPEC-000 §12.3, este SPEC-002 declara una excepción y propone actualizar SPEC-000:

| Sección | Propuesta | Aplicado |
|---|---|---|
| §10 #2 (Listado) | Añadir la excepción de las listas de asignación para la Administración (D-14): «No existe listado completo del catálogo. Se llega a los libros solo mediante búsqueda (Estudiantes y Administración). Única excepción: la Administración, con sesión válida, dispone de las listas de asignación de estante (libros sin estante y libros con estante). Los estudiantes no tienen ningún listado.» | Terminado (20/11/2026; párrafo duplicado retirado el 25/11/2026) |

### B.2. Ajustes propuestos a SPEC-001

| Sección | Ajuste | Aplicado |
|---|---|---|
| §2.1, D-11 | Sustituir «La primera migración llegará en el Sprint 2» por «No hay migraciones previstas en el Sprint 2; se definirá cuando haga falta la primera» (D-22). | Terminado (20/11/2026) |
| §7.2, mensaje 409 | Sustituir «Sin enlace de edición (llega en el Sprint 2)» por «Sin enlace de edición: la respuesta no devuelve el identificador del libro existente» (D-26). | Terminado (20/11/2026) |
| §7.5, componentes | Sustituir «El botón de peligro y el panel de detalle quedan para el Sprint 2» por «El botón de peligro llega en el Sprint 2 (SPEC-002). El panel de detalle llega con la capacidad 7» (D-27). | Terminado (20/11/2026) |
| §7.4 y RN-B07 | Anotar que RN-T07 de SPEC-002 sustituye a RN-B07 a partir del Sprint 2. | Terminado (§7.4: 20/11/2026; RN-B07: 25/11/2026) |

### B.3. Historias de usuario

No se requiere ningún ajuste adicional a HU-003, HU-004 ni HU-005 respecto a lo ya aplicado tras el Sprint 1. En HU-006, las notas de CA-009 y CA-010 siguen vigentes: se completan «Editar» y «Eliminar» en el Sprint 2 y «Ver información» con la capacidad 7.

**Fin de SPEC-002-estante-edicion-eliminacion.md (v0.1, borrador)**