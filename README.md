# LEGÍTIMAS Mailer

Aplicación de Node.js y TypeScript para enviar invitaciones personalizadas por correo electrónico a los participantes de LEGÍTIMAS.

Cada invitación incluye:

- Nombre y apellido del participante.
- Afiche del evento insertado dentro del correo.
- Código QR individual generado a partir del `uuid`.
- Enlace para descargar la entrada:
  `https://www.entrenos.site/entrada/{uuid}`.

## Requisitos

- Node.js 20 o superior.
- Una cuenta SMTP habilitada para enviar correos.
- Un archivo CSV con los participantes.
- El archivo `public/legitimas-afiche.png`.

## Instalación

Instala las dependencias del proyecto:

```bash
npm install
```

## Configuración

1. Crea o edita el archivo `.env` en la raíz del proyecto.
2. Configura las variables SMTP:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=usuario-smtp
SMTP_PASS=contraseña-smtp
EMAIL_FROM="ENTRE-NOS <no-reply@entrenos.site>"
EMAIL_REPLY_TO=respuesta@entrenos.site
```

`EMAIL_REPLY_TO` es opcional. Si no se configura, no se agrega una dirección de respuesta al mensaje.

### Modo de prueba

Para probar el envío sin enviar los correos a sus destinatarios reales:

```env
TEST_MODE=true
TEST_EMAIL=correo-de-prueba@example.com
```

En este modo:

- Todos los datos se leen desde el CSV, pero el correo se envía a `TEST_EMAIL`.
- Solo se procesa el primer participante válido.
- El UUID no se registra como enviado.

Para enviar a los destinatarios reales:

```env
TEST_MODE=false
```

No es necesario definir `TEST_EMAIL` en producción, aunque puede permanecer en el archivo `.env`.

> No compartas el archivo `.env` ni subas sus credenciales al repositorio. Ya está incluido en `.gitignore`.

## Archivo CSV

El programa espera estas columnas:

```csv
nombre,apellido,email,edad,genero,uuid,presente
Juan,Pérez,juan@example.com,26,masculino,ad336901-cdfa-4fe2-bd92-aa0078422cda,FALSE
```

Las columnas `nombre`, `apellido`, `email` y `uuid` son obligatorias para enviar una invitación. `edad`, `genero` y `presente` se conservan en el CSV, pero no se utilizan para construir el correo.

Actualmente el script lee el archivo:

```text
data/test.csv
```

Para enviar otra lista, reemplaza el contenido de `data/test.csv` o modifica la constante `CSV_PATH` en `src/send-emails.ts`.

## Ejecución

### Verificar tipos

```bash
npm run typecheck
```

### Ejecutar una prueba

Configura `TEST_MODE=true` y `TEST_EMAIL` en `.env`, y luego ejecuta:

```bash
npm test
```

También puedes usar:

```bash
npm run send
```

Ambos comandos ejecutan `src/send-emails.ts`.

### Enviar invitaciones reales

1. Revisa el CSV.
2. Confirma que `TEST_MODE=false`.
3. Verifica que las credenciales SMTP sean correctas.
4. Ejecuta:

```bash
npm run send
```

Antes de enviar, el programa verifica la conexión SMTP y la existencia del CSV y del afiche.

## Flujo de envío

Para cada participante, el programa:

1. Lee y valida los datos del CSV.
2. Omite registros incompletos o con un correo inválido.
3. Omite UUID que ya estén registrados como enviados.
4. Genera un código QR PNG con el UUID.
5. Construye el HTML personalizado.
6. Agrega el afiche y el QR como imágenes embebidas en el correo.
7. Incluye el enlace `https://www.entrenos.site/entrada/{uuid}`.
8. Envía el correo mediante SMTP.
9. En producción, registra el UUID enviado.
10. Espera un segundo antes de procesar al siguiente participante.

El UUID se utiliza tanto en el código QR como en el enlace de descarga.

## Archivos importantes

```text
src/
  email-template.ts   Plantilla HTML de la invitación.
  generate-qr.ts      Generación del código QR.
  send-emails.ts      Lectura del CSV y envío mediante SMTP.

data/
  test.csv            CSV utilizado actualmente por el script.
  example.csv         Ejemplo de estructura del CSV.
  enviados.json       Registro generado de UUID enviados.

public/
  legitimas-afiche.png
```

## Registro de envíos

En modo producción se crea o actualiza `data/enviados.json`. El archivo contiene los UUID de las invitaciones aceptadas por el servidor SMTP. Si un UUID ya aparece allí, el participante se omite para evitar reenvíos accidentales.

En modo de prueba no se modifica este archivo.

## Resultado en consola

Al finalizar, se muestra un resumen con:

- Correos aceptados por SMTP.
- Participantes omitidos.
- Envíos fallidos.

Los errores individuales se informan en consola y el proceso continúa con el siguiente participante.

## Estructura del correo

El correo se genera en español con:

- Saludo personalizado.
- Afiche de LEGÍTIMAS.
- QR personal.
- Botón de descarga de la entrada.
- Aviso para no compartir el código QR.

Los nombres y apellidos se escapan para evitar que caracteres especiales interfieran con el HTML. El UUID se codifica al construir el enlace.
