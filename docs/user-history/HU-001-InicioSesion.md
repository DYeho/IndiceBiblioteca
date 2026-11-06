# HU-001-Inicio de sesión

## Historia de usuario
Como administrador de biblioteca, quiero iniciar sesión en el sistema, para que me reconozca como administrador y me permita acceder a las capacidades especializadas para administradores.

## Criterio de aceptación

### CA-001-Inicio de sesión exitoso
**Dado** que existe una cuenta de Administración,
**cuando** el administrador ingresa su nombre de usuario y contraseña correctos en la página de inicio de sesión,
**entonces** el sistema lo reconoce como administrador, crea una sesión y lo lleva al área de administración.

### CA-002-Credenciales incorrectas
**Dado** que el usuario está en la página de inicio de sesión,
**cuando** ingresa un nombre de usuario inexistente o una contraseña incorrecta,
**entonces** el sistema no crea sesión, permanece en la página de inicio de sesión y muestra un mensaje de error que no indica cuál de los dos datos falló.

### CA-003-Campos obligatorios vacíos
**Dado** que el usuario está en la página de inicio de sesión,
**cuando** intenta enviar el formulario con el nombre de usuario o la contraseña vacíos,
**entonces** el sistema no procesa el inicio de sesión e indica qué campo es obligatorio.

### CA-004-Acceso al área de administración sin sesión
**Dado** que el usuario no ha iniciado sesión o su sesión no es válida,
**cuando** intenta abrir el área de administración o ejecutar una operación de modificación del catálogo,
**entonces** el sistema niega el acceso. Si es una página, lo lleva a la página de inicio de sesión. Si es una solicitud a la API, responde que se requiere autenticación.

### CA-005-Consulta pública sin sesión
**Dado** que un estudiante no tiene cuenta ni sesión,
**cuando** usa las funciones de consulta del catálogo,
**entonces** el sistema no le exige iniciar sesión.

### CA-006-Continuidad y vencimiento de la sesión
**Dado** que el administrador inició sesión,
**cuando** recarga la página o navega por el área de administración mientras su sesión es válida,
**entonces** el sistema sigue reconociéndolo como administrador sin pedirle sus credenciales otra vez.
**Y cuando** la sesión vence o deja de ser válida,
**entonces** el sistema vuelve a exigirle iniciar sesión.

## Reglas del Negocio
RN-001: Solo existen cuentas de Administración. Se crean mediante un procedimiento técnico manual, fuera de la aplicación. La aplicación no permite registrar cuentas.
RN-002: Puede haber varias cuentas de Administración y todas tienen los mismos permisos.
RN-003: Las contraseñas se almacenan únicamente como hash (bcryptjs). Nunca se guardan, registran ni devuelven en texto plano.
RN-004: La autenticación usa sesiones con cookies, no JWT. La cookie es `HttpOnly`, `Secure` en producción y con una política `SameSite` adecuada.
RN-005: Ante credenciales incorrectas, el mensaje de error es siempre el mismo, sin revelar si el usuario existe o si falló la contraseña.
RN-006: Los datos del formulario se validan en el backend. El control de acceso se aplica en el backend y no depende de ocultar elementos en la interfaz.
RN-007: Las solicitudes de inicio de sesión están sujetas a limitación de solicitudes (express-rate-limit). El umbral se define en la implementación.

## Dependencias
* SPEC-000-foundation v2.0 (stack, estructura, seguridad y convenciones).
* Esta historia no depende de otras historias de usuario. Las demás historias de administración (registrar, editar y eliminar libros) dependen de esta.
* Debe existir al menos una cuenta de Administración creada manualmente en la base de datos. El procedimiento para crearla no está definido todavía.
* Tablas en SQLite para las cuentas de Administración y para las sesiones.

## Fuera de Alcance
* Registro de cuentas de Administración desde la interfaz.
* Cierre de sesión (pendiente de decisión).
* Recuperación o cambio de contraseña.
* Gestión de cuentas (crear, desactivar o eliminar cuentas) y roles o permisos diferenciados.
* Autenticación de dos factores, autenticación externa y la opción "recordarme".
* Inicio de sesión para estudiantes.