# SPRINT-001-backlog

| Campo | Valor |
|---|---|
| **Proyecto** | Índice Biblioteca |
| **Sprint** | 1 |
| **Especificación** | SPEC-001-acceso-registro-busqueda (v0.1, borrador) |
| **Base técnica** | SPEC-000-foundation v2.1 |
| **Fecha de creación** | 07/11/2026 |
| **Inicio / fin** | Por definir |

Este es el único documento que se actualiza durante el sprint. El diseño técnico está en SPEC-001 y no cambia con el avance.

## 1. Objetivo del sprint

Que la Administración pueda iniciar sesión, registrar libros y buscarlos por título o autor, y que cualquier estudiante pueda buscar en el catálogo sin cuenta.

## 2. Estados

| Estado | Significado |
|---|---|
| **Pendiente** | No se ha comenzado. |
| **En Curso** | Se está trabajando en ella. |
| **Terminada** | Cumple la Definition of Done aplicable (SPEC-000 §7), con pruebas ejecutadas y aprobadas. |

Una tarea pasa a **Terminada** solo cuando quien la ejecutó reporta las verificaciones realizadas. Las que no se ejecutaron no se marcan como hechas (SPEC-000 §7.2).

## 3. Historias del sprint

| HU | Nombre | Estado | Observación |
|---|---|---|---|
| HU-001 | Inicio de sesión | Pendiente | Incluye cierre de sesión (CA-007 propuesto, D-04). |
| HU-002 | Registrar libro físico | Pendiente | |
| HU-006 | Búsqueda de libros por nombre o autor | Pendiente | CA-009 y CA-010 quedan parcialmente verificados (D-02). Se cierran en el Sprint 2. |

**Fuera del sprint:** HU-003, HU-004, HU-005, HU-008, HU-009 y la capacidad 7.

## 4. Tareas técnicas

