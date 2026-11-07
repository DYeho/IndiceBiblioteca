# SPEC-000-foundation

**Proyecto:** Índice Biblioteca  
**Tipo:** Especificación fundacional  
**Versión:** 2.1  
**Estado:** Aprobado  
**Fecha:** 06/11/2026  

## 1. Propósito

Esta especificación define las bases técnicas, arquitectónicas y organizativas de **Índice Biblioteca**. Sirve como referencia única y estable para todos los incrementos posteriores, de modo que cada uno se construya con las mismas tecnologías, la misma estructura y los mismos criterios de calidad.

El producto es una aplicación web con la que la Administración de una biblioteca estudiantil registra y mantiene un catálogo digital de libros (con su estante y cantidad de ejemplares) y los estudiantes consultan ese catálogo sin necesidad de cuenta.

Esta especificación **no describe funcionalidades**. Describe el terreno técnico sobre el que se construirán. Las funcionalidades se especificarán en documentos `SPEC-001` en adelante.

Principios que guían las decisiones técnicas:

- **Simplicidad:** la herramienta debe ser sencilla de usar y de mantener.
- **Incrementalidad:** se construye por partes pequeñas y verificables.
- **Separación de responsabilidades:** presentación, lógica de negocio y datos no se mezclan.
- **Seguridad por defecto:** solo la Administración autenticada puede modificar el catálogo.

## 2. Alcance

Esta especificación cubre las decisiones fundacionales del proyecto, agrupadas en cinco áreas.

### 2.1. Arquitectura

Se adopta una arquitectura **monolítica modular de tres capas**:

| Capa | Responsabilidad |
|---|---|
| Frontend | Interfaz de usuario e interacción con la aplicación. |
| Backend | Procesamiento de solicitudes, reglas de negocio, validación y autenticación. |
| Base de datos | Almacenamiento persistente de la información. |

Frontend y backend se comunican mediante una **API REST** sobre HTTP, con intercambio de datos en JSON. El frontend nunca accede directamente a la base de datos.

### 2.2. Perfiles de acceso

| Perfil | Autenticación | Permisos |
|---|---|---|
| **Administración** | Inicio de sesión obligatorio. Existen varias cuentas. | Operaciones de modificación del catálogo y consulta. |
| **Estudiante** | Ninguna. No existe cuenta. | Solo consulta pública del catálogo. |

Las cuentas de Administración se crean mediante un **procedimiento técnico manual**, fuera de la aplicación, ejecutado con un script de línea de comandos ubicado en `scripts/` (ver §3). La aplicación no incluye registro de cuentas.

**Protección de la página de Administración:** `public/admin/index.html` no debe servirse a visitantes sin sesión. El backend protege la ruta `/admin/` **antes** del middleware de archivos estáticos y redirige a `/login.html` cuando no hay sesión válida. La protección de la API (§4.4) es independiente y siempre obligatoria.

### 2.3. Disponibilidad y despliegue (criterios, no implementación)

- La aplicación se ofrecerá por Internet desde un servidor institucional.
- Nginx actuará como proxy inverso y terminará HTTPS. Node.js ejecutará el backend y no se expondrá directamente a Internet.
- Las comunicaciones públicas usarán HTTPS.

La configuración concreta del servidor queda fuera de esta especificación (ver sección 8).

### 2.4. Persistencia

- Se usa **SQLite** como base de datos relacional.
- El archivo de base de datos del catálogo reside en el servidor institucional, dentro de `data/`.
- Las sesiones se almacenan en un **archivo SQLite separado**, también dentro de `data/` (ver §4.2 y §4.11).
- Solo el backend puede consultar o modificar las bases de datos.

### 2.5. Decisiones de producto que esta especificación respeta

Provienen del Product Goal y del Product Backlog y condicionan el diseño técnico, pero se detallarán en sus propias especificaciones:

- El estante es una **etiqueta** asignada al libro, no una entidad con gestión propia.
- La cantidad de ejemplares es un **valor que la Administración ajusta manualmente**. No hay préstamos ni devoluciones.
- Las capacidades *Posteriores* del backlog (digitalización y filtrado con IA) no forman parte del MVP.
- Las decisiones de producto transversales confirmadas se registran en la sección 10.

## 3. Estructura inicial del proyecto

La estructura de la versión 2.0 se mantiene, con **una adición**: el directorio `scripts/` (marcado con `← nuevo en v2.1`).

