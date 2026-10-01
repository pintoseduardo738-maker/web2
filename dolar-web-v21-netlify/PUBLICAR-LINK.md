# Publicar Dólar Web con un enlace de Netlify

Esta versión usa **Netlify Functions**, por lo que no alcanza con subir solamente archivos estáticos mediante un servicio como GitHub Pages. Usá Netlify conectado a un repositorio Git o desplegá con Netlify CLI.

## Opción recomendada: Netlify + GitHub
1. Creá un repositorio privado o público en GitHub y subí el contenido de esta carpeta a la raíz.
2. En Netlify, elegí **Add new site → Import an existing project** y conectá ese repositorio.
3. Netlify detectará `netlify.toml`; la carpeta publicada es la raíz y las funciones están en `netlify/functions/`.
4. Desplegá el sitio. Netlify te dará una URL `https://TU-SITIO.netlify.app` para abrir desde otras computadoras y celulares.
5. Para activar el chat con IA, abrí **Site configuration → Environment variables** y agregá `GEMINI_API_KEY`. Opcional: `GEMINI_MODEL=gemini-2.5-flash`. Volvé a desplegar.
6. En **Forms**, comprobá que se detectó `operator-contact` y configurá notificaciones por correo para que el equipo reciba las solicitudes.
7. Consultá `NETLIFY-DATOS-IA-Y-SOPORTE.md` para probar cotizaciones, activos, IA y formulario de operador.

## Alternativa: Netlify CLI
Desde esta carpeta, ejecutá `npx netlify deploy --prod` siguiendo el asistente de Netlify CLI. Asegurate de que la carpeta raíz contenga `netlify.toml` y `netlify/functions/`.

## Importante
- Los precios se consultan de proveedores externos y se actualizan por intervalos; no es un feed bursátil profesional tick-by-tick y puede haber demoras o límites del proveedor.
- Gemini requiere una clave válida guardada como variable de entorno en Netlify. No la publiques en el código del navegador.
- “Hablar con un operador” envía una consulta para respuesta humana posterior; no crea una llamada ni un chat en vivo automáticamente. Configurá notificaciones de formularios en Netlify.
- Los saldos, tarjetas, compras y transferencias de la aplicación siguen siendo un prototipo local. Publicar la web no hace que procese dinero real ni sincroniza saldos entre dispositivos.
- El editor guarda los cambios de diseño en el navegador donde se utiliza; no publica automáticamente las modificaciones a todos los visitantes.
