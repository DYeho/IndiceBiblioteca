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
| HU-003 | Organizar libros por estante | Terminada | Backend, pruebas y codigo de la interfaz terminados; npm test pasa (84 de 84). |
| HU-004 | Editar libros registrados | Terminada | Se implementó la edición y se incorporaron la interfaz y las pruebas. |
| HU-005 | Eliminar libro | Terminada | Backend, interfaz y pruebas PF-01 a PF-11 terminados; `npm test` pasa (117 de 117). |
| HU-006 | Búsqueda de libros por nombre o autor | Terminada (Sprint 1) | CA-010 se completa en parte: «Editar» y «Eliminar». CA-009 y CA-010 siguen parcialmente verificados hasta que exista «Ver información» (capacidad 7, D-27). |

**Deuda técnica del Sprint 1 incluida en este sprint:** ejecución de las pruebas automatizadas PN, PA, PB y PC, que existen pero no se ejecutaron (T-27).

**Fuera del sprint:** HU-007 (capacidad 7), HU-008, HU-009, quitar el estante de un libro, operaciones en lote, historial y auditoría, y un mecanismo de ejecución de migraciones.

## 4. Tareas técnicas

| ID | Tarea | HU | Depende de | Rama | Estado |
|---|---|---|---|---|---|
| **Bloque A. Verificación previa** | | | | | |
| T-27 | Ejecutar con `npm test` la suite completa del Sprint 1 (PN, PA, PB y PC) y registrar el resultado real en SPRINT-001-backlog §8.3. Si hay fallos, corregirlos antes de seguir. | Deuda Sprint 1 | | `develop` (solo ejecución); `feature/SPRINT-001` si hay correcciones | Terminada |
| T-28 | Verificar en `schema.sql` las restricciones `quantity` de 0 a 999, `shelf_label` de 1 a 30 (nulo permitido) y `UNIQUE` de título y autor normalizados. Si falta alguna, detener HU-003 y decidir cómo aplicarla (no hay ejecutor de migraciones). | HU-003, HU-004 | T-27 | `feature/HU-003` | Terminada |
| **Bloque B. HU-003** | | | | | |
| T-29 | `books.repository` y `books.service`: listas `unassigned` y `assigned`, asignación de estante, validación de la etiqueta y de `status`, y validación del identificador (D-20). | HU-003 | T-28 | `feature/HU-003` | Terminada |
| T-30 | Controlador y rutas: `GET /api/shelf-assignments` y `PUT /api/books/:id/shelf` con `requireAdmin`. Monta `/api/shelf-assignments` en `app.js`. | HU-003 | T-29 | `feature/shelf-assignment` | Terminada |
| T-31 | Interfaz: botón «Asignar estantes», sección con las dos listas, menú de tres puntos, estados y `aria-live` (`shelves.js`). Pasa `admin/index.html` a cuatro secciones y añade los estilos de menú y de fila de lista. | HU-003 | T-30 | `feature/HU-003` | Terminada |
| T-32 | Pruebas de asignación de estante (`tests/books/shelf.test.js`, PD-01 a PD-20), ejecutadas con `npm test`. | HU-003 | T-30 | `feature/HU-003` | Terminada |
| **Bloque C. HU-004** | | | | | |
| T-33 | `books.repository` y `books.service`: lectura por identificador y edición (validación, duplicado excluyendo el propio libro, columnas normalizadas, `updated_at` según D-18). | HU-004 | T-29 | `feature/HU-004` | Terminada |
| T-34 | Controlador y rutas: `GET /api/books/:id` y `PUT /api/books/:id` con `requireAdmin`. | HU-004 | T-33 | `feature/HU-004` | Terminada |
| T-35 | Interfaz: botón «Editar» en la tarjeta del administrador (`admin/books.js`) y sección «Editar libro» (`book-edit.js`), con sus estados y mensajes. | HU-004, HU-006 | T-31, T-34 | `feature/HU-004` | Terminada |
| T-36 | Pruebas de edición (`tests/books/edit.test.js`, PE-01 a PE-20), ejecutadas con `npm test`. | HU-004 | T-34 | `feature/HU-004` | Terminada |
| **Bloque D. HU-005** | | | | | |
| T-37 | `books.repository` y `books.service`: eliminación en una sola sentencia y detección de libro inexistente. | HU-005 | T-29 | `feature/HU-005` | Terminada |
| T-38 | Controlador y ruta `DELETE /api/books/:id` con `requireAdmin` (204 o 404). | HU-005 | T-37 | `feature/HU-005` | Terminada |
| T-39 | Interfaz: botón de peligro, botón «Eliminar» en la tarjeta del administrador, diálogo de confirmación y mensajes (`book-delete.js`). | HU-005, HU-006 | T-35, T-38 | `feature/HU-005` | Terminada |
| T-40 | Pruebas de eliminación (`tests/books/delete.test.js`, PF-01 a PF-11), ejecutadas con `npm test`. | HU-005 | T-38 | `feature/HU-005` | Terminada |
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
| Las pruebas del Sprint 1 fallan al ejecutarse por primera vez, porque nunca se ejecutaron. | T-27 va primero. Los fallos se corrigen antes de empezar HU-003. | Si | Una prueba de books-integration.test.js fallo en Windows porque la carpeta temporal se borraba con el servidor hijo todavia abierto, y cancelo su archivo. Se corrigio antes de empezar HU-003. Resultado 62 de 62. |
| Falta alguna restricción del esquema (`CHECK` de `shelf_label` o de `quantity`) y no existe ejecutor de migraciones. | T-28 verifica antes de HU-003. Si falta, se detiene el trabajo y se decide, sin improvisar un mecanismo. | No | T-28 verifico en schema.sql y con PB-12 las restricciones quantity de 0 a 999, shelf_label de 1 a 30 con nulo permitido y UNIQUE de titulo y autor autorizados. |
| Eliminación accidental de datos reales por ser un borrado físico e irreversible. | Confirmación en la interfaz. Todas las verificaciones se hacen sobre la base de **desarrollo**. | No | El diálogo de confirmación pide confirmar con título, autor y cantidad, y Cancelar/Escape no envían nada (V-50). Todas las verificaciones de HU-005 se hicieron sobre la base de desarrollo. |
| Dos cuentas de Administración editan el mismo libro a la vez (gana la última escritura, sin control de versiones). | Riesgo aceptado: no hay historial ni concurrencia en el alcance. Los casos de libro inexistente están cubiertos (404). | | |
| Las listas de asignación no tienen paginación y pueden ser largas si el catálogo crece. | Aceptado para el catálogo escolar (HU-003 deja fuera la paginación). Se revisa si el catálogo crece. | | |
| CA-009 y CA-010 de HU-006 siguen sin cerrarse del todo: «Ver información» (capacidad 7) no entra en este sprint. | Cierre parcial documentado (D-27). | | |

