# SPRINT-002-backlog

| Campo | Valor |
|---|---|
| **Proyecto** | Índice Biblioteca |
| **Sprint** | 2 |
| **Especificación** | SPEC-002-estante-edicion-eliminacion |
| **Base técnica** | SPEC-000-foundation v2.2 y SPEC-001-acceso-registro-busqueda |
| **Fecha de creación** | 20/11/2026 |
| **Inicio / fin** | 21/11/2026 - 25/11/2026 |

Este es el único documento que se actualiza durante el sprint. El diseño técnico está en SPEC-002 y no cambia con el avance.

## 1. Objetivo del sprint

Que la Administración pueda asignar y cambiar el estante de cada libro, editar sus datos y eliminarlo, accediendo a «Editar» y «Eliminar» desde su búsqueda, y que queden ejecutadas las pruebas automatizadas del Sprint 1 que quedaron pendientes.

## 2. Estados

| Estado | Significado |
|---|---|
| **Pendiente** | No se ha comenzado. |
| **En Curso** | Se está trabajando en ella. |
| **Terminada** | Cumple la Definition of Done aplicable (SPEC-000 §7), con pruebas ejecutadas y aprobadas. |

Una tarea pasa a **Terminada** solo cuando quien la ejecutó reporta las verificaciones realizadas. Las que no se ejecutaron no se marcan como hechas (SPEC-000 §7.2). Una tarea que incluye pruebas automatizadas no se marca **Terminada** si esas pruebas no se ejecutaron con `npm test`.

## 3. Historias del sprint

| HU | Nombre | Estado | Observación |
|---|---|---|---|
| HU-003 | Organizar libros por estante | Pendiente | |
| HU-004 | Editar libros registrados | Pendiente | |
| HU-005 | Eliminar libro | Pendiente | |
| HU-006 | Búsqueda de libros por nombre o autor | Terminada (Sprint 1) | CA-010 se completa en parte: «Editar» y «Eliminar». CA-009 y CA-010 siguen parcialmente verificados hasta que exista «Ver información» (capacidad 7, D-27). |

**Deuda técnica del Sprint 1 incluida en este sprint:** ejecución de las pruebas automatizadas PN, PA, PB y PC, que existen pero no se ejecutaron (T-27).

**Fuera del sprint:** HU-007 (capacidad 7), HU-008, HU-009, quitar el estante de un libro, operaciones en lote, historial y auditoría, y un mecanismo de ejecución de migraciones.

## 4. Tareas técnicas

