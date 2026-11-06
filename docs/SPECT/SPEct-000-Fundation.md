# SPEC-000-foundation

**Proyecto:** Índice Biblioteca  
**Tipo:** Especificación fundacional  
**Versión:** 2.0  
**Estado:** Borrador para aprobación  
**Fecha:** 05/11/2026  
**Ruta del archivo:** `docs/specifications/SPEC-000-foundation.md`

---

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

Las cuentas de Administración se crean mediante un **procedimiento técnico manual**, fuera de la aplicación. La aplicación no incluye registro de cuentas.

### 2.3. Disponibilidad y despliegue (criterios, no implementación)

- La aplicación se ofrecerá por Internet desde un servidor institucional.
- Nginx actuará como proxy inverso y terminará HTTPS. Node.js ejecutará el backend y no se expondrá directamente a Internet.
- Las comunicaciones públicas usarán HTTPS.

La configuración concreta del servidor queda fuera de esta especificación (ver sección 8).

### 2.4. Persistencia

- Se usa **SQLite** como base de datos relacional.
- El archivo de base de datos reside en el servidor institucional, dentro de `data/`.
- Solo el backend puede consultar o modificar la base de datos.

### 2.5. Decisiones de producto que esta especificación respeta

Provienen del Product Goal y del Product Backlog y condicionan el diseño técnico, pero se detallarán en sus propias especificaciones:

- El estante es una **etiqueta** asignada al libro, no una entidad con gestión propia.
- La cantidad de ejemplares es un **valor que la Administración ajusta manualmente**. No hay préstamos ni devoluciones.
- Las capacidades *Posteriores* del backlog (digitalización y filtrado con IA) no forman parte del MVP.

## 3. Estructura inicial del proyecto

La estructura de directorios definida en la versión 1.0 **se mantiene sin cambios**.

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

**Nota sobre archivos de la raíz:** `.env` existe solo en cada entorno y **no se versiona** (debe figurar en `.gitignore`). Lo que se versiona es `.env.example`, con los nombres de las variables y sin valores sensibles. De igual forma, `data/` se versiona únicamente por su `.gitkeep`; el archivo de base de datos nunca.

### 3.1. Responsabilidades de los directorios

| Directorio | Responsabilidad |
|---|---|
| `public/` | Archivos estáticos servidos al navegador (HTML, CSS, JS, recursos). |
| `public/admin/` | Página de la Administración. |
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
| `tests/` | Pruebas automatizadas, organizadas por módulo. |
| `docs/specifications/` | Especificaciones del proyecto. |
| `data/` | Almacenamiento privado de la base de datos. No es público. |

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

## 4. Restricciones técnicas

### 4.1. Tecnologías obligatorias

Las tecnologías de la versión 1.0 **se mantienen sin cambios**.

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura de las interfaces. |
| CSS3 | Diseño y presentación. |
| JavaScript (ES Modules) | Frontend y backend. |
| Node.js (LTS) | Entorno de ejecución del backend. |
| Express | Servidor HTTP y API REST. |
| SQLite | Base de datos relacional. |
| better-sqlite3 | Acceso a SQLite desde Node.js. |
| Nginx | Proxy inverso y terminación HTTPS. |
| Git | Control de versiones. |
| npm | Gestión de dependencias. |
| VSCode | Entorno de desarrollo. |
| Motor OCR de código abierto (por definir) | Extracción de texto de imágenes y PDF escaneados, en el servidor (HU-008). |
| Librería de recepción de archivos (por definir) | Carga de archivos subidos desde el navegador (HU-008). |
| Servicio de IA externo (proveedor por definir) | Selección de libros a partir de una descripción en lenguaje natural (HU-009). |

### 4.2. Tecnologías de seguridad

| Dependencia | Uso |
|---|---|
| bcryptjs | Generación y verificación de hashes de contraseñas. |
| express-session | Gestión de sesiones. |
| connect-sqlite3 | Almacenamiento persistente de sesiones en SQLite. |
| Helmet | Cabeceras HTTP de seguridad. |
| express-rate-limit | Limitación de solicitudes. |

Reglas de seguridad:

- La autenticación usa **sesiones con cookies**. No se usa JWT.
- Las cookies deben ser `HttpOnly`, `Secure` en producción y con una política `SameSite` adecuada.
- Las contraseñas nunca se almacenan ni se registran en texto plano.
- Las reglas de acceso se aplican siempre en el backend, nunca solo ocultando elementos en la interfaz.

### 4.3. Restricciones del frontend

- No se usan frameworks frontend ni bibliotecas de componentes visuales.
- Se usa JavaScript con módulos ES.
- La comunicación con el backend se hace solo mediante la API REST.
- Las interfaces deben ser responsivas.
- El frontend no accede directamente a SQLite.

