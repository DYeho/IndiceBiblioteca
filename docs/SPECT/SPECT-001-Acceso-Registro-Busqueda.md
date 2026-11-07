# SPEC-001-acceso-registro-busqueda

## 1. Encabezado

| Campo | Valor |
|---|---|
| **Proyecto** | Índice Biblioteca |
| **Tipo** | Especificación funcional (Sprint 1) |
| **Versión** | 0.1 |
| **Estado** | Aprobado |
| **Fecha** | 07/11/2026 |
| **Base** | SPEC-000-foundation v2.1 |
| **Archivo** | `docs/specifications/SPEC-001-acceso-registro-busqueda.md` |

## 2. Propósito y HU relacionadas

Esta especificación define cómo se construyen las tres historias de usuario del Sprint 1: modelo de datos, API, interfaz, seguridad y pruebas. No repite lo ya fijado en SPEC-000; lo aplica.

| HU | Nombre | Perfil | Capacidad |
|---|---|---|---|
| HU-001 | Inicio de sesión | Administración | 1 |
| HU-002 | Registrar libro físico | Administración | 2 |
| HU-006 | Búsqueda de libros por nombre o autor | Estudiante y Administración | 6 |

Orden de construcción: andamiaje técnico → HU-001 → HU-002 → HU-006.

Este documento es estable. El estado de las tareas se lleva en `docs/sprint/SPRINT-001-backlog.md`.

### 2.1. Decisiones incorporadas