```text
indice-biblioteca/
│
├── public/
│   ├── index.html
│   ├── login.html
│   │
│   ├── admin/
│   │   └── index.html
│   │
│   ├── css/
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── public.css
│   │   └── admin.css
│   │
│   ├── js/
│   │   ├── public/
│   │   │   ├── main.js
│   │   │   ├── search.js
│   │   │   └── books.js
│   │   │
│   │   ├── admin/
│   │   │   ├── main.js
│   │   │   ├── books.js
│   │   │   └── auth.js
│   │   │
│   │   └── shared/
│   │       ├── api.js
│   │       └── utils.js
│   │
│   └── assets/
│       └── images/
│
├── src/
│   ├── app.js
│   ├── server.js
│   │
│   ├── config/
│   │   └── env.js
│   │
│   ├── database/
│   │   ├── connection.js
│   │   ├── schema.sql
│   │   └── migrations/
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── validation.middleware.js
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.repository.js
│   │   │
│   │   └── books/
│   │       ├── books.routes.js
│   │       ├── books.controller.js
│   │       ├── books.service.js
│   │       └── books.repository.js
│   │
│   └── utils/
│       └── errors.js
│
├── scripts/                      ← nuevo en v2.1
│   ├── init-db.js
│   └── create-admin.js
│
├── tests/
│   ├── auth/
│   └── books/
│
├── docs/
│   └── specifications/
│
├── data/
│   └── .gitkeep
│
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

**Nota sobre archivos de la raíz:** `.env` existe solo en cada entorno y **no se versiona** (debe figurar en `.gitignore`). Lo que se versiona es `.env.example`, con los nombres de las variables y sin valores sensibles. De igual forma, `data/` se versiona únicamente por su `.gitkeep`; los archivos de base de datos y de sesiones nunca.

**Nota sobre archivos adicionales:** otras utilidades del backend (por ejemplo, la normalización de texto de §10) se ubican en `src/utils/` sin modificar la estructura. Cualquier otro directorio nuevo exige actualizar esta especificación.

### 3.1. Responsabilidades de los directorios

| Directorio | Responsabilidad |
|---|---|
| `public/` | Archivos estáticos servidos al navegador (HTML, CSS, JS, recursos). |
| `public/admin/` | Página de la Administración (protegida, ver §2.2). |
| `public/css/` | Hojas de estilo. |
| `public/js/public/` | Módulos del área de Estudiantes. |
| `public/js/admin/` | Módulos del área de Administración. |
| `public/js/shared/` | Módulos compartidos entre ambas áreas. |
| `public/assets/` | Recursos visuales. |
| `src/` | Código del backend. |
| `src/config/` | Lectura y validación de variables de entorno. |
| `src/database/` | Conexión, esquema y migraciones de SQLite. |
| `src/middleware/` | Autenticación, validación y manejo de errores. |
| `src/modules/` | Módulos funcionales del backend (`auth`, `books`). |
| `src/utils/` | Utilidades compartidas del backend. |
| `scripts/` | Scripts de línea de comandos para operación técnica (inicializar la base de datos, crear cuentas de Administración). No se exponen por HTTP. |
| `tests/` | Pruebas automatizadas, organizadas por módulo. |
| `docs/specifications/` | Especificaciones del proyecto. |
| `data/` | Almacenamiento privado de las bases de datos. No es público. |

### 3.2. Organización interna del backend

Cada módulo funcional se divide en cuatro responsabilidades:

| Archivo | Responsabilidad | Prohibido |
|---|---|---|
| `*.routes.js` | Declarar endpoints y asociarlos a controladores. | Lógica de negocio. |
| `*.controller.js` | Recibir la solicitud y construir la respuesta HTTP. | Consultas SQL. |
| `*.service.js` | Aplicar reglas de negocio. | Detalles HTTP y SQL. |
| `*.repository.js` | Acceder a la base de datos. | Reglas de negocio. |

El flujo de dependencia es unidireccional: routes → controller → service → repository.

### 3.3. Organización interna del frontend

- Los archivos **HTML** definen la estructura.
- Los archivos **CSS** definen el diseño y la presentación.
- Los archivos **JavaScript** definen la interacción.
- El código se separa por área de uso: `public/` (Estudiantes), `admin/` (Administración) y `shared/` (compartido).
- Toda comunicación con el backend pasa por un único módulo compartido, `public/js/shared/api.js`.
- `login.html` usa las hojas `base.css`, `layout.css`, `components.css` y `public.css`, y su lógica vive en `public/js/admin/auth.js`.
- La base de interfaz común (tokens, plantilla HTML y componentes) se define en la sección 9.

## 4. Restricciones técnicas

### 4.1. Tecnologías obligatorias

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura de las interfaces. |
| CSS3 | Diseño y presentación. |
| JavaScript (ES Modules) | Frontend y backend. |
| Node.js (LTS) | Entorno de ejecución del backend. |
| Express | Servidor HTTP y API REST. |
| SQLite | Base de datos relacional. |
| better-sqlite3 | Acceso a SQLite desde Node.js para el catálogo y las cuentas. |
| Nginx | Proxy inverso y terminación HTTPS. |
| Git | Control de versiones. |
| npm | Gestión de dependencias. |
| VSCode | Entorno de desarrollo. |

**Tecnologías anticipadas para capacidades Posteriores (no forman parte del MVP):**

| Tecnología | Uso |
|---|---|
| Motor OCR de código abierto (por definir) | Extracción de texto de imágenes y PDF escaneados, en el servidor (HU-008). |
| Librería de recepción de archivos (por definir) | Carga de archivos subidos desde el navegador (HU-008). |
| Servicio de IA externo (proveedor por definir) | Selección de libros a partir de una descripción en lenguaje natural (HU-009). |

No se instalan ni configuran hasta que sus capacidades se especifiquen.

### 4.2. Tecnologías de seguridad

| Dependencia | Uso |
|---|---|
| bcryptjs | Generación y verificación de hashes de contraseñas. |
| express-session | Gestión de sesiones. |
| connect-sqlite3 | Almacenamiento persistente de sesiones en SQLite. |
| Helmet | Cabeceras HTTP de seguridad. |
| express-rate-limit | Limitación de solicitudes. |

**Nota sobre `connect-sqlite3`:** esta librería depende del paquete `sqlite3` y gestiona por sí misma su archivo y su tabla de sesiones. Por ello:

- Las sesiones se guardan en un archivo separado: `data/sessions.sqlite`.
- La tabla de sesiones **no** forma parte de `schema.sql` ni de las migraciones.
- `sqlite3` se acepta como dependencia transitiva usada **únicamente** por el almacén de sesiones. El resto del proyecto usa `better-sqlite3`.

Reglas de seguridad:

- La autenticación usa **sesiones con cookies**. No se usa JWT.
- Las cookies deben ser `HttpOnly`, `Secure` en producción y con una política `SameSite` definida en §4.8.
- Las contraseñas nunca se almacenan ni se registran en texto plano.
- Las reglas de acceso se aplican siempre en el backend, nunca solo ocultando elementos en la interfaz.

### 4.3. Restricciones del frontend

- No se usan frameworks frontend ni bibliotecas de componentes visuales.
- Se usa JavaScript con módulos ES.
- La comunicación con el backend se hace solo mediante la API REST.
- Las interfaces deben ser responsivas.
- El frontend no accede directamente a SQLite.
- No se usan estilos ni scripts *inline* (atributos `style`, `onclick`, bloques `<script>` o `<style>` con contenido), porque la política de seguridad de contenido de Helmet los bloquea.
- Los textos provenientes de la API se insertan con `textContent`, nunca con `innerHTML`.

### 4.4. Restricciones del backend

- Node.js y Express procesan todas las solicitudes.
- Las reglas de negocio están separadas de las consultas SQL.
- Las operaciones administrativas exigen autenticación y autorización.
- Las validaciones importantes se ejecutan en el backend.
- Los errores se gestionan de forma centralizada mediante `error.middleware.js`, con el formato de §4.7.
- El backend no expone archivos internos ni información sensible.

**Reglas anticipadas para capacidades Posteriores (HU-008 y HU-009; no aplican al MVP):**

- Los archivos subidos para su procesamiento (por ejemplo, para digitalización) se validan por tipo y tamaño en el backend, se procesan y no se conservan: solo se almacena el texto resultante.
- Las rutas que reciben archivos están sujetas a limitación de solicitudes y exigen autenticación.
- Las llamadas a servicios externos de IA se hacen solo desde el backend. La clave de acceso se guarda en una variable de entorno y nunca se expone al frontend ni se versiona.
- A los servicios externos de IA solo se envían los datos estrictamente necesarios del catálogo y de la consulta, nunca datos de cuentas de Administración, sesiones o información personal.
- Las rutas que consultan servicios externos de IA tienen una limitación de solicitudes más estricta que el resto.

### 4.5. Restricciones de la base de datos

- El acceso se realiza exclusivamente mediante el backend.
- Los archivos de base de datos **no se incluyen en Git**.
- Las modificaciones estructurales se documentan mediante migraciones en `src/database/migrations/`.
- `src/database/schema.sql` refleja el esquema vigente.
- Las restricciones de integridad se aplican también a nivel de base de datos cuando corresponda.
- El procedimiento operativo se define en §4.11.

### 4.6. Restricciones de infraestructura

- El backend se ejecuta en un servidor institucional.
- Nginx es el único punto de entrada público.
- Node.js no se expone directamente a Internet.
- Las conexiones públicas usan HTTPS.
- `data/` permanece fuera del acceso público.
- Deben contemplarse procedimientos de respaldo y recuperación de SQLite.
- Detrás de Nginx, Express debe confiar en el proxy (ver `TRUST_PROXY` en §4.9).
- *Anticipado para capacidades Posteriores:* el límite de tamaño de carga de archivos de Nginx debe ser coherente con el definido en el backend, y el servidor debe tener salida a Internet hacia el servicio de IA externo.

### 4.7. Formato de respuestas de la API

Todas las respuestas de `/api` son JSON con una de estas estructuras.

**Éxito:**

```json
{ "data": { } }
```

`data` contiene un objeto o un arreglo. Cuando una respuesta necesite información adicional (por ejemplo, el total de resultados), se agrega `"meta": { }` junto a `data`.

**Error:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mensaje legible en español.",
    "fields": { "title": "El título es obligatorio." }
  }
}
```