| ID | Tarea | HU | Depende de | Rama | Estado |
|---|---|---|---|---|---|
| **Bloque A. Verificación previa** | | | | | |
| T-27 | Ejecutar con `npm test` la suite completa del Sprint 1 (PN, PA, PB y PC) y registrar el resultado real en SPRINT-001-backlog §8.3. Si hay fallos, corregirlos antes de seguir. | Deuda Sprint 1 | | `develop` (solo ejecución); `feature/SPRINT-001` si hay correcciones | Pendiente |
| T-28 | Verificar en `schema.sql` las restricciones `quantity` de 0 a 999, `shelf_label` de 1 a 30 (nulo permitido) y `UNIQUE` de título y autor normalizados. Si falta alguna, detener HU-003 y decidir cómo aplicarla (no hay ejecutor de migraciones). | HU-003, HU-004 | T-27 | `feature/HU-003` | Pendiente |
| **Bloque B. HU-003** | | | | | |
| T-29 | `books.repository` y `books.service`: listas `unassigned` y `assigned`, asignación de estante, validación de la etiqueta y de `status`, y validación del identificador (D-20). | HU-003 | T-28 | `feature/HU-003` | Pendiente |
| T-30 | Controlador y rutas: `GET /api/shelf-assignments` y `PUT /api/books/:id/shelf` con `requireAdmin`. Monta `/api/shelf-assignments` en `app.js`. | HU-003 | T-29 | `feature/shelf-assignment` | Pendiente |
| T-31 | Interfaz: botón «Asignar estantes», sección con las dos listas, menú de tres puntos, estados y `aria-live` (`shelves.js`). Pasa `admin/index.html` a cuatro secciones y añade los estilos de menú y de fila de lista. | HU-003 | T-30 | `feature/HU-003` | Pendiente |
| T-32 | Pruebas de asignación de estante (`tests/books/shelf.test.js`, PD-01 a PD-20), ejecutadas con `npm test`. | HU-003 | T-30 | `feature/HU-003` | Pendiente |
| **Bloque C. HU-004** | | | | | |
| T-33 | `books.repository` y `books.service`: lectura por identificador y edición (validación, duplicado excluyendo el propio libro, columnas normalizadas, `updated_at` según D-18). | HU-004 | T-29 | `feature/HU-004` | Pendiente |
| T-34 | Controlador y rutas: `GET /api/books/:id` y `PUT /api/books/:id` con `requireAdmin`. | HU-004 | T-33 | `feature/HU-004` | Pendiente |
| T-35 | Interfaz: botón «Editar» en la tarjeta del administrador (`admin/books.js`) y sección «Editar libro» (`book-edit.js`), con sus estados y mensajes. | HU-004, HU-006 | T-31, T-34 | `feature/HU-004` | Pendiente |
| T-36 | Pruebas de edición (`tests/books/edit.test.js`, PE-01 a PE-20), ejecutadas con `npm test`. | HU-004 | T-34 | `feature/HU-004` | Pendiente |
| **Bloque D. HU-005** | | | | | |
| T-37 | `books.repository` y `books.service`: eliminación en una sola sentencia y detección de libro inexistente. | HU-005 | T-29 | `feature/HU-005` | Pendiente |
| T-38 | Controlador y ruta `DELETE /api/books/:id` con `requireAdmin` (204 o 404). | HU-005 | T-37 | `feature/HU-005` | Pendiente |
| T-39 | Interfaz: botón de peligro, botón «Eliminar» en la tarjeta del administrador, diálogo de confirmación y mensajes (`book-delete.js`). | HU-005, HU-006 | T-35, T-38 | `feature/HU-005` | Pendiente |
| T-40 | Pruebas de eliminación (`tests/books/delete.test.js`, PF-01 a PF-11), ejecutadas con `npm test`. | HU-005 | T-38 | `feature/HU-005` | Pendiente |
| **Bloque E. Cierre** | | | | | |
| T-41 | Verificación manual completa del plan de SPEC-002 §10 (V-29 a V-63), con resultados registrados. | Todas | T-31, T-35, T-39 | `develop` | Pendiente |
| T-42 | Aplicar las actualizaciones documentales de SPEC-002 Anexo B: SPEC-000 §10 #2 y SPEC-001 (D-11, §7.2, §7.4 y §7.5). Registrar la fecha de cada una. | Todas | Aprobación de SPEC-002 | `docs/spec-002` | Pendiente |
| T-43 | Revisión de la Definition of Done, `npm test` final con toda la suite, commits convencionales en inglés y merge a `develop`. Completar este documento. | Todas | T-27, T-32, T-36, T-40, T-41, T-42 | `develop` | Pendiente |

## 5. Orden sugerido

1. T-27 y T-28 primero. Si T-27 falla o T-28 detecta una restricción faltante, se resuelve antes de seguir.
2. Bloque B (HU-003), completo antes de seguir. T-31 deja lista la estructura de cuatro secciones de la que dependen los bloques C y D.
3. Bloque C (HU-004).
4. Bloque D (HU-005).
5. Bloque E. T-42 puede hacerse en paralelo desde que SPEC-002 esté aprobada.

## 6. Decisiones y pendientes por confirmar antes de empezar