## 8. Criterio de cierre y resultado

### 8.1. Criterio

El Sprint 2 se da por cerrado cuando HU-003, HU-004 y HU-005 están **Terminadas**, la suite completa de pruebas (Sprint 1 y Sprint 2) se ejecutó con `npm test` y pasa, y se cumplió la Definition of Done aplicable de SPEC-000 §7. HU-006 CA-009 y CA-010 permanecen parcialmente verificadas, con la excepción documentada para la capacidad 7.

### 8.2. Resultado por historia

| HU | Estado final | Evidencia |
|---|---|---|
| HU-003 | Terminado | PD-01 a PD-20 y dos pruebas de refuerzo en tests/books/shelf.test.js, ejecutadas con npm test (84 de 84). |
| HU-004 | Terminado | Se aprobaron PE-01 a PE-20 y dos pruebas adicionales de edición en `tests/books/edit.test.js`. |
| HU-005 | Terminado | PF-01 a PF-11 en `tests/books/delete.test.js`, ejecutadas con `npm test` (117 de 117). Verificación manual V-49 a V-54 en §8.5. |
| HU-006 (CA-009 y CA-010, parcial) | Parcial (excepción D-27) | «Editar» y «Eliminar» completos: V-55 y V-56 aprobadas (§8.5). Falta «Ver información» (capacidad 7). |

### 8.3. Pruebas automatizadas

- Comando: `npm test`
- Fecha, rama y commit: 25/11/2026, `feature/HU-005`, `2747d2e`.
- Resultado (total / pasan / fallan / omitidas): 117 / 117 / 0 / 0.
- Ejecutó: Leonardo Emilio García Balderas.
- Pruebas que no se ejecutaron o fallan: ninguna en la suite ejecutada.

**Ejecución final del Bloque E (T-43):**

- Fecha, rama y commit: 25/11/2026, `feature/SPRINT-002`, `6e2b873` (incluye HU-003, HU-004 y HU-005 integradas).
- Resultado (total / pasan / fallan / omitidas): 117 / 117 / 0 / 0. Duración: 32.5 s.
- Ejecutó: Emilio (EMILIO), con `npm test` en Windows 11 y Node.js 24.13.0.
- Pruebas que no se ejecutaron o fallan: ninguna. Siguen sin existir las pruebas PA-01 a PA-22 de autenticación (§8.4).