- `code` es una cadena estable en `UPPER_SNAKE_CASE`, pensada para que el frontend decida qué hacer.
- `message` es un texto en español apto para mostrarse al usuario.
- `fields` es opcional y solo aparece en errores de validación: asocia cada campo con su mensaje.

**Códigos HTTP y códigos de error base:**

| HTTP | Uso | `code` |
|---|---|---|
| 200 | Consulta o modificación exitosa. | — |
| 201 | Recurso creado. | — |
| 204 | Eliminación exitosa, sin cuerpo. | — |
| 400 | Datos inválidos o malformados. | `VALIDATION_ERROR` |
| 401 | Sin sesión válida. | `UNAUTHENTICATED` |
| 403 | Sesión válida pero sin permiso, o verificación de origen fallida. | `FORBIDDEN` |
| 404 | Recurso no encontrado. | `NOT_FOUND` |
| 409 | Conflicto (por ejemplo, libro duplicado). | `CONFLICT` |
| 429 | Demasiadas solicitudes. | `RATE_LIMITED` |
| 500 | Error interno. | `INTERNAL_ERROR` |

Reglas:

- Los errores 500 nunca incluyen trazas, rutas internas ni mensajes de la base de datos.
- Las especificaciones posteriores pueden agregar códigos propios, sin cambiar esta estructura.
- Un inicio de sesión fallido responde con un mensaje genérico que no revela si el usuario existe.