| ID | Decisión |
|---|---|
| D-01 | Los duplicados ignoran mayúsculas, tildes y espacios sobrantes, según SPEC-000 §10 (#1 y #6). Se ajustan HU-002 RN-008, HU-006 RN-003 y HU-004 (ver Anexo B). |
| D-02 | En el Sprint 1 solo se verifica la **visibilidad de acciones por perfil**. "Ver información", "Editar" y "Eliminar" no existen todavía. HU-006 CA-009 y CA-010 se cierran por completo en el Sprint 2. |
| D-03 | La descripción admite hasta 2000 caracteres. |
| D-04 | El cierre de sesión se incluye en el Sprint 1. Se añade un CA a HU-001. |
| D-05 | `books.shelf_label` existe como columna nullable. No se crea ningún endpoint para asignarla. |
| D-06 | Búsqueda: máximo 200 caracteres. Cantidad: solo se acepta un entero JSON. |
| D-07 | Usuario de Administración: 3 a 50 caracteres, sin espacios al inicio ni al final, sin distinguir mayúsculas. |
| D-08 | El limitador de login cuenta solo credenciales fallidas. Credenciales incorrectas responden 401 `INVALID_CREDENTIALS`. |
| D-09 | `admin/index.html` única, con dos secciones (Buscar y Registrar) que se alternan por JavaScript. |
| D-10 | Búsqueda: `GET /api/books?q=`, pública, con `q` obligatorio. Se implementa con `instr()` sobre las columnas normalizadas. |
| D-11 | El esquema base va en `schema.sql`. La tabla `schema_migrations` se crea vacía. La primera migración llegará en el Sprint 2. |
| D-12 | *(por confirmar)* `create-admin.js` valida la contraseña en caracteres (8 a 72) y además rechaza las que superen 72 **bytes** UTF-8, porque ese es el límite real de bcrypt. |
| D-13 | *(por confirmar)* Las variables de entorno se leen con `process.loadEnvFile()` nativo de Node.js. No se agrega `dotenv`. |

## 3. Alcance y fuera de alcance

### 3.1. Dentro del alcance

- Andamiaje técnico necesario (proyecto, esquema, servidor, middlewares, base de interfaz mínima), según SPEC-000.
- HU-001, incluido el cierre de sesión (D-04).
- HU-002.
- HU-006.
- Scripts `init-db.js` y `create-admin.js`.

### 3.2. Fuera del alcance

- Asignar o cambiar estante (HU-003) y editar o eliminar libros (HU-004, HU-005).
- Información del libro (capacidad 7), digitalización (HU-008) y filtrado con IA (HU-009).
- Cambio de contraseña, desactivación o gestión de cuentas, y registro de cuentas desde la interfaz.
- Listado completo del catálogo, paginación, filtros y orden elegido por el usuario.
- Paneles de detalle, botón de peligro y confirmaciones de eliminación (Sprint 2).
- OCR, carga de archivos y servicios externos de IA. No se instalan.
- Despliegue, configuración de Nginx y respaldos (SPEC-000 §8.3).

### 3.3. Dependencias de paquetes

Ejecución: `express`, `better-sqlite3`, `bcryptjs`, `express-session`, `connect-sqlite3`, `helmet`, `express-rate-limit`.
Desarrollo: ninguna. Se usan `node:test` y `node --watch`. `sqlite3` entra solo como dependencia transitiva de `connect-sqlite3`, sin otro uso (SPEC-000 §4.2).

Riesgo a verificar en el andamiaje: `better-sqlite3` y `sqlite3` usan módulos nativos. Antes de fijar `engines`, se comprueba que ambos instalan en el Node.js LTS vigente.

### 3.4. Archivos nuevos respecto al árbol de SPEC-000 §3

No se crean directorios nuevos en el código. Se añaden archivos dentro de directorios existentes:

| Archivo | Responsabilidad |
|---|---|
| `src/utils/normalize-text.js` | Función única de normalización (SPEC-000 §10 #6). |
| `src/middleware/origin.middleware.js` | Verificación de `Origin` o `Referer` y de `Content-Type`. |
| `src/middleware/rate-limit.middleware.js` | Limitador de login y limitador general de `/api`. |
| `src/middleware/session.middleware.js` | Configuración de `express-session` y `connect-sqlite3`. |
| `public/js/shared/book-card.js` | Dibujo de la tarjeta de libro, común a ambas áreas. |
| `public/js/shared/search-view.js` | Flujo de búsqueda común: validar, consultar, mostrar estados. |
| `tests/test-app.js` | Utilidad común de pruebas (servidor en puerto efímero, base temporal). Está en la raíz de `tests/` para no crear directorios. |

## 4. Reglas de negocio

### 4.1. Acceso (HU-001)

| ID | Regla |
|---|---|
| RN-A01 | Solo existen cuentas de Administración. Se crean con `scripts/create-admin.js`. La aplicación no permite registrar cuentas. |
| RN-A02 | Puede haber varias cuentas, todas con los mismos permisos. |
| RN-A03 | La contraseña se guarda solo como hash `bcryptjs` (factor de coste 12, ajustable). Nunca se guarda, registra ni devuelve en texto plano. Al crear la cuenta mide de 8 a 72 caracteres y no excede 72 bytes UTF-8 (D-12). |
| RN-A04 | El nombre de usuario mide de 3 a 50 caracteres, se guarda sin espacios al inicio ni al final y en minúsculas. Es único sin distinguir mayúsculas (D-07). |
| RN-A05 | Ante usuario inexistente o contraseña incorrecta, la respuesta es siempre la misma, sin indicar cuál dato falló. |
| RN-A06 | La autenticación usa sesiones con cookies, no JWT (§8.1). |
| RN-A07 | La sesión vence tras 8 horas de inactividad, con expiración deslizante. Una sesión vencida o inválida equivale a no tener sesión. |
| RN-A08 | El inicio de sesión está limitado a 5 intentos fallidos por IP cada 15 minutos (SPEC-000 §4.8). |
| RN-A09 | La validación y el control de acceso se aplican en el backend, nunca solo ocultando elementos de la interfaz. |
| RN-A10 | Cerrar sesión destruye la sesión en el servidor y borra la cookie (D-04). |
| RN-A11 | La consulta del catálogo (búsqueda) no exige sesión. |

### 4.2. Registro de libros (HU-002)

| ID | Regla |
|---|---|
| RN-R01 | Solo la Administración con sesión válida registra libros. |
| RN-R02 | Título y autor son obligatorios. Tras quitar espacios al inicio y al final, miden de 1 a 200 (título) y de 1 a 150 (autor), y su texto normalizado no queda vacío. |
| RN-R03 | La descripción es opcional, de hasta 2000 caracteres. Vacía o solo con espacios, se guarda como "sin descripción". |
| RN-R04 | La cantidad inicial es obligatoria y es un entero de 1 a 999. Se puede cambiar después con la edición (HU-004), donde también se admite 0. |
| RN-R05 | Cada registro es un título con su cantidad. No se crea un registro por ejemplar. |
| RN-R06 | Los espacios al inicio y al final se eliminan antes de guardar. El resto del texto se guarda tal como se escribió. |
| RN-R07 | Dos libros no pueden compartir título y autor. La comparación usa los textos normalizados (D-01). Se verifica en el servicio y con una restricción `UNIQUE` en la base de datos. |
| RN-R08 | Al registrar, el estante queda sin asignar (D-05). |
| RN-R09 | Las validaciones se ejecutan en el backend. La base de datos impide además cantidades fuera de 0 a 999. |

### 4.3. Búsqueda (HU-006)

| ID | Regla |
|---|---|
| RN-B01 | La búsqueda es de solo lectura. Cualquier persona puede buscar sin sesión. El administrador usa una sección propia dentro del área de administración. |
| RN-B02 | Un único texto busca en título y autor. Un libro coincide si el texto aparece en cualquiera de los dos. |
| RN-B03 | La coincidencia es parcial y se hace sobre los textos normalizados (sin mayúsculas, tildes ni espacios sobrantes). El texto se busca como frase contigua. Los caracteres especiales (`%`, `_`, comillas, barras) son texto normal. |
| RN-B04 | Si el texto buscado queda vacío tras normalizarlo (vacío, solo espacios o solo marcas diacríticas), no se ejecuta la búsqueda ni se devuelve el catálogo. Máximo 200 caracteres (D-06). |
| RN-B05 | Cada resultado incluye título, autor, cantidad y estante. Los libros agotados o sin estante siempre pueden aparecer. |
| RN-B06 | Orden: título normalizado, luego autor normalizado y, para desempate total, el identificador. Sin paginación ni límite. |
| RN-B07 | Acciones por perfil (D-02): la interfaz del estudiante nunca incluye "Editar" ni "Eliminar". En el Sprint 1 no se muestran acciones para ningún perfil, porque no existen. La tarjeta del administrador deja listo el contenedor de acciones para el Sprint 2. |

### 4.4. Reglas transversales

| ID | Regla |
|---|---|
| RN-T01 | Una única función `normalizeText` (SPEC-000 §10 #6) sirve a la búsqueda y a los duplicados: recorta espacios, colapsa espacios internos, pasa a minúsculas, descompone en NFD y elimina las marcas diacríticas. Consecuencia aceptada: la ñ equivale a n. |
| RN-T02 | Respuestas de `/api` según SPEC-000 §4.7. Los mensajes de error van en español. |
| RN-T03 | Todas las respuestas de `/api` incluyen `Cache-Control: no-store`. |
| RN-T04 | Los nombres JSON de la API van en `camelCase`. Las fechas se devuelven como texto ISO 8601 en UTC. |
| RN-T05 | El código va en inglés. Los textos visibles al usuario, en español (SPEC-000 §5.2). |

## 5. Modelo de datos

### 5.1. Operación

- Archivo del catálogo: `DATABASE_PATH` (por defecto `data/library.sqlite`).
- Al abrir cada conexión: `foreign_keys = ON` y `journal_mode = WAL`.
- `schema.sql` es idempotente (solo crea lo que falta). `scripts/init-db.js` lo aplica y puede ejecutarse varias veces sin dañar datos.
- La tabla `schema_migrations` se crea vacía. No hay migraciones en el Sprint 1 (D-11).
- Las sesiones **no** se modelan aquí. `connect-sqlite3` las gestiona en `data/sessions.sqlite` (SPEC-000 §4.2).
- Si al arrancar el servidor la base no existe o no tiene las tablas, el servidor no inicia e indica ejecutar `npm run db:init`.

### 5.2. Tablas

**`administrators`**

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | entero | Clave primaria autoincremental. |
| `username` | texto | Obligatorio, único, de 3 a 50 caracteres, guardado en minúsculas. |
| `password_hash` | texto | Obligatorio. |
| `created_at` | texto | Obligatorio. Valor por defecto: fecha y hora UTC actuales. |

**`books`**

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | entero | Clave primaria autoincremental. |
| `title` | texto | Obligatorio, de 1 a 200 caracteres. |
| `author` | texto | Obligatorio, de 1 a 150 caracteres. |
| `description` | texto | Opcional (nulo si no hay), máximo 2000 caracteres. |
| `quantity` | entero | Obligatorio, entre 0 y 999 (`MAX_BOOK_QUANTITY`). |
| `shelf_label` | texto | Opcional (nulo = sin estante), de 1 a 30 caracteres cuando existe. |
| `title_normalized` | texto | Obligatorio. Resultado de `normalizeText(title)`. |
| `author_normalized` | texto | Obligatorio. Resultado de `normalizeText(author)`. |
| `created_at` | texto | Obligatorio. Fecha y hora UTC actuales por defecto. |
| `updated_at` | texto | Obligatorio. Igual a `created_at` al registrar. |

Restricción adicional: `UNIQUE (title_normalized, author_normalized)`.

**`schema_migrations`:** nombre de la migración (clave primaria) y fecha de aplicación.

### 5.3. Notas

- Las columnas normalizadas las calcula el servicio al registrar. No se exponen en la API.
- No se crea índice para la búsqueda: `instr()` recorre la tabla. Es aceptable para el tamaño de un catálogo escolar. Si en el futuro hiciera falta, se evalúa en otra especificación.
- Quedan fuera de la tabla los campos de ISBN, editorial, año, categoría y portada.

## 6. Contrato de la API

Formato de éxito y de error según SPEC-000 §4.7. Todas las rutas son JSON. Las solicitudes que modifican exigen `Content-Type: application/json` y `Origin` permitido (§8.2).

### 6.1. `POST /api/auth/login` (HU-001)

**Entrada:** `username` y `password` (textos).

**Validación:**
- `username` obligatorio tras quitar espacios al inicio y al final.
- `password` obligatoria, sin recortar.
- Falta uno o ambos: 400 `VALIDATION_ERROR` con `fields.username` y/o `fields.password`.
- Un usuario o contraseña con longitud fuera de rango no se valida como error de formato: se trata como credenciales incorrectas.

| Resultado | HTTP | Cuerpo |
|---|---|---|
| Éxito | 200 | `data.username`. Nunca incluye hash ni contraseña. Crea sesión nueva (regenera el identificador) y envía la cookie. |
| Campos vacíos | 400 | `VALIDATION_ERROR`, con `fields`. |
| Credenciales incorrectas | 401 | `INVALID_CREDENTIALS`, mensaje único. |
| Origen no permitido | 403 | `FORBIDDEN`. |
| Demasiados intentos | 429 | `RATE_LIMITED`. |

**Mensajes:**
- Usuario vacío: "El nombre de usuario es obligatorio."
- Contraseña vacía: "La contraseña es obligatoria."
- Credenciales incorrectas: "Usuario o contraseña incorrectos."
- Límite: "Demasiados intentos. Inténtelo de nuevo más tarde."

**Comportamiento interno:**
- El usuario se busca en minúsculas.
- Si no existe, se compara igualmente con un hash simulado del mismo coste, para no revelar la existencia del usuario por diferencia de tiempo.
- El limitador cuenta solo respuestas 401 (D-08). Las respuestas 400 y 200 no cuentan. Superado el límite, responde 429 incluso con credenciales correctas, hasta que termine la ventana.

### 6.2. `POST /api/books` (HU-002, solo Administración)

**Entrada:** `title`, `author`, `description` (opcional) y `quantity`.

**Orden de comprobaciones:** sesión → origen y tipo de contenido → validación → duplicado.

**Validación (todos los errores se devuelven juntos en `fields`):**

| Campo | Regla | Mensaje |
|---|---|---|
| `title` | Texto, de 1 a 200 caracteres tras recortar, normalizado no vacío. | "El título es obligatorio." / "El título no puede superar 200 caracteres." |
| `author` | Texto, de 1 a 150 caracteres tras recortar, normalizado no vacío. | "El autor es obligatorio." / "El autor no puede superar 150 caracteres." |
| `description` | Ausente, nulo o texto. Si es texto, máximo 2000 tras recortar. Vacío se guarda como nulo. | "La descripción no puede superar 2000 caracteres." |
| `quantity` | Obligatoria. Debe ser un número entero JSON de 1 a 999. Un texto como `"5"` no es válido. | Ausente: "La cantidad inicial es obligatoria." Inválida: "La cantidad inicial debe ser un número entero entre 1 y 999." |

| Resultado | HTTP | Cuerpo |
|---|---|---|
| Registrado | 201 | `data` con `id`, `title`, `author`, `description`, `quantity`, `shelfLabel` (nulo), `createdAt`, `updatedAt`. Los textos son los guardados, ya recortados. |
| Datos inválidos | 400 | `VALIDATION_ERROR`, con `fields`. |
| Sin sesión | 401 | `UNAUTHENTICATED`: "Debe iniciar sesión." |
| Origen no permitido | 403 | `FORBIDDEN`. |
| Libro duplicado | 409 | `CONFLICT`: "Ese libro ya existe. Edite el libro existente." |

**Duplicados:** el servicio calcula las claves normalizadas y consulta si existen. Si dos solicitudes simultáneas pasan esa comprobación, la violación `UNIQUE` de la base de datos también se traduce a 409. Si algo falla, no se guarda nada.

### 6.3. `GET /api/books?q=` (HU-006, público)

No requiere sesión.

**Validación de `q`:** debe aparecer una sola vez (si se repite, 400), ser texto, tener entre 1 y 200 caracteres tras recortar y no quedar vacío tras normalizar.

| Mensaje | Caso |
|---|---|
| "Escriba un título o autor para buscar." | `q` ausente, vacío o solo espacios o marcas. |
| "El texto de búsqueda no puede superar 200 caracteres." | Más de 200 caracteres. |

**Respuesta 200:** `data` es la lista de libros y `meta.total` es su cantidad. Cada elemento trae `id`, `title`, `author`, `quantity` y `shelfLabel` (nulo si no tiene). No incluye descripción ni columnas normalizadas.

**Sin coincidencias:** 200 con lista vacía y `total` igual a 0. No es un error.

**Coincidencia:** `normalizeText(q)` aparece dentro de `title_normalized` o de `author_normalized`, usando `instr()`. No se usa `LIKE`, así que no hace falta escapar caracteres. Los parámetros siempre se pasan como parámetros de la consulta.

**Orden:** `title_normalized`, luego `author_normalized`, luego `id`.

### 6.4. Protección de `/admin` (HU-001, CA-004)

- `GET` y `HEAD` sobre `/admin`, `/admin/` y cualquier ruta bajo `/admin` sin sesión válida: respuesta 302 a `/login.html`. La comprobación ocurre **antes** del middleware de archivos estáticos y cubre cualquier combinación de mayúsculas.
- Con sesión válida se sirve `public/admin/index.html`, con `Cache-Control: no-store`.
- Los módulos JavaScript de `public/js/admin/` son públicos y no contienen secretos. Lo que protege al área son la página y la API.

### 6.5. `POST /api/auth/logout` (HU-001, D-04)

| Resultado | HTTP |
|---|---|
| Sesión válida: se destruye la sesión y se borra la cookie `ib.sid`. | 204 |
| Sin sesión válida. | 401 `UNAUTHENTICATED` |

### 6.6. Orden de middlewares en `app.js`

1. Confianza en el proxy (`TRUST_PROXY`).
2. Helmet.
3. Sesión.
4. Para `/api`: `Cache-Control: no-store`, lector de JSON con límite de 16 kB, verificación de origen y tipo de contenido, limitador general.
5. Rutas `/api/auth` y `/api/books`.
6. 404 JSON (`NOT_FOUND`) para el resto de `/api`.
7. Guardia de `/admin`.
8. Archivos estáticos de `public/`.
9. `error.middleware`.

**Errores generales:**
- JSON mal formado o cuerpo mayor de 16 kB: 400 `VALIDATION_ERROR`.
- Cualquier error no previsto: 500 `INTERNAL_ERROR` con mensaje genérico. Nunca incluye trazas, rutas ni mensajes de la base de datos.

## 7. Interfaz

Se respeta SPEC-000 §9: español (`lang="es"`), mobile-first con puntos de quiebre a 600 y 900 px, plantilla HTML común, sin estilos ni scripts inline, sin recursos de terceros, `textContent` para datos de la API y accesibilidad mínima.

### 7.1. `login.html` (HU-001)

Usa `base.css`, `layout.css`, `components.css` y `public.css`. Su lógica vive en `public/js/admin/auth.js`.

**Contenido:**
- Título de página: "Iniciar sesión · Índice Biblioteca".
- Enlace "Saltar al contenido".
- `<h1>` "Iniciar sesión".
- Campos con etiqueta: "Nombre de usuario" (autocompletado `username`) y "Contraseña" (tipo contraseña, autocompletado `current-password`).
- Botón "Iniciar sesión".
- Enlace "Volver a la búsqueda" a `./index.html`.
- Zona de mensajes con `aria-live`.

**Comportamiento:**

| Situación | Resultado |
|---|---|
| Campo vacío al enviar | No se envía. Se muestra "El nombre de usuario es obligatorio." o "La contraseña es obligatoria." junto al campo, y el foco va al primero inválido. |
| 200 | Redirige a `/admin/`. |
| 401 | Permanece en la página. Muestra "Usuario o contraseña incorrectos.", vacía la contraseña y devuelve el foco al campo de usuario. |
| 429 | Muestra "Demasiados intentos. Inténtelo de nuevo más tarde." |
| Error de red u otro | Muestra "No se pudo conectar con el servidor. Inténtelo de nuevo." |

- El botón se desactiva mientras se espera la respuesta, para evitar doble envío.
- En `login.html`, `api.js` no redirige ante un 401. Esa redirección aplica solo al área de administración.
- Si una persona con sesión válida abre `login.html`, no hay comportamiento especial (no está en los CA). Se muestra el formulario.

### 7.2. `admin/index.html` (HU-001 y HU-002)

Usa `base.css`, `layout.css`, `components.css` y `admin.css`. Entrada: `public/js/admin/main.js`.

**Estructura:**
- Encabezado con el nombre de la aplicación, "Administración" y los botones "Buscar libros", "Registrar libro" y "Cerrar sesión".
- Dos secciones (D-09). Solo una visible a la vez. Al cargar, se muestra "Buscar libros". El botón de la sección activa se marca con `aria-current`.
- "Cerrar sesión" llama a `POST /api/auth/logout` y, al responder 204 (o 401), lleva a `/login.html`.

**Sección "Registrar libro":**

| Elemento | Detalle |
|---|---|
| Título | Etiqueta "Título", obligatorio, `maxlength` 200. |
| Autor | Etiqueta "Autor", obligatorio, `maxlength` 150. |
| Descripción | Etiqueta "Descripción (opcional)", área de texto, `maxlength` 2000. |
| Cantidad inicial | Etiqueta "Cantidad inicial". Campo de texto con teclado numérico, no `type="number"`, para que un texto no numérico llegue como valor inválido y reciba el mensaje correcto. |
| Botón | "Registrar libro". |

El formulario usa `novalidate`: la validación visible es la propia (los mismos mensajes que el backend), y el backend es siempre la autoridad.

| Situación | Resultado |
|---|---|
| Éxito (201) | Mensaje: "Libro registrado correctamente: «título» de autor, N ejemplares." Se muestran los datos devueltos por el servidor. El formulario se vacía y el foco vuelve a "Título". |
| 400 | Cada mensaje junto a su campo, con `aria-describedby`. Resumen de error. El foco va al primer campo inválido. Se conservan los valores escritos. |
| 409 | Alerta: "Ese libro ya existe. Edite el libro existente." Se conservan los valores. Sin enlace de edición (llega en el Sprint 2). |
| 401 | `api.js` redirige a `/login.html`. |
| Otro error | "No se pudo registrar el libro. Inténtelo de nuevo." |

### 7.3. Búsqueda pública, `index.html` (HU-006)

Usa `base.css`, `layout.css`, `components.css` y `public.css`. Entrada: `public/js/public/main.js`. `search.js` conecta el formulario. `books.js` dibuja la lista del área pública.

**Contenido:**
- Título de página: "Buscar libros · Índice Biblioteca".
- `<h1>` "Buscar libros".
- Formulario con rol de búsqueda, etiqueta "Título o autor", campo de texto (`maxlength` 200) y botón "Buscar".
- Enlace "Acceso de administración" a `./login.html`.
- Zona de resultados con `aria-live="polite"`.

**Estados:**

| Estado | Texto |
|---|---|
| Búsqueda vacía o solo espacios | No se consulta la API. "Escriba un título o autor para buscar." |
| Cargando | "Buscando…" |
| Con resultados | "N libros encontrados." (singular: "1 libro encontrado.") |
| Sin resultados | "No se encontraron libros." |
| Error | "No se pudo realizar la búsqueda. Inténtelo de nuevo." |

**Tarjeta de libro (`.book-card`):**
- Título como encabezado.
- "Autor: …".
- "Cantidad: N". Si N es 0, se añade la insignia con el texto "agotado", junto a la cantidad (no solo color).
- "Estante: …", o "Estante no asignado" si no tiene.
- Todos los textos con `textContent`.

**Acciones (D-02):** la tarjeta del estudiante no incluye acciones en el Sprint 1. Nunca incluirá "Editar" ni "Eliminar".

### 7.4. Búsqueda del administrador, sección de `admin/index.html` (HU-006)

Mismas reglas, estados y textos que la 7.3, con la misma tarjeta. Cada pantalla conecta su formulario en `admin/books.js`. La tarjeta del administrador incluye un contenedor de acciones vacío, que se rellena en el Sprint 2 con "Ver información", "Editar" y "Eliminar" (D-02). La búsqueda usa el mismo endpoint público. Una sesión vencida se detecta al recargar la página o al realizar una operación de modificación.

### 7.5. Base de interfaz mínima

- **Tokens** (`base.css`): se definen todos los de SPEC-000 §9.2. Sus valores iniciales se validan en el andamiaje (contraste mínimo 4.5:1 para texto normal).
- **Componentes de este sprint** (`components.css`): botón primario y secundario, campo con etiqueta y mensaje de error, alerta (éxito y error), tarjeta de libro, insignia "agotado" y estados vacío, cargando y error. El botón de peligro y el panel de detalle quedan para el Sprint 2.
- **JavaScript compartido:** `api.js` y `utils.js` según SPEC-000 §9.5, más `book-card.js` y `search-view.js` (§3.4). Los módulos de cada área no llaman a `fetch` directamente.
- **Rutas relativas** en los recursos, según SPEC-000 §9.4.

## 8. Seguridad

### 8.1. Sesión

| Aspecto | Decisión |
|---|---|
| Cookie | `ib.sid`, `HttpOnly`, `SameSite=Lax`, `Secure` en producción. |
| Duración | 8 horas de inactividad, con expiración deslizante. |
| Creación | Solo en el login exitoso (no se crean sesiones para visitantes anónimos). Se regenera el identificador. |
| Contenido | Solo el identificador de la cuenta. |
| Almacén | `connect-sqlite3`, archivo `data/sessions.sqlite`. |
| Verificación | `requireAdmin` comprueba que la sesión exista y que la cuenta siga existiendo en la base de datos. Si la cuenta se eliminó manualmente, la sesión deja de valer. |
| Cierre | Destruye la sesión en el servidor y borra la cookie. |

### 8.2. CSRF

En `POST`, `PUT`, `PATCH` y `DELETE` de `/api`: se compara `Origin` con `ALLOWED_ORIGIN`. Si falta, se usa `Referer`. Si faltan ambos, o no coinciden: 403 `FORBIDDEN`. Se exige `Content-Type: application/json`. Si no, 400 `VALIDATION_ERROR`. El cliente envía esa cabecera siempre, incluso en el cierre de sesión.

### 8.3. Limitación de solicitudes

- Login: 5 intentos fallidos por IP cada 15 minutos (D-08).
- General en `/api`: 100 solicitudes por IP por minuto.
- Ambos responden 429 `RATE_LIMITED` con el formato de §4.7. Dependen de `TRUST_PROXY` para ver la IP real tras Nginx.

### 8.4. Contraseñas y datos sensibles

- Hash con `bcryptjs`, factor de coste 12.
- La contraseña nunca se imprime, registra ni devuelve. Los cuerpos de las solicitudes no se registran.
- `.env`, `data/*.sqlite` y archivos auxiliares de WAL no se versionan.

### 8.5. Cabeceras y contenido

- Helmet con política de seguridad de contenido: origen propio, sin scripts ni estilos inline, `form-action` propio y sin incrustación en marcos.
- Los datos de la API se insertan con `textContent`, nunca con `innerHTML`.
- Solo `public/` se sirve como estático. `data/`, `src/`, `scripts/`, `docs/` y archivos ocultos no se sirven.

### 8.6. Base de datos

- Solo consultas parametrizadas. Nunca se concatena texto del usuario en una consulta.
- Las restricciones `CHECK` y `UNIQUE` actúan como segunda barrera.

## 9. Casos de prueba

Pruebas con `node:test` y `node:assert`, sin frameworks nuevos. La aplicación se construye desde una fábrica en `app.js` que recibe la configuración. `tests/test-app.js` levanta el servidor en un puerto efímero con una base temporal creada desde `schema.sql` y un directorio temporal para las sesiones. Las pruebas de API usan `fetch` nativo y llevan la cookie a mano. Para las pruebas de vencimiento, la duración de la sesión es inyectable solo mediante la configuración de la fábrica.

Las pruebas de `normalizeText` van en `tests/books/`.

### 9.1. Normalización (`tests/books/`)

| ID | Caso |
|---|---|
| PN-01 | Recorta espacios y colapsa los internos. |
| PN-02 | Pasa mayúsculas a minúsculas. |
| PN-03 | Elimina tildes, diéresis y la tilde de la ñ ("García", "Márquez", "Muñoz" → "garcia", "marquez", "munoz"). |
| PN-04 | Un texto solo de marcas diacríticas da cadena vacía. |
| PN-05 | Es idempotente. |
| PN-06 | Una entrada que no es texto produce error. |

### 9.2. Acceso (`tests/auth/`)

| ID | Caso | CA |
|---|---|---|
| PA-01 | Login correcto: 200, cookie `ib.sid` con `HttpOnly` y `SameSite=Lax`, cuerpo sin contraseña ni hash. | HU-001 CA-001 |
| PA-02 | El login funciona con el usuario escrito en otras mayúsculas. | D-07 |
| PA-03 | Con la cookie, `GET /admin/` devuelve la página (200). | CA-001, CA-006 |
| PA-04 | Usuario inexistente: 401 `INVALID_CREDENTIALS`, sin cookie de sesión. | CA-002 |
| PA-05 | Contraseña incorrecta: mismo estado, código y mensaje que PA-04. | CA-002, RN-A05 |
| PA-06 | Usuario ausente, vacío o solo espacios: 400 con `fields.username`. | CA-003 |
| PA-07 | Contraseña vacía: 400 con `fields.password`. Ambos vacíos: ambos campos. | CA-003 |
| PA-08 | Sin sesión, `/admin`, `/admin/`, `/admin/index.html` y `/ADMIN/` responden 302 a `/login.html`. | CA-004 |
| PA-09 | `POST /api/books` sin sesión: 401 `UNAUTHENTICATED`. | CA-004 |
| PA-10 | Una cookie inventada o manipulada equivale a no tener sesión. | CA-004 |
| PA-11 | `GET /api/books?q=a` sin sesión: 200. | CA-005 |
| PA-12 | Solicitudes consecutivas con la misma cookie siguen autenticadas. | CA-006 |
| PA-13 | Con duración corta inyectada, tras vencer la sesión: 401 en la API y 302 en `/admin/`. | CA-006 |
| PA-14 | Tras el login, el identificador de sesión es distinto del previo. | §8.1 |
| PA-15 | El sexto intento fallido seguido: 429 `RATE_LIMITED`. Con credenciales correctas, sigue 429 dentro de la ventana. | RN-A08 |
| PA-16 | Los logins correctos y los 400 por campos vacíos no cuentan para el límite. | D-08 |
| PA-17 | `Origin` distinto: 403. Sin `Origin` ni `Referer`: 403. `Content-Type` no JSON: 400. | §8.2 |
| PA-18 | La contraseña no aparece en respuestas ni en la salida registrada durante la prueba. | RN-A03 |
| PA-19 | Si se borra la cuenta, la sesión existente deja de valer (401). | §8.1 |
| PA-20 | Logout con sesión: 204, cookie borrada y `/admin/` vuelve a redirigir. Sin sesión: 401. | HU-001 CA-007 (propuesto) |
| PA-21 | Crear cuenta: guarda el hash (distinto de la contraseña), rechaza usuario duplicado sin distinguir mayúsculas, valida usuario de 3 a 50 y contraseña de 8 a 72 caracteres (y 72 bytes). | RN-A01, RN-A03, RN-A04 |
| PA-22 | Un error interno simulado devuelve 500 `INTERNAL_ERROR` sin trazas. | SPEC-000 §4.7 |

### 9.3. Registro (`tests/books/`)

| ID | Caso | CA |
|---|---|---|
| PB-01 | Registro válido: 201. Los datos devueltos coinciden con los enviados (ya recortados). `shelfLabel` es nulo. | HU-002 CA-001 |
| PB-02 | Descripción ausente, nula, vacía o solo espacios: 201 con `description` nula. | CA-002 |
| PB-03 | Título o autor ausente, vacío o solo espacios, o cantidad ausente: 400 con el campo correspondiente. Todo vacío: los tres campos. | CA-003 |
| PB-04 | Cantidad 0, -1, 1.5, `"5"`, `"abc"`, nula o 1000: 400 con el mensaje de `fields.quantity`. | CA-004 |
| PB-05 | Cantidades 1 y 999: 201. | CA-001, CA-004 |
| PB-06 | Límites de longitud: título 200 sí y 201 no, autor 150 y 151, descripción 2000 y 2001. | CA-003 |
| PB-07 | Sin sesión: 401 y la tabla de libros no cambia. | CA-005 |
| PB-08 | Tras registrar, reabrir la base y la aplicación conserva el libro con los mismos datos. | CA-006 |
| PB-09 | Mismo título y autor: 409 `CONFLICT`, sin insertar. | CA-007 |
| PB-10 | Duplicado con otras mayúsculas, espacios sobrantes o internos, o tildes ("García" y "Garcia"): 409. | CA-007, D-01 |
| PB-11 | Mismo título con otro autor, o mismo autor con otro título: 201. | CA-007 |
| PB-12 | Directo sobre la base: `UNIQUE` rechaza el duplicado y `CHECK` rechaza cantidades negativas o mayores de 999. | RN-R07, RN-R09 |
| PB-13 | Si la comprobación previa no detecta el duplicado (se simula omitiéndola), la violación `UNIQUE` se traduce igual a 409. | RN-R07 |
| PB-14 | Las columnas normalizadas se guardan correctamente y la respuesta no las incluye. | §5.3 |
| PB-15 | JSON mal formado o cuerpo mayor de 16 kB: 400. | §6.6 |
| PB-16 | Un título con marcas HTML se guarda y se devuelve como texto, sin cambios. | §8.5 |

### 9.4. Búsqueda (`tests/books/`)

Los casos con libros agotados o sin estante usan datos insertados directamente en la base de pruebas, porque las historias que los producen son del Sprint 2.

| ID | Caso | CA |
|---|---|---|
| PC-01 | Texto parcial del título: devuelve los libros con título, autor, cantidad y estante. | HU-006 CA-001 |
| PC-02 | Texto parcial del autor: mismos datos. | CA-002 |
| PC-03 | "garcia", "GARCÍA", "marquez" y " garcia " encuentran "Gabriel García Márquez". | CA-003 |
| PC-04 | `q` ausente, vacío, solo espacios o solo marcas diacríticas: 400 con `fields.q`, sin libros. | CA-004 |
| PC-05 | 200 caracteres: válido. 201: 400. | RN-B04 |
| PC-06 | Sin coincidencias: 200, lista vacía, `total` 0. | CA-005 |
| PC-07 | Un libro con cantidad 0 aparece con `quantity` 0. | CA-006 |
| PC-08 | Un libro sin estante aparece con `shelfLabel` nulo. | CA-007 |
| PC-09 | Los agotados y los sin estante no se excluyen de los resultados. | RN-B05 |
| PC-10 | Orden por título sin distinguir mayúsculas ni tildes. Mismo título: por autor. Todo igual: por `id`. | CA-008 |
| PC-11 | Los caracteres `%`, `_`, `'`, `"` y `\` se buscan como texto: `%` no devuelve todo el catálogo. | RN-B03 |
| PC-12 | "garcia marquez" encuentra el libro. "marquez garcia" no. | RN-B03 |
| PC-13 | La búsqueda no cambia los datos, funciona sin cookie y un `q` repetido da 400. | RN-B01 |
| PC-14 | `meta.total` coincide con el número de elementos. | §6.3 |
| PC-15 | Los elementos no incluyen descripción ni columnas normalizadas. | §6.3 |

### 9.5. Interfaz

Se verifica manualmente (§10), porque el proyecto no incorpora framework de pruebas de navegador. Adicionalmente, una revisión del código confirma que no hay atributos `style`, manejadores `on…`, ni bloques `<script>` o `<style>` con contenido, y que no se usa `innerHTML`.

## 10. Plan de verificación

Cada paso lo ejecuta una persona. El resultado lo registra quien lo ejecutó (SPEC-000 §7.2). No se marca como ejecutado un paso que no se ejecutó.

### 10.1. Preparación

1. Instalar dependencias con `npm install`.
2. Copiar `.env.example` a `.env` y completar los valores (`ALLOWED_ORIGIN` con el origen local usado).
3. Crear la base con `npm run db:init`. Repetir el comando y comprobar que no daña datos.
4. Crear una cuenta con `npm run admin:create`. Comprobar que la contraseña no se imprime.
5. Iniciar con `npm run dev` y ejecutar las pruebas con `npm test`.

### 10.2. HU-001

| Paso | Acción | Resultado esperado |
|---|---|---|
| V-01 | Abrir `/admin/` sin sesión. | Redirige a `login.html`. |
| V-02 | Enviar el formulario vacío. | Mensajes por campo, sin enviar. |
| V-03 | Usuario inexistente y, por separado, contraseña incorrecta. | Mismo mensaje en ambos casos. Permanece en la página. |
| V-04 | Credenciales correctas. | Llega a `/admin/`. Aparece la cookie `ib.sid` (`HttpOnly`). |
| V-05 | Recargar y navegar entre secciones. | No pide credenciales. |
| V-06 | "Cerrar sesión". | Vuelve a `login.html`. `/admin/` redirige de nuevo. |
| V-07 | Cinco intentos fallidos seguidos. | El sexto muestra el mensaje de límite. |
| V-08 | Con la sesión cerrada, abrir `index.html` y buscar. | Funciona sin pedir sesión. |

### 10.3. HU-002

| Paso | Acción | Resultado esperado |
|---|---|---|
| V-09 | Registrar con título, autor, descripción y cantidad. | Mensaje de confirmación con los datos. Formulario vaciado. |
| V-10 | Registrar sin descripción. | Se guarda. |
| V-11 | Dejar vacíos título, autor o cantidad (y probar solo espacios). | Mensajes por campo. No se guarda. |
| V-12 | Cantidad 0, -3, 2.5, "abc" y 1000. | Mensaje de cantidad entera entre 1 y 999. |
| V-13 | Repetir título y autor, también con otras mayúsculas, espacios y tildes. | "Ese libro ya existe. Edite el libro existente." |
| V-14 | Detener y reiniciar el servidor, y buscar el libro. | Sigue con los mismos datos. |

### 10.4. HU-006

| Paso | Acción | Resultado esperado |
|---|---|---|
| V-15 | Buscar parte del título y parte del autor. | Resultados con título, autor, cantidad y estante. |
| V-16 | Buscar "garcia", "GARCÍA" y "marquez" para un libro con "García Márquez". | Lo encuentra en los tres casos. |
| V-17 | Enviar la búsqueda vacía o con espacios. | Mensaje que pide escribir título o autor. No lista libros. |
| V-18 | Buscar un texto inexistente. | "No se encontraron libros." |
| V-19 | Con libros de títulos iguales y distintos. | Orden alfabético por título, luego por autor. |
| V-20 | Preparar datos de prueba en la base de **desarrollo**, nunca en producción: un libro con cantidad 0 y uno con estante asignado. Se usa el cliente `sqlite3`, o una prueba. | El primero muestra "agotado" junto a la cantidad. El segundo, su estante. Los demás, "Estante no asignado". |
| V-21 | Revisar la búsqueda pública y la del administrador. | Ninguna tarjeta muestra "Editar" ni "Eliminar". La del administrador tiene el contenedor de acciones vacío. |
| V-22 | Ejecutar la misma búsqueda en ambas pantallas. | Mismos resultados y mismo orden. |

### 10.5. Interfaz

| Paso | Acción | Resultado esperado |
|---|---|---|
| V-23 | Revisar las tres páginas a 320 px y en escritorio. | Se ve y se usa bien. Sin desplazamiento horizontal. |
| V-24 | Usar las tres páginas solo con teclado. | Todo es alcanzable. El foco siempre es visible. |
| V-25 | Revisar el enlace "Saltar al contenido" y los anuncios de resultados con `aria-live`. | Funcionan. |
| V-26 | Revisar contraste de texto. | Mínimo 4.5:1. |
| V-27 | Revisar que "agotado" se comunica con texto. | Se entiende sin color. |
| V-28 | Revisar la consola del navegador. | Sin errores de política de seguridad de contenido. |

## 11. Definition of Done aplicable

Se aplica la Definition of Done de SPEC-000 §7 completa para este incremento:

| Apartado | Aplica |
|---|---|
| §7.1 Código | Sí. |
| §7.2 Calidad | Sí. Pasan las pruebas de §9 y se ejecutan los pasos de §10. |
| §7.3 Seguridad | Sí. |
| §7.4 Base de datos | Sí. `schema.sql` refleja el esquema y se verifica la persistencia (PB-08). |
| §7.5 Interfaz | Sí. |
| §7.6 Documentación y Git | Sí. Ramas y commits según SPEC-000 §6. |
| §7.7 Cierre de SPEC-000 | No aplica. |

**Excepción declarada:** HU-006 CA-009 y CA-010 se consideran **parcialmente verificadas** al cierre del Sprint 1 (D-02) y se cierran por completo en el Sprint 2.

**Cierre de esta especificación:** el archivo existe en `docs/specifications/`, fue aprobado por el equipo y se registró con un commit `docs:` en la rama correspondiente.

---

## Anexo A. Matriz de trazabilidad HU → CA → SPEC-001

| HU | CA | Elementos de SPEC-001 | Pruebas | Tareas |
|---|---|---|---|---|
| HU-001 | CA-001 Inicio exitoso | §4.1, §6.1, §7.1, §8.1 | PA-01, PA-02, PA-03, PA-14, V-04 | T-08 a T-13 |
| | CA-002 Credenciales incorrectas | §6.1, §8.4 | PA-04, PA-05, PA-18, V-03 | T-10, T-13 |
| | CA-003 Campos vacíos | §6.1, §7.1 | PA-06, PA-07, V-02 | T-10, T-12, T-13 |
| | CA-004 Admin sin sesión | §6.4, §6.2, §8.1 | PA-08, PA-09, PA-10, PA-19, V-01 | T-11, T-13 |
| | CA-005 Consulta sin sesión | §6.3, RN-A11 | PA-11, PC-13, V-08 | T-20, T-23 |
| | CA-006 Continuidad y vencimiento | §8.1, §6.4 | PA-12, PA-13, V-05 | T-09, T-11, T-13 |
| | CA-007 Cierre de sesión *(propuesto, D-04)* | §6.5, §7.2 | PA-20, V-06 | T-14 |
| HU-002 | CA-001 Registro exitoso | §5.2, §6.2, §7.2 | PB-01, PB-05, V-09 | T-15 a T-18 |
| | CA-002 Sin descripción | §5.2, §6.2 | PB-02, V-10 | T-15, T-18 |
| | CA-003 Campos vacíos | §4.2, §6.2, §7.2 | PB-03, PB-06, V-11 | T-15, T-17, T-18 |
| | CA-004 Cantidad inválida | §4.2, §6.2, §7.2 | PB-04, PB-05, V-12 | T-15, T-17, T-18 |
| | CA-005 Restringido a Administración | §6.2, §8.1 | PB-07, PA-09 | T-16, T-18 |
| | CA-006 Persistencia | §5.1, §5.2 | PB-08, V-14 | T-03, T-18 |
| | CA-007 Libro duplicado | §5.2, §6.2, RN-R07 | PB-09 a PB-13, V-13 | T-06, T-15, T-18 |
| HU-006 | CA-001 Búsqueda por título | §6.3, §7.3 | PC-01, PC-14, V-15 | T-19 a T-21, T-23 |
| | CA-002 Búsqueda por autor | §6.3, §7.3 | PC-02, V-15 | T-19, T-20, T-23 |
| | CA-003 Coincidencia flexible | §4.3, RN-T01 | PN-01 a PN-06, PC-03, PC-12, V-16 | T-06, T-19, T-23 |
| | CA-004 Búsqueda vacía | §6.3, §7.3 | PC-04, PC-05, V-17 | T-19 a T-21, T-23 |
| | CA-005 Sin resultados | §7.3 | PC-06, V-18 | T-21, T-23 |
| | CA-006 Libro agotado | §7.3 | PC-07, V-20, V-27 | T-21, T-23 |
| | CA-007 Libro sin estante | §5.2, §7.3 | PC-08, V-20 | T-03, T-21, T-23 |
| | CA-008 Orden | §6.3 | PC-10, V-19 | T-19, T-23 |
| | CA-009 Búsqueda del estudiante *(parcial, D-02)* | §7.3, RN-B07 | V-21 | T-21 |
| | CA-010 Búsqueda del administrador *(parcial, D-02)* | §7.4, RN-B07 | V-21, V-22 | T-22 |

---

## Anexo B. Ajustes documentales y actualizaciones propuestas

### B.1. Ajustes a las HU (requieren autorización escrita)

| Documento | Ajuste |
|---|---|
| HU-001, HU-002, HU-006 | Actualizar la referencia a SPEC-000 de v2.0 a v2.1. |
| HU-001 | Dependencias: el procedimiento para crear cuentas ya está definido (`scripts/create-admin.js`). Las sesiones se guardan en `data/sessions.sqlite`, gestionadas por `connect-sqlite3`, fuera de `schema.sql`. RN-007: el umbral del limitador queda fijado en 5 intentos fallidos por IP cada 15 minutos. |
| HU-001 | Añadir **CA-007 Cierre de sesión**: *Dado que el administrador tiene una sesión válida, cuando elige cerrar sesión, entonces el sistema destruye la sesión, borra la cookie y lo lleva a la página de inicio de sesión; al abrir de nuevo el área de administración, exige iniciar sesión.* Quitar "Cierre de sesión" de Fuera de Alcance. |
| HU-002 | RN-008: sustituir la última frase por la regla de SPEC-000 §10 #1 (la comparación también ignora tildes y espacios internos repetidos). |
| HU-002 | CA-004: añadir el tope de 999 (la cantidad debe ser un entero entre 1 y 999). |
| HU-002 | RN-007: los límites de longitud quedan fijados: título 200, autor 150, descripción 2000. |
| HU-006 | RN-003: sustituir la última frase para que no diga que los duplicados no equiparan tildes. |
| HU-006 | CA-009 y CA-010: anotar que el Sprint 1 verifica la visibilidad por perfil y que las opciones se completan en el Sprint 2. |
| HU-006 | RN-004: la longitud máxima del texto queda fijada en 200. |
| HU-004 | Aplicar la misma regla de duplicados de D-01 al revisarla en el Sprint 2. |

### B.2. Actualizaciones propuestas a SPEC-000

Conforme a SPEC-000 §12.3, este SPEC-001 declara estas extensiones y propone actualizar SPEC-000 (a v2.2):

| Sección | Propuesta |
|---|---|
| §3 y §3.1 | Registrar los directorios `docs/product/` (Product Backlog: `ProductBacklog.md`) y `docs/sprint/` (backlog de cada sprint: `SPRINT-NNN-backlog.md`). |
| §5.6 | Añadir la convención de nombres de esos documentos. |
| §10, límites | Añadir: descripción, opcional, máximo 2000 caracteres. |
| §4.2 (nota) o §4.9 | Indicar que las variables de entorno se leen con `process.loadEnvFile()` (D-13) y que la contraseña de Administración no excede 72 bytes UTF-8 (D-12). |
| §3 (nota de archivos) | Aclarar que se pueden añadir archivos nuevos dentro de los directorios existentes (por ejemplo, middlewares compartidos o módulos compartidos del frontend). |
| §9.4 | Corregir el guion duplicado ("- -") en la lista de la plantilla HTML. |

### B.3. Nombres de archivo (cosmético)

Los archivos recibidos son `SPECT-000-Fundation.md`, `HU-001-InicioSesion.md`, etc. SPEC-000 §5.6 pide minúsculas, guiones y sin tildes (por ejemplo `SPEC-000-foundation.md`, `HU-001-inicio-de-sesion.md`). Se propone renombrarlos al guardarlos en `docs/specifications/`.

**Fin de SPEC-001-acceso-registro-busqueda.md (v0.1, borrador)**