# Dólar Web v21 — datos externos y soporte

- Añadida Netlify Function `market` para consultar cotizaciones de DolarAPI desde el servidor y evitar depender exclusivamente de CORS del navegador.
- Añadido proxy de precios para BTC vía CoinGecko y acciones/ETF vía Yahoo Finance para los símbolos permitidos.
- Añadida Netlify Function `support` que conecta el chat con Gemini usando `GEMINI_API_KEY` como variable de entorno.
- Mejorado el fallback del chatbot cuando la IA no está configurada o el proveedor falla.
- Añadido flujo de “Hablar con un operador” mediante Netlify Forms, con correo, tema y consulta.
- Actualizado service worker para no guardar en caché respuestas de cotizaciones/IA y limpiar la caché anterior.
- Documentación de despliegue y configuración en `NETLIFY-DATOS-IA-Y-SOPORTE.md`.

## Límites explícitos
- Las cotizaciones se actualizan por sondeo, por defecto cada 60 segundos; la demora depende de los proveedores y del mercado.
- El formulario envía una consulta para respuesta humana posterior, no es chat humano instantáneo.
- La IA necesita que el responsable configure una clave de Gemini en Netlify.
- Las operaciones financieras siguen siendo de demostración y no mueven dinero real.