### 4.8. Sesión, CSRF y limitación de solicitudes

| Aspecto | Decisión |
|---|---|
| Nombre de la cookie | `ib.sid` |
| Atributos | `HttpOnly`, `SameSite=Lax`, `Secure` en producción. |
| Duración | 8 horas de inactividad (expiración deslizante). |
| Regeneración | Se regenera el identificador de sesión al iniciar sesión. |
| Cierre de sesión | Destruye la sesión en el servidor y borra la cookie. |
| Almacén | `connect-sqlite3` en `data/sessions.sqlite`. |
| `trust proxy` | Activado en producción (detrás de Nginx), controlado por `TRUST_PROXY`. |
| Protección CSRF | `SameSite=Lax` más verificación del encabezado `Origin` (o `Referer` si falta) en `POST`, `PUT`, `PATCH` y `DELETE`, contra el origen permitido (`ALLOWED_ORIGIN`). Los métodos que modifican exigen `Content-Type: application/json`. |
| Límite del login | 5 intentos fallidos por IP cada 15 minutos. Respuesta 429 con `RATE_LIMITED`. |
| Límite general de `/api` | 100 solicitudes por IP por minuto. |

Los valores numéricos son iniciales y pueden ajustarse en la especificación del inicio de sesión (SPEC-001) sin modificar esta sección, siempre que se justifique.

### 4.9. Variables de entorno

`src/config/env.js` lee y valida las variables al arrancar. Si falta una obligatoria, la aplicación no inicia y lo indica con un mensaje claro. `.env.example` lista los nombres sin valores sensibles.

| Variable | Obligatoria | Descripción |
|---|:---:|---|
| `NODE_ENV` | Sí | `development`, `test` o `production`. |
| `PORT` | Sí | Puerto en el que escucha Node.js. |
| `DATABASE_PATH` | Sí | Ruta del archivo SQLite del catálogo (por ejemplo, `data/library.sqlite`). |
| `SESSIONS_DIR` | Sí | Directorio del archivo de sesiones (por ejemplo, `data`). |
| `SESSIONS_DB` | Sí | Nombre del archivo de sesiones (por ejemplo, `sessions.sqlite`). |
| `SESSION_SECRET` | Sí | Secreto para firmar la cookie de sesión. Largo y aleatorio. |
| `TRUST_PROXY` | No | `1` cuando hay un proxy inverso delante. Por defecto `0`. |
| `ALLOWED_ORIGIN` | Sí | Origen permitido para la verificación CSRF (por ejemplo, `https://biblioteca.ejemplo.edu`). |

Las variables de las capacidades Posteriores (clave del servicio de IA, límites de carga) se definirán en sus propias especificaciones.

### 4.10. Estrategia de pruebas

- Se usa el ejecutor nativo de Node.js: **`node:test`** con `node:assert`. No se agregan frameworks de pruebas.
- Las pruebas se ubican en `tests/auth/` y `tests/books/`, con nombres `*.test.js`.
- Cada prueba que toque la base de datos usa una base **temporal o en memoria**, creada con `schema.sql`, nunca la base real.
- Las pruebas de API usan el servidor de la aplicación en un puerto efímero y la API `fetch` nativa de Node.
- Cada especificación define sus casos de prueba; la Definition of Done (§7.2) exige que pasen.

### 4.11. Operación de la base de datos

