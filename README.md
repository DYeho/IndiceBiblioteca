# Índice Biblioteca

Catálogo digital para una biblioteca estudiantil. La Administración registra y
mantiene los libros; los estudiantes los buscan y ven en qué estante están, sin
necesidad de cuenta.

> **Estado:** en desarrollo. Ya funciona el inicio de sesión de la
> Administración (HU-001); el catálogo de libros todavía no está implementado.

## Para quién es

| Quién | Qué puede hacer |
|-------|-----------------|
| **Administración** (con inicio de sesión) | Registrar, organizar por estante, editar y eliminar libros. También puede buscar y consultar. |
| **Estudiantes** (sin cuenta) | Buscar libros por nombre o autor y ver su detalle. |

## Alcance

**Incluido en el MVP**

1. Iniciar sesión (varias cuentas de Administración).
2. Registrar libros con categoría obligatoria (cantidad mínima 1); la Administración puede agregar categorías nuevas desde el formulario.
3. Organizar los libros por etiqueta de estante.
4. Editar libros, incluida la cantidad (puede llegar a 0).
5. Eliminar libros.
6. Buscar por nombre o autor. Cada resultado muestra título, autor, categoría, estante y
   la marca "agotado" si corresponde.
7. Ver el detalle del libro: estante, cantidad y estado "agotado".

Un título con cantidad 0 se muestra como **agotado** y sigue en el catálogo
hasta que la Administración lo elimine.

**Para después**

- Digitalizar descripción, sinopsis e índice escaneando las páginas.
- Filtrar la lista de libros, manualmente o con inteligencia artificial.
- Editar y eliminar categorías.

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

Requisitos: Node.js 22 o superior.

1. Instalar dependencias:

   ```sh
   npm install
   ```

2. Copiar `.env.example` a `.env` y completar `SESSION_SECRET` con un texto
   aleatorio de al menos 32 caracteres. Por ejemplo:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Inicializar la base de datos (también aplica la migración de categorías si ya hay libros):

   ```sh
   npm run db:init
   ```

4. Crear al menos una cuenta de Administración (ver la sección siguiente).

5. Iniciar el servidor:

   ```sh
   npm start        # o "npm run dev" para reiniciar al guardar cambios
   ```

   La aplicación queda en `http://localhost:3000` y el inicio de sesión en
   `http://localhost:3000/login.html`.

### Crear una cuenta de Administración

La aplicación no permite registrar cuentas. Se crean manualmente en el servidor
con este comando:

```sh
npm run create-admin -- <nombre-de-usuario>
```

El comando pide la contraseña dos veces sin mostrarla en pantalla y guarda solo
su hash. Reglas:

- Nombre de usuario: de 3 a 50 caracteres. Se guarda en minúsculas y sin
  espacios al inicio ni al final.
- Contraseña: de 8 a 72 caracteres.
- No puede haber dos cuentas con el mismo nombre de usuario.

Todas las cuentas tienen los mismos permisos. La base de datos se crea en la
ruta indicada en `DATABASE_PATH` (por defecto `data/library.sqlite`).

## Documentación

- `docs/specs/SPEC-000-foundation.md`: base técnica, convenciones y criterios de calidad.
- `docs/stories/`: historias de usuario del MVP.
- `docs/user-history/HU-010-CategoriaLibro.md`: categorías iniciales y alta de categorías nuevas.