### 4.4. Restricciones del backend

- Node.js y Express procesan todas las solicitudes.
- Las reglas de negocio están separadas de las consultas SQL.
- Las operaciones administrativas exigen autenticación y autorización.
- Las validaciones importantes se ejecutan en el backend.
- Los errores se gestionan de forma centralizada mediante `error.middleware.js`.
- El backend no expone archivos internos ni información sensible.
- Los archivos subidos para su procesamiento (por ejemplo, para digitalización) se validan por tipo y tamaño en el backend, se procesan y no se conservan: solo se almacena el texto resultante.
- Las rutas que reciben archivos están sujetas a limitación de solicitudes y exigen autenticación.
- Las llamadas a servicios externos de IA se hacen solo desde el backend. La clave de acceso se guarda en una variable de entorno y nunca se expone al frontend ni se versiona.
- A los servicios externos de IA solo se envían los datos estrictamente necesarios del catálogo y de la consulta, nunca datos de cuentas de Administración, sesiones o información personal.
- Las rutas que consultan servicios externos de IA tienen una limitación de solicitudes más estricta que el resto.

### 4.5. Restricciones de la base de datos

- El acceso se realiza exclusivamente mediante el backend.
- El archivo de base de datos **no se incluye en Git**.
- Las modificaciones estructurales se documentan mediante migraciones en `src/database/migrations/`.
- `src/database/schema.sql` refleja el esquema vigente.
- Las restricciones de integridad se aplican también a nivel de base de datos cuando corresponda.

### 4.6. Restricciones de infraestructura

- El backend se ejecuta en un servidor institucional.
- Nginx es el único punto de entrada público.
- Node.js no se expone directamente a Internet.
- Las conexiones públicas usan HTTPS.
- `data/` permanece fuera del acceso público.
- Deben contemplarse procedimientos de respaldo y recuperación de SQLite.
- El límite de tamaño de carga de archivos de Nginx debe ser coherente con el límite definido en el backend.
- El servidor debe tener salida a Internet hacia el servicio de IA externo. `.env.example` incluye el nombre de la variable de la clave, sin su valor.

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

### 5.3. Base de datos

- Tablas y columnas en `snake_case`.
- Nombres de tablas en plural (`administrators`, `books`, `sessions`).
- Columnas de ejemplo: `password_hash`, `created_at`, `updated_at`, `shelf_label`.
- Los nombres deben ser descriptivos y consistentes. Los campos definitivos de cada tabla se fijarán en la especificación correspondiente.

### 5.4. CSS

- Clases en `kebab-case` (`.book-card`, `.search-input`, `.login-form`, `.admin-dashboard`).
- Se evitan selectores excesivamente específicos y estilos duplicados.
- Los estilos comunes van en `base.css`, `layout.css` y `components.css`. Los propios de cada área van en `public.css` y `admin.css`.

### 5.5. API REST

- Rutas en minúsculas, con sustantivos en plural y prefijo `/api` (por ejemplo, `/api/books`).
- Los métodos HTTP expresan la acción. Los detalles de cada endpoint se definirán en su especificación.

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

`.env`, el archivo de base de datos dentro de `data/`, `node_modules/` y cualquier archivo con credenciales. Esto debe quedar reflejado en `.gitignore`.

## 7. Definition of Done técnica inicial

Un incremento se considera terminado cuando cumple los criterios que le **aplican** según su tipo. No todos los criterios aplican a todos los incrementos (por ejemplo, un incremento documental no tiene pruebas de base de datos).

### 7.1. Código

- Respeta la estructura de directorios de la sección 3.
- Respeta las convenciones de nombres de la sección 5.
- Mantiene la separación de responsabilidades (secciones 3.2 y 3.3).
- No incluye dependencias ni funcionalidades no justificadas ni no solicitadas.
- No contiene credenciales ni información sensible.

### 7.2. Calidad

- No presenta errores de sintaxis.
- Se ejecutaron las pruebas correspondientes al incremento y pasan.
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
- Los cambios estructurales están documentados como migraciones.
- Se verifica la persistencia cuando corresponde.

### 7.5. Documentación y Git

- Los cambios relevantes están documentados.
- Los commits siguen las convenciones de la sección 6.
- Los cambios están en la rama correcta.
- El resultado puede verificarse siguiendo instrucciones escritas, que indican cómo comprobarlo paso a paso.

### 7.6. Criterio de cierre de esta especificación

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
- Digitalización de libros mediante escaneo y extracción de texto.
- Filtrado de libros manualmente o mediante inteligencia artificial.

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
- Integración con servicios externos no definidos.

Estos elementos podrán evaluarse en etapas posteriores cuando exista una necesidad concreta.

---

**Fin de SPEC-000-foundation.md (v2.0)**
