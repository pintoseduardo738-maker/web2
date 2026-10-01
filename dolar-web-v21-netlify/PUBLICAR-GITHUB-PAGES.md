# Publicar Dólar Web con un link público

1. Creá un repositorio público en GitHub.
2. Subí **todo el contenido de esta carpeta `dolar-web`** en la raíz del repositorio.
3. En **Settings → Pages**, elegí publicar desde la rama `main` y la carpeta `/ (root)`.
4. GitHub te mostrará la URL del sitio, con formato `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.
5. Abrí esa URL desde cualquier computadora o celular.

La interfaz es responsive y no necesita instalar nada. El manifest y el service worker permiten además que el sitio se comporte como una aplicación instalable cuando el navegador lo admite.

**Importante para este prototipo:** el saldo, historial y personalización se guardan en el navegador. Una publicación estática permite abrir la aplicación desde cualquier dispositivo, pero no comparte automáticamente los datos entre dispositivos. Para sincronizar una misma cuenta entre celulares y computadoras hace falta una base de datos/backend.

GitHub Pages admite sitios estáticos y soporta HTTPS; también permite dominio personalizado si más adelante quieren usar uno propio.
