# Arquitectura de Firebase para MyQwiz

## Identidad

- `users/{uid}` guarda información privada y el contador de quizzes propios.
- `profiles/{uid}` guarda el perfil visible: nombre, nombre normalizado, tag y `avatarId`.
- `userTags/{tag}` reserva un tag globalmente único y apunta al perfil. El nombre puede repetirse; el tag no.
- `avatarId` es un entero del 1 al 15. Las imágenes permanecen dentro de la aplicación.
- Google y correo/contraseña se enlazan al mismo `uid`, de modo que ambos accesos abren los mismos datos.
- Sin Blaze, el acceso alternativo usa correo y contraseña. El nombre con tag es la identidad pública para encontrar y agregar amigos, no una credencial de acceso.
- `users/{uid}.entryChallenge` guarda de forma privada la pregunta de entrada elegida, la respuesta normalizada y tres distractores fijos. Este reto es parte de la experiencia y no se presenta como segundo factor de seguridad.

El acceso literal mediante `usuario#TAG + contraseña` queda descartado porque necesitaría una función de servidor para resolver el correo privado sin publicarlo en Firestore. No se crea ninguna colección pública que relacione nombres de usuario con correos.

## Quizzes

- `quizzes/{quizId}` contiene solo el resumen necesario para la biblioteca.
- `quizzes/{quizId}/content/current` contiene las preguntas y se consulta al abrir o jugar.
- `quizProgress/{uid_quizId}` contiene la nota y los intentos de cada jugador por separado.
- `quizShares/{quizId_recipientId}` concede acceso de lectura al quiz original.

El contenido se carga una sola vez al iniciar una partida. No se usan listeners en tiempo real, por lo que una edición del propietario nunca interrumpe un intento que ya comenzó.

## Límites

- Máximo 100 preguntas por quiz.
- Máximo 30 quizzes activos cuyo propietario sea el usuario.
- Los quizzes compartidos recibidos no incrementan el contador.
- Crear o eliminar un quiz y actualizar `ownedQuizCount` debe hacerse en una sola transacción.
- Firestore limita cada documento a 1 MiB; las imágenes de preguntas seguirán siendo URLs y no datos binarios.

## Amigos y acceso

- `friendRequests/{requestId}` almacena solicitudes pendientes.
- `friendships/{friendshipId}` almacena los dos `uid` de una amistad aceptada.
- Solo se permite compartir con una amistad existente.
- El receptor puede leer y jugar el quiz compartido, pero no modificarlo.
- Para editarlo, el receptor crea un quiz propio nuevo y pasa a contar dentro de su límite de 30.

## Configuración del proyecto

1. Firestore usa la región `us-central1`.
2. Activar Google y correo/contraseña en Firebase Authentication.
3. El proyecto permanece en el nivel gratuito y no usa Cloud Functions.
4. Activar protección contra enumeración de correos y configurar cuotas de autenticación.