- Al abrir cada conexión se ejecutan `PRAGMA foreign_keys = ON` y `PRAGMA journal_mode = WAL`.
- `scripts/init-db.js` crea el archivo de base de datos si no existe y aplica `schema.sql`. Debe poder ejecutarse más de una vez sin dañar datos existentes.
- Las migraciones son archivos SQL numerados en `src/database/migrations/` (por ejemplo, `001-nombre.sql`), aplicados en orden. Las migraciones aplicadas se registran en una tabla `schema_migrations`.
- Toda migración se refleja también en `schema.sql`, que representa el esquema vigente completo.
- `scripts/create-admin.js` crea una cuenta de Administración pidiendo usuario y contraseña por línea de comandos, y guarda solo el hash (bcryptjs). La contraseña no se imprime ni se registra.
- El respaldo consiste en copiar el archivo de base de datos con la aplicación detenida o mediante el mecanismo de respaldo de SQLite. El procedimiento operativo queda fuera de alcance (§8.3).

### 4.12. Node.js y scripts npm

- `package.json` declara `"type": "module"` y el campo `engines` con la versión LTS de Node.js vigente al iniciar el desarrollo (el número exacto se fija en el incremento de andamiaje).
- Scripts npm obligatorios:

| Script | Función |
|---|---|
| `npm start` | Inicia el servidor en modo producción. |
| `npm run dev` | Inicia el servidor en modo desarrollo con reinicio automático (`node --watch`). |
| `npm test` | Ejecuta todas las pruebas con `node --test`. |
| `npm run db:init` | Ejecuta `scripts/init-db.js`. |
| `npm run admin:create` | Ejecuta `scripts/create-admin.js`. |

## 5. Convenciones de nombres

### 5.1. Archivos y directorios

- Nombres en **minúsculas**, con guiones cuando haga falta (`kebab-case`).
- En el backend, los archivos de módulo siguen el patrón `nombre.rol.js` (por ejemplo `books.service.js`, `auth.middleware.js`).
- Los directorios van en minúsculas.

### 5.2. JavaScript

| Elemento | Convención | Ejemplo |
|---|---|---|
| Variables y funciones | camelCase | `bookTitle`, `createBook` |
| Clases | PascalCase | `BookService` |
| Constantes | UPPER_SNAKE_CASE | `MAX_BOOK_QUANTITY` |
| Archivos | kebab-case o `nombre.rol.js` | `books.service.js` |

Se usan `import` y `export` de ES Modules en todo el proyecto. No se usa CommonJS (`require`).

**Idioma:** el código (nombres, comentarios técnicos, mensajes de commit) va en **inglés**. Los textos que ve el usuario (interfaz y mensajes de error de la API) van en **español**.

### 5.3. Base de datos

- Tablas y columnas en `snake_case`.
- Nombres de tablas en plural (`administrators`, `books`).
- Columnas de ejemplo: `password_hash`, `created_at`, `updated_at`, `shelf_label`, `title_normalized`.
- Las sesiones las gestiona `connect-sqlite3` en su propio archivo (§4.2); no se modelan en `schema.sql`.
- Los nombres deben ser descriptivos y consistentes. Los campos definitivos de cada tabla se fijarán en la especificación correspondiente.

### 5.4. CSS

- Clases en `kebab-case` (`.book-card`, `.search-input`, `.login-form`, `.admin-dashboard`).
- Se evitan selectores excesivamente específicos y estilos duplicados.
- Los estilos comunes van en `base.css`, `layout.css` y `components.css`. Los propios de cada área van en `public.css` y `admin.css`.
- Los valores de color, espaciado, tipografía, radio y sombra se toman de los tokens de §9.2, no se escriben directamente.

### 5.5. API REST

- Rutas en minúsculas, con sustantivos en plural y prefijo `/api` (por ejemplo, `/api/books`).
- Los métodos HTTP expresan la acción. Los detalles de cada endpoint se definirán en su especificación.
- Las respuestas siguen el formato de §4.7.

### 5.6. Documentación

- Especificaciones técnicas: `SPEC-NNN-nombre.md`, con identificador único y propósito claro. Secuencia: `SPEC-000-foundation.md`, `SPEC-001-[nombre].md`, `SPEC-002-[nombre].md`.
- Historias de usuario: `HU-NNN-nombre.md`. La numeración sigue la del Product Backlog (por ejemplo, `HU-001-inicio-de-sesion.md` corresponde a la capacidad 1).
- Los nombres de archivo van en minúsculas, con guiones y sin tildes.
- Ambos tipos de documento se guardan en `docs/specifications/`.
- Cada especificación técnica (SPEC) indica versión, estado y fecha.

## 6. Convenciones de Git

### 6.1. Ramas

| Rama | Uso |
|---|---|
| `main` | Versión estable. |
| `develop` | Integración del desarrollo. |
| `feature/` | Nuevas funcionalidades. |
| `fix/` | Corrección de errores. |
| `docs/` | Documentación. |
| `refactor/` | Mejora interna sin cambio de comportamiento. |

### 6.2. Nomenclatura de ramas

Formato `tipo/descripcion-breve`, en minúsculas y con guiones. Ejemplos: `feature/book-registration`, `feature/admin-authentication`, `fix/book-search`, `docs/foundation-spec`, `refactor/database-access`.