| ID | Pendiente | Bloquea |
|---|---|---|
| D-14 | Excepción del listado de la Administración (SPEC-000 §10 #2). Fecha y persona que la confirmó: [21/11/2026 - David]. | T-29, T-42 |
| D-22 | No hay migraciones en este sprint. Si T-28 detecta una restricción faltante, hay que decidir cómo aplicarla antes de continuar. | T-29 en adelante |
| D-28 | Menú de tres puntos con una única opción (volver a la lista sin estante: botón «Asignar estantes»). Confirmar con quien usa el sistema que no hace falta un acceso directo. | T-31 |

## 7. Riesgos y su desenlace

| Riesgo | Mitigación | Se materializó | Desenlace |
|---|---|---|---|
| Las pruebas del Sprint 1 fallan al ejecutarse por primera vez, porque nunca se ejecutaron. | T-27 va primero. Los fallos se corrigen antes de empezar HU-003. | | |
| Falta alguna restricción del esquema (`CHECK` de `shelf_label` o de `quantity`) y no existe ejecutor de migraciones. | T-28 verifica antes de HU-003. Si falta, se detiene el trabajo y se decide, sin improvisar un mecanismo. | | |
| Eliminación accidental de datos reales por ser un borrado físico e irreversible. | Confirmación en la interfaz. Todas las verificaciones se hacen sobre la base de **desarrollo**. | | |
| Dos cuentas de Administración editan el mismo libro a la vez (gana la última escritura, sin control de versiones). | Riesgo aceptado: no hay historial ni concurrencia en el alcance. Los casos de libro inexistente están cubiertos (404). | | |
| Las listas de asignación no tienen paginación y pueden ser largas si el catálogo crece. | Aceptado para el catálogo escolar (HU-003 deja fuera la paginación). Se revisa si el catálogo crece. | | |
| CA-009 y CA-010 de HU-006 siguen sin cerrarse del todo: «Ver información» (capacidad 7) no entra en este sprint. | Cierre parcial documentado (D-27). | | |

## 8. Criterio de cierre y resultado

### 8.1. Criterio

El Sprint 2 se da por cerrado cuando HU-003, HU-004 y HU-005 están **Terminadas**, la suite completa de pruebas (Sprint 1 y Sprint 2) se ejecutó con `npm test` y pasa, y se cumplió la Definition of Done aplicable de SPEC-000 §7. HU-006 CA-009 y CA-010 permanecen parcialmente verificadas, con la excepción documentada para la capacidad 7.

### 8.2. Resultado por historia

| HU | Estado final | Evidencia |
|---|---|---|
| HU-003 | | |
| HU-004 | | |
| HU-005 | | |
| HU-006 (CA-009 y CA-010, parcial) | | |

### 8.3. Pruebas automatizadas

- Comando: `npm test`
- Fecha, rama y commit:
- Resultado (total / pasan / fallan / omitidas):
- Ejecutó:
- Pruebas que no se ejecutaron o fallan:

### 8.4. Pruebas del Sprint 1 (deuda técnica, T-27)

- Fecha, rama y commit:
- Resultado (PN, PA, PB y PC):
- Ejecutó:
- Correcciones realizadas:

### 8.5. Verificación manual (SPEC-002 §10)

| Paso | Resultado | Ejecutó | Fecha | Observación |
|---|---|---|---|---|
| V-29 a V-38 (HU-003) | | | | |
| V-39 a V-48 (HU-004) | | | | |
| V-49 a V-54 (HU-005) | | | | |
| V-55 a V-58 (perfiles y acceso) | | | | |
| V-59 a V-63 (interfaz) | | | | |

### 8.6. Definition of Done (SPEC-000 §7)

| Apartado | Cumple | Observación |
|---|---|---|
| §7.1 Código | | |
| §7.2 Calidad | | |
| §7.3 Seguridad | | |
| §7.4 Base de datos | | |
| §7.5 Interfaz | | |
| §7.6 Documentación y Git | | |

### 8.7. Excepción declarada

HU-006 CA-009 y CA-010: parcialmente verificadas (D-27). «Editar» y «Eliminar» se completan en este sprint. Pendiente de cierre: «Ver información» (capacidad 7).

### 8.8. Actualizaciones documentales (T-42)

| Documento | Cambio | Fecha | Aplicado por |
|---|---|---|---|
| SPEC-000 | §10 #2 | | |
| SPEC-001 | D-11, §7.2, §7.4 y §7.5 | | |

### 8.9. Pendiente para el Sprint 3