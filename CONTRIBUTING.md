# Guía de Contribución para Aurora Nova

¡Gracias por tu interés en contribuir a Aurora Nova! Estamos emocionados de recibir ayuda de la comunidad. Esta guía te proporcionará todo lo que necesitas saber para empezar a contribuir.

## Cómo Contribuir

Hay muchas maneras de contribuir, desde escribir código y documentación hasta reportar bugs o sugerir nuevas características. Agradecemos cualquier tipo de contribución.

## Flujo de Trabajo de Desarrollo

1.  **Haz un Fork del Repositorio:** Empieza haciendo un "fork" del repositorio principal a tu propia cuenta de GitHub.

2.  **Clona tu Fork:** Clona tu fork a tu máquina local.
    ```bash
    git clone https://github.com/tu-usuario/aurora-nova.git
    cd aurora-nova
    ```

3.  **Crea una Rama (Branch):** Crea una nueva rama para tus cambios. Usa un nombre descriptivo.
    ```bash
    git checkout -b mi-nueva-caracteristica
    ```

4.  **Configura el Entorno:** Sigue las instrucciones de nuestra [Guía de Configuración](./docs/development/01-setup.md) para instalar las dependencias y levantar la base de datos.

5.  **Realiza tus Cambios:** ¡Escribe tu código! Asegúrate de seguir las convenciones del proyecto.

6.  **Verifica el Estilo de Código:** Antes de hacer commit, asegúrate de que tu código sigue nuestras guías de estilo ejecutando el linter.
    ```bash
    npm run lint
    ```
    Si hay errores, corrígelos antes de continuar.

7.  **Ejecuta los Tests:** Asegúrate de que todos los tests existentes pasen y, si estás agregando una nueva característica, por favor añade nuevos tests para cubrirla.
    ```bash
    npm test
    ```

8.  **Haz Commit de tus Cambios:** Usa un mensaje de commit claro y descriptivo.
    ```bash
    git commit -m "feat(auth): Agrega la característica X"
    ```

9.  **Sube tus Cambios:** Sube tu rama a tu fork en GitHub.
    ```bash
    git push origin mi-nueva-caracteristica
    ```

10. **Crea un Pull Request (PR):** Ve a la página del repositorio principal en GitHub y verás una opción para crear un Pull Request desde tu rama. Rellena la plantilla del PR con la información solicitada.

## Proceso de Pull Request

-   Asegúrate de que tu PR tenga un título y una descripción claros.
-   Explica el "porqué" de tus cambios, no solo el "qué".
-   Si tu PR resuelve un "issue" existente, enlázalo en la descripción (ej. `Cierra #123`).
-   El equipo del proyecto revisará tu PR lo antes posible. Es posible que pidamos algunos cambios antes de fusionarlo.

## Reportando Bugs

Si encuentras un bug, por favor, crea un "issue" en GitHub. Incluye la siguiente información:
-   Una descripción clara y concisa del bug.
-   Pasos para reproducirlo.
-   El comportamiento esperado.
-   El comportamiento que observaste.
-   Capturas de pantalla, si son relevantes.
-   Información de tu entorno (versión del navegador, sistema operativo, etc.).

## Sugiriendo Mejoras

Si tienes una idea para una nueva característica o una mejora, también puedes crear un "issue". Describe tu idea en detalle y por qué crees que sería beneficiosa para el proyecto.

¡Gracias de nuevo por tu contribución!