### 6.3. Commits

Se usa **Conventional Commits** con el formato `tipo: descripcion breve`.

| Tipo | Uso |
|---|---|
| `feat` | Nueva funcionalidad. |
| `fix` | Corrección de errores. |
| `docs` | Documentación. |
| `style` | Formato sin cambio de lógica. |
| `refactor` | Reestructuración interna. |
| `test` | Pruebas. |
| `chore` | Mantenimiento y configuración. |

Ejemplos: `docs: add foundation specification`, `feat: implement admin authentication`, `fix: correct book search validation`, `test: add books service tests`.

Los mensajes de commit se escriben en inglés y cada commit representa un cambio concreto y comprensible.

### 6.4. Flujo de trabajo

1. Las ramas `feature/`, `fix/`, `docs/` y `refactor/` se crean a partir de `develop`.
2. Al terminar, se integran en `develop` mediante merge.
3. `main` recibe únicamente versiones consideradas estables.
4. No se hacen cambios directamente en `main`.

### 6.5. Archivos que no se versionan

`.env`, los archivos de base de datos y de sesiones dentro de `data/` (incluidos los auxiliares de WAL: `*-wal` y `*-shm`), `node_modules/` y cualquier archivo con credenciales. Esto debe quedar reflejado en `.gitignore`.

## 7. Definition of Done técnica inicial

Un incremento se considera terminado cuando cumple los criterios que le **aplican** según su tipo. No todos los criterios aplican a todos los incrementos (por ejemplo, un incremento documental no tiene pruebas de base de datos).

### 7.1. Código

- Respeta la estructura de directorios de la sección 3.
- Respeta las convenciones de nombres de la sección 5.
- Mantiene la separación de responsabilidades (secciones 3.2 y 3.3).
- No incluye dependencias ni funcionalidades no justificadas ni no solicitadas.
- No contiene credenciales ni información sensible.
- No contiene estilos ni scripts *inline* (§4.3).

### 7.2. Calidad

- No presenta errores de sintaxis.
- Se ejecutaron las pruebas correspondientes al incremento (§4.10) y pasan.
- Se verificaron los casos de error relevantes.
- Ninguna prueba se declara ejecutada sin haberse ejecutado realmente. El resultado de cada verificación lo reporta quien la ejecutó.

### 7.3. Seguridad

- Las operaciones protegidas verifican autenticación y autorización.
- Las contraseñas se almacenan con hash seguro.
- Los datos recibidos se validan en el backend.
- No se exponen archivos internos ni información sensible.
- La configuración sensible se gestiona mediante variables de entorno.

### 7.4. Base de datos

- La estructura respeta el esquema vigente.
- Se mantienen las restricciones de integridad.
- Los cambios estructurales están documentados como migraciones y reflejados en `schema.sql`.
- Se verifica la persistencia cuando corresponde.

### 7.5. Interfaz

Aplica a incrementos que modifican páginas HTML, CSS o JavaScript del frontend.

- Usa la plantilla HTML y los tokens de la sección 9.
- Funciona con teclado y muestra foco visible.
- Se revisó en ancho móvil (320 px) y en escritorio.
- Los textos visibles están en español.

### 7.6. Documentación y Git

- Los cambios relevantes están documentados.
- Los commits siguen las convenciones de la sección 6.
- Los cambios están en la rama correcta.
- El resultado puede verificarse siguiendo instrucciones escritas, que indican cómo comprobarlo paso a paso.

### 7.7. Criterio de cierre de esta especificación

Se considera cumplida cuando: (a) el archivo existe en `docs/specifications/SPEC-000-foundation.md`, (b) fue revisado y aprobado por el equipo, y (c) fue registrado con un commit `docs:` en la rama correspondiente.

## 8. Fuera de alcance

Los siguientes elementos no forman parte de esta especificación y no deben implementarse como trabajo fundacional.

### 8.1. Funcionalidades y especificación funcional

