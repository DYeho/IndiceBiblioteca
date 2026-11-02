# SPEC-000: Fundación del proyecto

| Campo | Valor |
|-------|-------|
| Proyecto | Índice Biblioteca |
| Estado | Aprobado |
| Versión | 1.0 |
| Depende de | Product Goal de Índice Biblioteca |

## 1. Propósito

Dejar definida la base técnica y de trabajo del proyecto antes de implementar
cualquier historia funcional: estructura de carpetas, restricciones técnicas,
convenciones y criterios mínimos de calidad.

Esta SPEC permite que las siguientes SPECs (SPEC-001 en adelante) se
implementen sobre una base común y sin decisiones técnicas repetidas.

## 2. Alcance

Incluye:

- Estructura inicial de carpetas y archivos del proyecto.
- Una página base que cargue correctamente su CSS y su módulo JavaScript.
- Decisiones de stack: frontend, backend y base de datos.
- Convenciones de nombres y de Git.
- Definition of Done técnica inicial.
- Instrucciones para ejecutar el proyecto localmente desde VSCode.

No incluye implementar el servidor, la base de datos ni ninguna historia
funcional (ver sección 8).

## 3. Estructura inicial del proyecto

```
indice-biblioteca/
├── docs/
│   └── specs/
│       └── SPEC-000-foundation.md
├── src/
│   └── client/
│       ├── index.html
│       ├── css/
│       │   └── styles.css
│       ├── js/
│       │   └── main.js
│       └── assets/
├── .editorconfig
├── .gitignore
└── README.md
```

Estructura prevista, que se crea cuando una SPEC la necesite:

```
├── src/
│   └── server/        # API en Node.js (SPEC de persistencia)
├── data/              # archivo SQLite local, excluido de Git
└── package.json       # se crea con la primera dependencia o script de Node
```

Reglas de la estructura:

- Todo el código de la aplicación vive en `src/`.
- `src/client/` contiene el frontend; `src/server/` contendrá el backend.
- `src/client/index.html` es el único punto de entrada de la página.
- `src/client/js/main.js` es el único script cargado desde el HTML, con
  `<script type="module">`. El resto de los módulos se importan desde él.
- Las carpetas nuevas se crean cuando una SPEC las necesite, no antes.
- Las carpetas vacías se versionan con un archivo `.gitkeep`.
- Las SPECs se guardan en `docs/specs/`.

## 4. Restricciones técnicas

| # | Restricción |
|---|-------------|
| RT-1 | El frontend usa solo HTML5, CSS3 y JavaScript con ES Modules. |
| RT-2 | No se usan frameworks ni librerías de frontend, salvo autorización expresa en una SPEC. |
| RT-3 | No se usa bundler ni paso de compilación en el frontend. |
| RT-4 | Todo el código de la aplicación está dentro de `src/`. |
| RT-5 | El backend es una API propia en Node.js, con ES Modules (`"type": "module"` en `package.json`). |
| RT-6 | La persistencia usa una base de datos relacional con SQLite como motor. |
| RT-7 | El archivo de SQLite vive en `data/` y no se versiona. |
| RT-8 | Se prevé migrar a PostgreSQL si el proyecto crece. Por eso el acceso a datos se aísla en una capa propia y no se dispersa SQL por el código. La SPEC de persistencia define cómo. |
| RT-9 | Hasta que exista la SPEC de persistencia, no se almacenan datos de forma permanente. |
| RT-10 | Debe poder ejecutarse localmente desde VSCode. |
| RT-11 | Mientras no exista el backend, el frontend se sirve con un servidor estático local con `src/client/` como raíz (por ejemplo, la extensión Live Server de VSCode), porque los ES Modules no cargan desde `file://`. Cuando exista el backend, la SPEC de persistencia define cómo se sirve el frontend. |
| RT-12 | Las librerías del backend (servidor web, controlador de SQLite, sesiones, cifrado de contraseñas) se eligen en la SPEC que las necesite y se justifican ahí. |
| RT-13 | El HTML usa elementos semánticos y declara `lang="es"` y `<meta charset="utf-8">`. |
| RT-14 | Las rutas de importación son relativas y con extensión explícita (`./modulo.js`). |
| RT-15 | Se usa la versión LTS de Node.js vigente al momento de instalar; la versión exacta se anota en el `README.md` cuando se cree el backend. |

