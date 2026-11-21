# SPRINT-001-backlog

| Campo | Valor |
|---|---|
| **Proyecto** | Índice Biblioteca |
| **Sprint** | 1 |
| **Especificación** | SPEC-001-acceso-registro-busqueda |
| **Base técnica** | SPEC-000-foundation v2.1 |
| **Fecha de creación** | 07/11/2026 |
| **Inicio / fin** | 10/11/2026 - 19/11/2026 |

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
| HU-001 | Inicio de sesión | Terminada | Incluye cierre de sesión (CA-007 propuesto, D-04). |
| HU-002 | Registrar libro físico | Terminada | |
| HU-006 | Búsqueda de libros por nombre o autor | Terminada | CA-009 y CA-010 quedan parcialmente verificados (D-02). En el Sprint 2 se completan «Editar» y «Eliminar»; «Ver información» llega con la capacidad 7. |

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


### 4.1. Resumen por bloque

| Bloque | Tareas | Rama | Estado |
|---|---|---|---|
| A. Andamiaje | T-01 a T-05, T-07 | `feature/inicio-session` | Terminada |
| A. Andamiaje | T-06 | `feature/inicio-session` | En Curso (pruebas PN escritas, sin ejecutar) |
| B. HU-001 | T-08 a T-12, T-14 | `feature/inicio-session` | Terminada |
| B. HU-001 | T-13 | `feature/inicio-session` | En Curso (pruebas PA escritas, sin ejecutar) |
| C. HU-002 | T-15 a T-17 | `feature/HU-002` | Terminada |
| C. HU-002 | T-18 | `feature/HU-002` | En Curso (pruebas PB escritas, sin ejecutar) |
| D. HU-006 | T-19 a T-22 | `feature/HU-006-clean` | Terminada |
| D. HU-006 | T-23 | `feature/HU-006-clean` | En Curso (pruebas PC escritas, sin ejecutar) |
| E. Cierre | T-24, T-25 | `feature/SPRINT-001` | Terminada |
| E. Cierre | T-26 | `feature/SPRINT-001` | En Curso (la Definition of Done está en Parcial) |
| Documentación | T-00 | `docs/spec-001` | En Curso (hasta aplicar los ajustes documentales) | 

## 5. Orden sugerido

1. T-00 (en paralelo con T-01).
2. Bloque A: T-01 → T-02 → T-03, T-04 → T-05. T-06 y T-07 pueden hacerse en paralelo.
3. Bloque B (HU-001), completo antes de seguir.
4. Bloque C (HU-002).
5. Bloque D (HU-006).
6. Bloque E.

## 6. Decisiones confirmadas

| ID | Tema | Decisión | Fecha | Quién confirmó | Impacto |
|---|---|---|---|---|---|
| D-12 | Contraseña validada también en bytes UTF-8 (máx. 72). | [Confirmada] | [14/11/2026] | [Nestor] | T-08 |
| D-13 | Variables con `process.loadEnvFile()`, sin `dotenv`. | [Confirmada] | [14/11/2026] | [Nestor] | T-02 |
| — | Aprobación de SPEC-001. | [Aprobada en versión 0.1] | [07/11/2026] | [David] | Todo el sprint |

## 7. Riesgos y su desenlace

| Riesgo | Mitigación prevista | Se materializó | Desenlace |
|---|---|---|---|
| Módulos nativos (`better-sqlite3`, `sqlite3`) sin binarios para el Node.js LTS vigente. | Verificar en T-01 antes de fijar `engines`. | [No] | Se usó Node.js v22.15.1. La aplicación arranca con `npm run dev`, lo que implica que ambos módulos cargan. [Pega la salida de `npm ls better-sqlite3 sqlite3` si la ejecutaste.] |
| CA-009 y CA-010 de HU-006 no se pueden cerrar sin las acciones del Sprint 2. | Cierre parcial documentado (D-02). | [No] | Cierre parcial documentado (D-02). V-21 y V-22 ejecutados el 19/11/2026. «Editar» y «Eliminar» se completan en el Sprint 2 y «Ver información» con la capacidad 7. |
| Agotado y sin estante no se producen desde la interfaz del Sprint 1. | Datos sembrados en T-23 y V-20. | [No] | [Cómo se prepararon los datos de agotado y sin estante en V-20.] |
| Coste de `bcryptjs` (JavaScript puro) en el servidor. | Factor de coste configurable. | [No] | [Factor de coste usado y, si se midió, el tiempo de login.] |

## 8. Criterio de cierre y resultado

### 8.1. Criterio
El Sprint 1 se da por cerrado cuando HU-001 y HU-002 están **Terminadas**, HU-006 está **Terminada** salvo la verificación completa de CA-009 y CA-010 (documentada para el Sprint 2), y se cumplió la Definition of Done aplicable de SPEC-000 §7.

### 8.2. Resultado por historia

| HU | Estado final | Evidencia |
|---|---|---|
| HU-001 | [Terminada] | verificación manual V-01 a V-08 (19/11/2026). Pruebas automatizadas PA: no ejecutadas. |
| HU-002 | [Terminada] | verificación manual V-09 a V-14 (19/11/2026). Pruebas automatizadas PB: no ejecutadas. |
| HU-006 | [Terminada, salvo CA-009 y CA-010 parciales] | verificación manual V-15 a V-22 (19/11/2026). Pruebas automatizadas PC: no ejecutadas. |

### 8.3. Pruebas automatizadas
No ejecutado. Los archivos de prueba existen en `tests/`, pero no se ejecutaron. La verificación se hizo manualmente con `npm run dev` el 19/11/2026, en la rama `feature/HU-006-clean`.

### 8.4. Verificación manual (SPEC-001 §10)
| Paso | Resultado | Ejecutó | Fecha | Observación |
|---|---|---|---|---|
| V-01 … V-28 | [Cumple] | David | 19/11/2026 | Verificación manual con npm run dev |

### 8.5. Definition of Done (SPEC-000 §7)
| Apartado | Cumple | Observación |
|---|---|---|
| §7.1 Código | [Sí] | |
| §7.2 Calidad | [Si] | |
| §7.3 Seguridad | [Si] | |
| §7.4 Base de datos | [Si] | |
| §7.5 Interfaz | [Si] | |
| §7.6 Documentación y Git | [Parcial] | |

### 8.6. Excepción declarada
HU-006 CA-009 y CA-010: parcialmente verificadas (D-02). En el Sprint 2 se completan «Editar» y «Eliminar». «Ver información» queda pendiente hasta la capacidad 7.

### 8.7. Pendiente para el Sprint 2

- Ejecutar con `npm test` las pruebas automatizadas (PN, PA, PB y PC), ya escritas, y registrar el resultado.
- Aplicar los ajustes documentales de T-00 (SPEC-000, HU-003, HU-004 y HU-006).
- Completar «Editar» y «Eliminar» de HU-006 CA-010 (Sprint 2) y «Ver información» (capacidad 7).

El Sprint 1 se da por cerrado cuando HU-001 y HU-002 están **Terminadas**, HU-006 está **Terminada** salvo la verificación completa de CA-009 y CA-010 (documentada para el Sprint 2), y se cumplió la Definition of Done aplicable de SPEC-000 §7.