### 8.4. Pruebas del Sprint 1 (deuda técnica, T-27)

- Fecha, rama y commit: 21/11/2026, feature/HU-003, resultado de `git rev-parse --short HEAD`
- Resultado (PN, PA, PB y PC): 
    - Primera ejecución (`npm test`): 63 pruebas, 61 pasan, 1 falla, 1 cancelada. Duración: 663.9 s.
    - Segunda ejecución (`npm test -- --test-timeout=60000`), tras la corrección: 62 pruebas, 62 pasan, 0 fallan, 0 canceladas, 0 omitidas. Duración: 29.4 s.
    - PN-01 a PN-06 (`normalize-text.test.js`): pasan.
    - PB-01 a PB-16 (`books-integration.test.js`): pasan.
    - PC: `search.test.js` tiene 4 pruebas de búsqueda que pasan. No están numeradas PC-01 a PC-15; no se verificó la correspondencia caso por caso.
    - PA: no se ejecutaron. No existe `tests/auth/` ni pruebas PA-01 a PA-22 en el repositorio.
    Algunos comportamientos de acceso están cubiertos de forma parcial por tres pruebas de
    `books-integration.test.js`.
- Ejecutó: Nestor Isaac Hernandez Duran
- Correcciones realizadas: en `tests/books/books-integration.test.js`, la última prueba arrancaba un servidor hijo que seguía abierto cuando `app.close()` borraba la carpeta temporal. En Windows eso daba `EBUSY` sobre `library.sqlite-shm`. Se detiene ahora el servidor dentro de la propia prueba, con `try/finally`, antes de la limpieza. No hubo cambios en código de la aplicación.

### 8.5. Verificación manual (SPEC-002 §10)

| Paso | Resultado | Ejecutó | Fecha | Observación |
|---|---|---|---|---|
| V-29 a V-38 (HU-003) | 9 aprobadas, 1 parcial | Emilio (EMILIO) | 25/11/2026 | Verificación automatizada en Chrome. Aprobadas: V-29 a V-37. V-32: vacía y solo espacios muestran «El estante es obligatorio.»; el campo tiene `maxlength` 30 y no deja escribir 31 caracteres, así que se comprobó también la API, que responde 400 «El estante no puede superar 30 caracteres.». En los tres casos el libro sigue en la lista. V-33 y la eliminación de V-46 se hicieron con una segunda sesión de Administración. V-36: estantes conservados tras detener y reiniciar el servidor. **V-38 (parcial):** la búsqueda pública distingue los dos casos, pero el texto es «Estante A-2» y «Sin estante asignado», no «Estante: …» y «Estante no asignado» como dice SPEC-002 §10.2. |
| V-39 a V-48 (HU-004) | 10 aprobadas, 0 pendientes | Mario Díaz Ramos; V-40 y V-46 completadas por Emilio (EMILIO) | 24/11/2026; 25/11/2026 | Se aprobaron V-39, V-41 a V-45, V-47 y V-48 (24/11/2026). V-40: se verificó el guardado y la persistencia tras recargar y volver a buscar el libro; el 25/11/2026, Emilio (EMILIO) completó, con verificación automatizada en Chrome, la persistencia tras reiniciar el servidor (cantidad 7 y descripción conservadas). V-46: aprobada el 25/11/2026: tras eliminar el libro desde otra sesión, guardar muestra «El libro no existe.» y vuelve a «Buscar libros» repitiendo la búsqueda. |
| V-49 a V-54 (HU-005) | 6 aprobadas, 0 pendientes | Leonardo Emilio García Balderas | 25/11/2026 | Aprobadas: V-49, V-50, V-51, V-52, V-53 y V-54. Pendientes: ninguna. |
| V-55 a V-58 (perfiles y acceso) | 4 aprobadas, 0 pendientes | Leonardo Emilio García Balderas; repetidas por Emilio (EMILIO) | 25/11/2026 | Ejecutadas y aprobadas en el contexto de HU-005 por Leonardo Emilio García Balderas. Repetidas por Emilio (EMILIO) con todo el sprint integrado, con verificación automatizada en Chrome. V-55: la página pública, con y sin sesión, no muestra «Editar» ni «Eliminar». V-56: cada tarjeta del administrador tiene «Editar «título»» y «Eliminar «título»», sin «Ver información». V-57: sin sesión, `PUT /api/books/:id`, `PUT /api/books/:id/shelf`, `DELETE /api/books/:id` y `POST /api/books` responden 401 y no cambia nada. V-58: tras cerrar sesión en otra pestaña, «Asignar estantes» redirige a `login.html`. |
| V-59 a V-63 (interfaz) | 5 aprobadas, 0 pendientes | Leonardo Emilio García Balderas; repetidas por Emilio (EMILIO) | 25/11/2026 | Ejecutadas y aprobadas en el contexto de HU-005 por Leonardo Emilio García Balderas. Repetidas por Emilio (EMILIO) con todo el sprint integrado, con verificación automatizada en Chrome. V-59: las cuatro secciones y el diálogo, a 320 y 1280 px, sin desplazamiento horizontal. V-60: menú «⋮», formularios de estante y edición, y diálogo usables solo con teclado, con foco visible; el diálogo empieza en «Cancelar», el contenido de detrás queda inerte y Escape cierra devolviendo el foco a «Eliminar». V-61: los mensajes de éxito y error llegan a regiones `aria-live`; no se probó con un lector de pantalla real. V-62: contraste mínimo 4.67:1 (botones de peligro, cerca del límite); «Editar» 13.98:1, texto secundario 5.71:1, botón primario 7.77:1. Los botones de peligro dicen «Eliminar» y «Eliminar libro». V-63: ningún error de CSP en login, página pública y administración. |