- Historias de usuario y criterios de aceptación.
- Modelo de datos detallado (campos definitivos de cada tabla).
- Contrato detallado de los endpoints de la API.
- Implementación de registro, edición, eliminación o búsqueda de libros.
- Implementación de interfaces funcionales.
- Implementación del inicio de sesión.
- Creación o gestión de cuentas desde la interfaz.
- Cambio de contraseña y desactivación de cuentas (fuera del MVP).
- Digitalización de libros mediante escaneo y extracción de texto (capacidad Posterior #8).
- Filtrado de libros mediante inteligencia artificial (capacidad Posterior #9).

Las reglas de las secciones 4.1 y 4.4 sobre OCR, carga de archivos e IA son **anticipadas**: documentan restricciones para cuando esas capacidades se especifiquen y no obligan a implementar nada en el MVP.

### 8.2. Tecnologías

- Frameworks frontend (React, Vue, Angular, etc.).
- Frameworks backend adicionales.
- Gestores de base de datos distintos de SQLite.
- Servicios externos de autenticación.
- Arquitecturas de microservicios.
- Docker como requisito inicial.

### 8.3. Infraestructura y operación

- Configuración definitiva del servidor institucional.
- Adquisición de dominio.
- Despliegue en producción.
- Configuración operativa de respaldos automáticos.
- Registro de actividad (*logging*) avanzado.
- Integración con servicios externos no definidos.

Estos elementos podrán evaluarse en etapas posteriores cuando exista una necesidad concreta.

## 9. Base de interfaz

Esta sección fija el terreno común del frontend. El contenido de los archivos CSS y de las plantillas HTML se construye en un incremento de andamiaje, respetando lo definido aquí. No describe pantallas ni funcionalidades.

### 9.1. Reglas transversales

- Idioma de la interfaz: español (`lang="es"`).
- Diseño **mobile-first**: los estilos base son para móvil y se amplían con `@media (min-width: …)`.
- Puntos de quiebre (valores literales, porque las variables CSS no funcionan dentro de `@media`): **600 px** (tablet) y **900 px** (escritorio).
- Navegadores soportados: versiones actuales de Chrome, Edge, Firefox y Safari.
- Sin estilos ni scripts *inline* (§4.3).
- Textos de la API insertados con `textContent` (§4.3).
- Accesibilidad mínima:
  - contraste de texto suficiente (relación mínima 4.5:1 para texto normal);
  - todo campo de formulario con `<label>` asociado;
  - toda función disponible con teclado y foco siempre visible;
  - enlace «Saltar al contenido» al inicio de cada página;
  - resultados de búsqueda y mensajes de estado anunciados con `aria-live`;
  - el estado «agotado» se comunica con texto, no solo con color.

### 9.2. Tokens de diseño (`base.css`)

Se definen como variables CSS en `:root`. Los valores son **iniciales** y se validan (contraste incluido) en el incremento de andamiaje.

| Grupo | Tokens |
|---|---|
| Color | `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-primary`, `--color-primary-contrast`, `--color-danger`, `--color-success`, `--color-warning`, `--color-focus` |
| Tipografía | `--font-family` (pila de fuentes del sistema), `--font-size-sm`, `--font-size-base`, `--font-size-lg`, `--font-size-xl`, `--line-height` |
| Espaciado | `--space-1` (0.25rem), `--space-2` (0.5rem), `--space-3` (1rem), `--space-4` (1.5rem), `--space-5` (2rem) |
| Forma | `--radius`, `--shadow` |
| Layout | `--container-max` (por ejemplo, 60rem) |

Sin fuentes externas ni recursos de terceros: la interfaz debe funcionar sin acceso a CDN.

### 9.3. Responsabilidad de cada hoja de estilos

| Archivo | Contenido |
|---|---|
| `base.css` | Tokens, reinicio (*reset*), estilos de elementos HTML base y estilo de foco visible. |
| `layout.css` | Contenedor con ancho máximo, estructura `header` / `main` / `footer`, cuadrícula de resultados y reglas responsivas. |
| `components.css` | Botón (primario, secundario, peligro), campo de formulario con etiqueta y mensaje de error, alerta, tarjeta de libro, insignia «agotado», panel de detalle, estados vacío, cargando y error. |
| `public.css` | Solo lo propio del área de Estudiantes. |
| `admin.css` | Solo lo propio del área de Administración. |

### 9.4. Plantilla HTML común

Todas las páginas (`index.html`, `login.html`, `admin/index.html`) comparten esta estructura:

- `<!DOCTYPE html>` y `<html lang="es">`.
- En `<head>`: `charset` UTF-8, `viewport`, `<title>` descriptivo y las hojas de estilo en este orden: `base.css`, `layout.css`, `components.css` y la propia del área.
- Enlace «Saltar al contenido» como primer elemento de `<body>`.
- Regiones semánticas: `<header>`, `<main id="contenido">` y `<footer>`.
- Un único `<script type="module">` con `src` al módulo de entrada del área (`public/js/public/main.js` o `public/js/admin/main.js`; en `login.html`, `public/js/admin/auth.js`).
- - Las rutas de recursos y los enlaces entre páginas son **relativas** (`./css/base.css` en `public/`; `../css/base.css` en `public/admin/`), de modo que las páginas funcionen tanto con Express como con un servidor estático abierto desde la raíz del proyecto durante el desarrollo.

### 9.5. Módulos JavaScript compartidos

- `public/js/shared/api.js` expone una función única de petición que:
  - envía y recibe JSON, incluyendo las cookies de sesión;
  - interpreta el formato de respuesta de §4.7;
  - ante un error, lanza un error con `code`, `message` y `fields`;
  - ante un 401 en el área de Administración, redirige a `/login.html`.
- `public/js/shared/utils.js` contiene utilidades de interfaz sin acceso a la API (por ejemplo, crear elementos con texto seguro, mostrar u ocultar estados).
- Los módulos de cada área no llaman a `fetch` directamente.

## 10. Decisiones de producto transversales

Decisiones confirmadas que cada SPEC funcional debe respetar y detallar.

| # | Tema | Decisión |
|---|---|---|
| 1 | Duplicados | No se permiten. Un duplicado es el mismo título y autor, comparados sin distinguir mayúsculas, acentos ni espacios sobrantes. Se aplica en el servicio y con una restricción `UNIQUE` en la base de datos. Respuesta: 409 `CONFLICT`. |
| 2 | Listado | No existe listado completo del catálogo. Se llega a los libros solo mediante búsqueda (Estudiantes y Administración). |
| 3 | Detalle del libro | Es un panel dentro de `index.html` (y el mismo patrón en `admin/index.html`), no una página propia. Muestra el estante asignado, si lo tiene. |
| 4 | Estante | Etiqueta de texto libre asignada al libro. No es una entidad ni se gestiona por separado. |
| 5 | Búsqueda | Coincidencia parcial, sin distinguir mayúsculas ni acentos, sobre título y autor. Se implementa con columnas normalizadas (`title_normalized`, `author_normalized`), no con FTS5. |
| 6 | Normalización de texto | Recortar espacios, colapsar espacios internos, pasar a minúsculas y eliminar marcas diacríticas (descomposición Unicode NFD). Una única función en `src/utils/` la implementa y la usan tanto la búsqueda como la detección de duplicados. |
| 7 | Eliminación | Borrado físico, con confirmación previa en la interfaz. Es la única vía para retirar un título agotado. |
| 8 | Cuentas | Contraseña de 8 a 72 caracteres (72 es el límite de bcrypt). Cambio de contraseña y desactivación de cuentas quedan fuera del MVP. |

**Límites de campos:**

| Campo | Límite |
|---|---|
| Título | Obligatorio, máximo 200 caracteres. |
| Autor | Obligatorio, máximo 150 caracteres. |
| Estante | Opcional, máximo 30 caracteres. |
| Cantidad | Entero de 0 a 999 (`MAX_BOOK_QUANTITY = 999`). Mínimo **1 al registrar**; **0 solo al editar** (el libro se muestra como «agotado»). |

Estos límites se validan en el backend y se reflejan en la base de datos cuando corresponda.

## 11. Glosario

| Término | Significado |
|---|---|
| **Libro (título)** | Registro del catálogo que representa un título de un autor. Hay un registro por título, no uno por ejemplar físico. |
| **Ejemplar** | Copia física de un libro. Su número se guarda en el campo cantidad. |
| **Cantidad** | Número de ejemplares disponibles, ajustado manualmente por la Administración. |
| **Agotado** | Estado de un libro con cantidad igual a 0. Se muestra marcado. |
| **Estante** | Etiqueta de texto que indica dónde se guarda el libro. |
| **Catálogo** | Conjunto de libros registrados en el sistema. |
| **Administración** | Perfil con cuenta e inicio de sesión que mantiene el catálogo. |
| **Estudiante** | Perfil sin cuenta que solo consulta el catálogo. |
| **Capacidad** | Elemento del Product Backlog (numeradas del 1 al 9). |
| **HU** | Historia de usuario, derivada de una capacidad. |
| **SPEC** | Especificación técnica de un incremento. |

## 12. Proceso de especificación

### 12.1. Trazabilidad

Cada capacidad del Product Backlog tiene una HU (`HU-NNN`) y cada SPEC funcional indica a qué HU responde. Una SPEC puede cubrir una HU o un grupo de HU estrechamente relacionadas, pero toda HU del MVP debe quedar cubierta por alguna SPEC.

### 12.2. Definition of Ready (de una HU)

Una HU está lista para especificarse cuando:

- corresponde a una capacidad del Product Backlog;
- indica el perfil que la usa (Administración, Estudiante o ambos);
- tiene criterios de aceptación observables;
- no contradice SPEC-000 ni la sección 10;
- no tiene ambigüedades importantes sin resolver (si las tiene, se resuelven antes).

### 12.3. Plantilla de SPEC funcional

Toda `SPEC-NNN` (N ≥ 1) contiene, en este orden:

1. **Encabezado:** proyecto, tipo, versión, estado y fecha.
2. **Propósito y HU relacionadas.**
3. **Alcance y fuera de alcance.**
4. **Reglas de negocio.**
5. **Modelo de datos** (campos, tipos y restricciones del incremento).
6. **Contrato de la API** (método, ruta, entrada, salidas y errores, según §4.7).
7. **Interfaz** (comportamiento, estados y textos; respetando la sección 9).
8. **Seguridad.**
9. **Casos de prueba** (según §4.10).
10. **Plan de verificación** (pasos escritos para comprobar el resultado).
11. **Definition of Done aplicable** (qué apartados de la sección 7 aplican).

Una SPEC solo puede contradecir a SPEC-000 declarándolo de forma explícita y proponiendo su actualización.

---

**Fin de SPEC-000-foundation.md (v2.1)**