## 5. Convenciones de nombres

Identificadores de código en inglés (incluidas tablas y columnas SQL); textos
visibles al usuario en español.

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Archivos y carpetas | kebab-case, minúsculas | `book-list.js`, `styles.css` |
| Variables y funciones | camelCase | `searchBooks` |
| Clases | PascalCase | `BookRepository` |
| Constantes globales | UPPER_SNAKE_CASE | `MAX_RESULTS` |
| Clases CSS | kebab-case | `book-card` |
| IDs en HTML | kebab-case, solo si son necesarios | `search-input` |
| Variables CSS | `--` más kebab-case | `--color-primary` |
| Tablas y columnas SQL | snake_case, en inglés; tablas en plural | `books`, `shelf_label` |
| SPECs | `SPEC-NNN-slug.md` (NNN de tres dígitos) | `SPEC-001-login.md` |

Reglas adicionales:

- Un módulo JavaScript tiene una sola responsabilidad.
- Se prefieren exportaciones nombradas sobre `export default`.
- Los nombres describen intención, sin abreviaturas ambiguas.

## 6. Convenciones de Git

**Ramas**

- `main`: siempre estable y ejecutable.
- Ramas de trabajo: `feature/spec-NNN-slug`, `fix/descripcion-corta`,
  `docs/descripcion-corta`.
- Una rama por SPEC o por corrección.

**Commits** (Conventional Commits, en español, en imperativo)

```
<tipo>(<alcance opcional>): <descripción>
```

Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

Ejemplos:

```
chore: crear estructura inicial del proyecto
docs: agregar SPEC-000 de fundación
```

Reglas:

- Un commit representa un cambio lógico y completo.
- No se versionan secretos, credenciales ni archivos de configuración local.
- `.gitignore` excluye como mínimo: `node_modules/`, `.env`, `.DS_Store`,
  archivos de logs y `data/` (archivos `.db` y `.sqlite`).
- Los cambios llegan a `main` solo desde ramas de trabajo.

## 7. Definition of Done técnica inicial

Un incremento se considera terminado cuando cumple todo lo siguiente:

- [ ] Cumple lo que dice su SPEC, sin agregar requisitos no solicitados.
- [ ] La estructura de carpetas coincide con la sección 3.
- [ ] El frontend se abre en el navegador servido desde `src/client/` y la consola no muestra errores.
- [ ] `index.html` carga `styles.css` y `main.js` (como módulo) correctamente.
- [ ] El HTML usa elementos semánticos y declara `lang="es"`.
- [ ] No se usan frameworks de frontend, bundlers ni dependencias no autorizadas.
- [ ] Los nombres siguen la sección 5.
- [ ] Los cambios están en una rama con commits según la sección 6.
- [ ] No hay secretos ni archivos de base de datos versionados.
- [ ] `README.md` explica cómo ejecutar el proyecto localmente.
- [ ] La verificación se realizó manualmente y su resultado quedó anotado; no se da nada por probado sin ejecutarlo.

## 8. Fuera de alcance

- Cualquier historia funcional: inicio de sesión, registro, edición, eliminación,
  búsqueda, ubicación por estante, detalle del libro.
- Implementar el servidor Node.js, la conexión a SQLite, el modelo de datos y la API.
- Elegir las librerías del backend.
- Digitalización de texto (OCR) y filtrado con IA.
- Autenticación y autorización.
- Alta de cuentas de Administración.
- Diseño visual definitivo y sistema de diseño.
- Pruebas automatizadas, integración continua y despliegue.
- Frameworks, librerías de frontend y bundlers.