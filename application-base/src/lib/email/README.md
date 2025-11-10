# Servicio de Email

Este directorio contiene la lógica para el envío de correos electrónicos transaccionales de la aplicación.

## Arquitectura

El servicio está diseñado para ser "pluggable", lo que significa que se puede cambiar fácilmente el proveedor de correo (Gmail, SendGrid, Resend, etc.) sin modificar el código de la aplicación.

-   **`email-service.ts`**: Define la interfaz `IEmailService` y contiene las implementaciones concretas (ej. `GmailService`, `ConsoleEmailService`).
-   **`index.ts`**: Exporta una función `sendEmail` que utiliza el servicio activo. La aplicación siempre debe usar esta función.
-   **`templates/`**: Contiene los componentes de React para las plantillas de los correos.

## Orden de Prioridad de los Servicios

El sistema seleccionará el servicio de correo a utilizar según las variables de entorno que encuentre, en el siguiente orden de prioridad:

1.  **Servicio SMTP Genérico:** Si se definen `SMTP_HOST`, `SMTP_USER` y `SMTP_PASS`.
2.  **Servicio de Gmail:** Si no hay configuración SMTP, pero se definen `GMAIL_USER` y `GMAIL_APP_PASSWORD`.
3.  **Servicio de Consola:** Si no se define ninguna de las configuraciones anteriores (los correos se imprimirán en la consola).

---

## Configuración del Servicio SMTP Genérico

Este es el método recomendado si tienes acceso a cualquier proveedor de correo que te dé credenciales SMTP (como SendGrid, Mailgun, Amazon SES, etc.).

### Configuración de Variables de Entorno

Abre tu archivo `.env.local` y añade las siguientes variables:

```env
# /application-base/.env.local

# ... otras variables

# CONFIGURACIÓN DE EMAIL CON SMTP GENÉRICO
SMTP_HOST="smtp.tu-proveedor.com"
SMTP_PORT="465" # O 587, etc.
SMTP_USER="tu-usuario-smtp"
SMTP_PASS="tu-contraseña-smtp"
FROM_EMAIL="no-reply@tu-dominio.com" # Email desde el que se enviarán los correos
```

-   **`SMTP_HOST`**: El servidor SMTP de tu proveedor.
-   **`SMTP_PORT`**: El puerto. Normalmente `465` (para SSL/TLS) o `587` (para STARTTLS). El servicio usará una conexión segura si el puerto es `465`.
-   **`SMTP_USER`**: Tu nombre de usuario SMTP.
-   **`SMTP_PASS`**: Tu contraseña o clave de API para SMTP.
-   **`FROM_EMAIL`**: (Opcional) La dirección "De:" que aparecerá en los correos. Si no se define, se usará `SMTP_USER`.

---

## Configuración del Servicio de Gmail

Para usar una cuenta de Gmail para enviar correos, **no puedes usar tu contraseña normal**. Debes generar una **"Contraseña de aplicación"**.

### Requisitos

1.  Tener la **Verificación en 2 pasos** activada en tu cuenta de Google.
2.  Una cuenta de Gmail.

### Pasos para Generar una Contraseña de Aplicación

1.  **Ve a tu Cuenta de Google:**
    Accede a [myaccount.google.com](https://myaccount.google.com/).

2.  **Navega a Seguridad:**
    En el menú de la izquierda, selecciona la pestaña **Seguridad**.

3.  **Activa la Verificación en 2 Pasos:**
    Si no la tienes activada, en la sección "Cómo inicias sesión en Google", haz clic en **Verificación en 2 pasos** y sigue las instrucciones. No podrás continuar hasta que esto esté activo.

4.  **Crea la Contraseña de Aplicación:**
    -   En la misma página de **Seguridad**, busca y haz clic en **Contraseñas de aplicaciones**. Es posible que debas volver a introducir tu contraseña.
    -   En la pantalla "Contraseñas de aplicaciones", verás dos menús desplegables:
        -   En "Seleccionar aplicación", elige **"Correo"**.
        -   En "Seleccionar dispositivo", elige **"Ordenador con Windows"** (o cualquier otra opción, el nombre es solo para tu referencia).
    -   Haz clic en el botón **"Generar"**.

5.  **Copia la Contraseña Generada:**
    -   Aparecerá una ventana con una contraseña de **16 caracteres** (ej. `abcd efgh ijkl mnop`).
    -   **Esta es tu `GMAIL_APP_PASSWORD`**. Cópiala inmediatamente. Una vez que cierres esta ventana, no podrás volver a verla.

### Configuración de Variables de Entorno

Abre tu archivo `.env.local` en la carpeta `application-base` y añade las siguientes variables:

```env
# /application-base/.env.local

# ... otras variables

# CONFIGURACIÓN DE EMAIL CON GMAIL
GMAIL_USER="tu-email-de-gmail@gmail.com"
GMAIL_APP_PASSWORD="la_contraseña_de_16_caracteres_sin_espacios"
```

-   **`GMAIL_USER`**: Tu dirección de correo electrónico de Gmail completa.
-   **`GMAIL_APP_PASSWORD`**: La contraseña de 16 caracteres que generaste, **sin los espacios**.

Una vez que guardes el archivo, reinicia tu servidor de desarrollo (`npm run dev`). La aplicación detectará automáticamente estas variables y empezará a usar el servicio de Gmail para enviar los correos. Si estas variables no están definidas, la aplicación volverá a imprimir los correos en la consola.