### 8.6. Definition of Done (SPEC-000 §7)

| Apartado | Cumple | Observación |
|---|---|---|
| §7.1 Código | Sí | Revisión de código (SPEC-002 §9.4): sin atributos `style`, manejadores `on…`, `<script>` ni `<style>` con contenido, sin `innerHTML`. Los módulos usan `shared/api.js` y no llaman a `fetch` directamente. Sin credenciales en el repositorio (`.env` y bases SQLite ignorados). |
| §7.2 Calidad | Sí, con observación | `npm test`: 117 de 117 en `feature/SPRINT-002` (§8.3). Pasos V-29 a V-63 ejecutados, con V-38 parcial por el texto (§8.5). Observación: `scripts/seed-dev.js` importa `loadConfig`, que no existe en `src/config/env.js`, y falla al ejecutarse. No forma parte del plan de verificación. |
| §7.3 Seguridad | Sí | Todas las rutas de estante, edición y eliminación usan `requireAdmin` (V-37 y V-57: 401 sin sesión). Origen y tipo de contenido verificados en las rutas que modifican (PD-18). HU-005: DELETE con requireAdmin, consulta parametrizada, id validado como entero positivo, salida con textContent. |
| §7.4 Base de datos | Sí | Sin cambios de esquema (D-22). Restricciones verificadas (T-28, PD-19). Persistencia verificada en pruebas (PD-07, PE-04, PF-04) y tras reiniciar el servidor (V-36, V-40, V-51). |
| §7.5 Interfaz | Sí | Plantilla y tokens comunes. Revisada a 320 px y en escritorio (V-59), con teclado y foco visible (V-60), contraste (V-62). Textos en español. |
| §7.6 Documentación y Git | Parcial | Ramas `feature/HU-00X` integradas en `feature/SPRINT-002`. Hay commits que no siguen la convención de SPEC-000 §6 ni están en inglés (por ejemplo `5c399bb` «test de prueba», `6cd51fc`, `33cfae0`, `14bf296`, `14892ff`, `c8ecaf2`). T-42 (actualizaciones documentales) sigue pendiente. SPEC-002 §10.1 indica `npm run admin:create`, pero el script se llama `npm run create-admin`. |

### 8.7. Excepción declarada

HU-006 CA-009 y CA-010: parcialmente verificadas (D-27). «Editar» (HU-004) y «Eliminar» (HU-005) completos en este sprint; pendiente de cierre: «Ver información» (capacidad 7).

### 8.8. Actualizaciones documentales (T-42)

| Documento | Cambio | Fecha | Aplicado por |
|---|---|---|---|
| SPEC-000 | §10 #2 | | |
| SPEC-001 | D-11, §7.2, §7.4 y §7.5 | | |

### 8.9. Pendiente para el Sprint 3

- V-38: alinear el texto del estante en la búsqueda pública con SPEC-002 («Estante: …» y «Estante no asignado»), o actualizar la SPEC con el texto actual.
- La zona global de mensajes (`#mensajes`) conserva el último mensaje al cambiar de sección; por ejemplo, «El libro no existe.» sigue visible al abrir «Asignar estantes».
- Corregir `scripts/seed-dev.js` (importa `loadConfig`, que no existe).
- Corregir en SPEC-002 §10.1 el nombre del script: `npm run create-admin`, no `npm run admin:create`.
- Crear las pruebas de autenticación PA-01 a PA-22 (deuda de §8.4).
- T-42: aplicar las actualizaciones documentales de SPEC-002 Anexo B.
- HU-006 CA-009 y CA-010: «Ver información» (capacidad 7).