| ID | Tarea | HU | Depende de | Rama | Estado |
|---|---|---|---|---|---|
| **Bloque A. Andamiaje** | | | | | |
| T-00 | Aplicar los ajustes documentales autorizados (SPEC-001 Anexo B): HU-001, HU-002, HU-006, HU-004 y actualización de SPEC-000. | Todas | | `docs/spec-001` | Pendiente |
| T-01 | Preparar proyecto: rama `develop`, `package.json` (`type: module`, `engines`, scripts npm), dependencias, `.gitignore`, `.env.example` y estructura de directorios. Confirmar que `better-sqlite3` y `sqlite3` instalan en el Node.js LTS vigente. | Todas | | `feature/project-scaffolding` | Pendiente |
| T-02 | `src/config/env.js`: lectura con `process.loadEnvFile()` y validación al arrancar. | Todas | T-01 | `feature/project-scaffolding` | Pendiente |
| T-03 | Base de datos: `connection.js` (PRAGMAs), `schema.sql` (`administrators`, `books`, `schema_migrations`), `init-db.js` idempotente. | HU-001, HU-002, HU-006 | T-02 | `feature/project-scaffolding` | Pendiente |
| T-04 | `app.js` (fábrica) y `server.js`: Helmet con CSP, JSON con límite, proxy de confianza, estáticos, `error.middleware`, `errors.js` y 404 de API. | Todas | T-02 | `feature/project-scaffolding` | Pendiente |
| T-05 | Middlewares transversales: verificación de origen y tipo de contenido, `no-store` y limitador general de `/api`. | Todas | T-04 | `feature/project-scaffolding` | Pendiente |
| T-06 | `src/utils/normalize-text.js` con sus pruebas (PN-01 a PN-06). | HU-002, HU-006 | T-01 | `feature/project-scaffolding` | Pendiente |
| T-07 | Base de interfaz mínima: tokens y estilos (`base.css`, `layout.css`, `components.css`), plantilla HTML, `shared/api.js` y `shared/utils.js`. | Todas | T-01 | `feature/project-scaffolding` | Pendiente |
| **Bloque B. HU-001** | | | | | |
| T-08 | `scripts/create-admin.js` y la creación de cuenta en `auth.service` (valida usuario, contraseña, hash, sin imprimir). | HU-001 | T-03 | `feature/admin-authentication` | Pendiente |
| T-09 | Sesiones: `session.middleware.js` con `express-session` y `connect-sqlite3` (cookie `ib.sid`, 8 h deslizantes, regeneración). | HU-001 | T-04 | `feature/admin-authentication` | Pendiente |
| T-10 | Módulo `auth`: repositorio, servicio, controlador y rutas de login, con limitador de login y hash simulado. | HU-001 | T-08, T-09, T-05 | `feature/admin-authentication` | Pendiente |
| T-11 | `auth.middleware.js` (`requireAdmin`) y guardia de `/admin` antes de los estáticos. | HU-001 | T-09 | `feature/admin-authentication` | Pendiente |
| T-12 | Interfaz: `login.html` y `admin/auth.js`; esqueleto de `admin/index.html` y `admin/main.js`. | HU-001 | T-07, T-10, T-11 | `feature/admin-authentication` | Pendiente |
| T-13 | Pruebas de acceso (`tests/auth/`, PA-01 a PA-22 excepto PA-20). Incluye `tests/test-app.js`. | HU-001 | T-10, T-11 | `feature/admin-authentication` | Pendiente |
| T-14 | Cierre de sesión: endpoint, botón "Cerrar sesión" y prueba PA-20. | HU-001 | T-11, T-12 | `feature/admin-authentication` | Pendiente |
| **Bloque C. HU-002** | | | | | |
| T-15 | `books.repository` y `books.service`: validación, normalización, detección de duplicado y conversión de `UNIQUE` a 409. | HU-002 | T-03, T-06 | `feature/book-registration` | Pendiente |
| T-16 | Controlador y rutas de `POST /api/books` con `requireAdmin`. | HU-002 | T-11, T-15 | `feature/book-registration` | Pendiente |
| T-17 | Formulario de registro en `admin/index.html` y `admin/books.js`. | HU-002 | T-12, T-16 | `feature/book-registration` | Pendiente |
| T-18 | Pruebas de registro, duplicados y persistencia (`tests/books/`, PB-01 a PB-16). | HU-002 | T-16 | `feature/book-registration` | Pendiente |
| **Bloque D. HU-006** | | | | | |
| T-19 | Repositorio y servicio de búsqueda: coincidencia con `instr()`, orden y validación de `q`. | HU-006 | T-06, T-15 | `feature/book-search` | Pendiente |
| T-20 | Controlador y ruta pública `GET /api/books?q=`. | HU-006 | T-19 | `feature/book-search` | Pendiente |
| T-21 | Interfaz pública: `index.html`, `public/main.js`, `search.js`, `books.js`, `shared/book-card.js`, `shared/search-view.js`, estados y `aria-live`. | HU-006 | T-07, T-20 | `feature/book-search` | Pendiente |
| T-22 | Sección de búsqueda del administrador en `admin/index.html` y `admin/books.js`, con la misma tarjeta y el contenedor de acciones vacío. | HU-006 | T-12, T-21 | `feature/book-search` | Pendiente |
| T-23 | Pruebas de búsqueda con datos sembrados para agotado y sin estante (`tests/books/`, PC-01 a PC-15). | HU-006 | T-20 | `feature/book-search` | Pendiente |
| **Bloque E. Cierre** | | | | | |
| T-24 | Verificación manual completa del plan de SPEC-001 §10 (V-01 a V-28), con resultados registrados. | Todas | T-14, T-17, T-22 | `develop` | Pendiente |
| T-25 | `README.md`: instalación, `.env`, `db:init`, `admin:create`, `dev` y pruebas. | Todas | T-14 | `docs/readme` | Pendiente |
| T-26 | Revisión de la Definition of Done, commits convencionales en inglés y merge a `develop`. | Todas | T-24, T-25 | `develop` | Pendiente |

## 5. Orden sugerido

1. T-00 (en paralelo con T-01).
2. Bloque A: T-01 → T-02 → T-03, T-04 → T-05. T-06 y T-07 pueden hacerse en paralelo.
3. Bloque B (HU-001), completo antes de seguir.
4. Bloque C (HU-002).
5. Bloque D (HU-006).
6. Bloque E.

## 6. Pendientes por confirmar antes de empezar

| ID | Pendiente | Bloquea |
|---|---|---|
| D-12 | Validar la contraseña también en bytes UTF-8 (máximo 72). | T-08 |
| D-13 | Leer variables con `process.loadEnvFile()` y no agregar `dotenv`. | T-02 |
| — | Aprobación de SPEC-001. | Todo el Bloque A en adelante |

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Módulos nativos (`better-sqlite3`, `sqlite3`) sin binarios para el Node.js LTS vigente. | Verificarlo en T-01 antes de fijar `engines`. |
| CA-009 y CA-010 de HU-006 no se pueden cerrar sin las acciones del Sprint 2. | Cierre parcial documentado (D-02). |
| Agotado y sin estante no se producen desde la interfaz del Sprint 1. | Datos sembrados en pruebas (T-23) y preparación de datos de desarrollo en V-20. |
| Coste de `bcryptjs` (JavaScript puro) en el servidor. | El factor de coste es un valor de configuración ajustable. |

## 8. Criterio de cierre del sprint

El Sprint 1 se da por cerrado cuando HU-001 y HU-002 están **Terminadas**, HU-006 está **Terminada** salvo la verificación completa de CA-009 y CA-010 (documentada para el Sprint 2), y se cumplió la Definition of Done aplicable de SPEC-000 §7.