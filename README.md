# Índice Biblioteca

Catálogo digital para una biblioteca estudiantil. La Administración registra y
mantiene los libros; los estudiantes los buscan y ven en qué estante están, sin
necesidad de cuenta.

> **Estado:** en fundación. Por ahora solo existe la documentación; todavía no
> hay aplicación ejecutable.

## Para quién es

| Quién | Qué puede hacer |
|-------|-----------------|
| **Administración** (con inicio de sesión) | Registrar, organizar por estante, editar y eliminar libros. También puede buscar y consultar. |
| **Estudiantes** (sin cuenta) | Buscar libros por nombre o autor y ver su detalle. |

## Alcance

**Incluido en el MVP**

1. Iniciar sesión (varias cuentas de Administración).
2. Registrar libros, con cantidad obligatoria (mínimo 1).
3. Organizar los libros por etiqueta de estante.
4. Editar libros, incluida la cantidad (puede llegar a 0).
5. Eliminar libros.
6. Buscar por nombre o autor. Cada resultado muestra título, autor, estante y
   la marca "agotado" si corresponde.
7. Ver el detalle del libro: estante, cantidad y estado "agotado".

Un título con cantidad 0 se muestra como **agotado** y sigue en el catálogo
hasta que la Administración lo elimine.

**Para después**

- Digitalizar descripción, sinopsis e índice escaneando las páginas.
- Filtrar la lista de libros, manualmente o con inteligencia artificial.

**Fuera del alcance**

- Crear, editar o eliminar cuentas de Administración.
- Recuperar o cambiar contraseñas.
- Cuentas para estudiantes.
- Pruebas automatizadas, integración continua y despliegue.

## Tecnología

- **Pantallas:** HTML, CSS y JavaScript, sin frameworks.
- **Servidor:** Node.js.
- **Datos:** base de datos relacional con SQLite.

## Cómo ejecutarlo

Aún no hay nada que ejecutar. Las instrucciones se agregarán cuando existan los
archivos base y el servidor.

## Documentación

- `docs/specs/SPEC-000-foundation.md`: base técnica, convenciones y criterios de calidad.
- `docs/stories/`: historias de usuario del MVP.