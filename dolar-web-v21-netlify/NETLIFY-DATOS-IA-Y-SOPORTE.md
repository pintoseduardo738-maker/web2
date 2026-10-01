# Datos en vivo, asistente IA y operador humano en Netlify

## Qué incluye
- `/.netlify/functions/market?type=dollars`: consulta DolarAPI desde servidor.
- `/.netlify/functions/market?type=asset&symbol=AAPL`: consulta el precio de acciones/ETF por Yahoo Finance; BTC usa CoinGecko.
- `/.netlify/functions/support`: chat con Gemini, con clave guardada en el entorno de Netlify.
- Formulario Netlify Forms `operator-contact`: permite que una persona envíe una consulta para que el responsable del sitio responda después. No es un chat humano en vivo: depende de que alguien revise las consultas y responda.

## Publicación
1. Descomprimí el ZIP y subí la carpeta del sitio a Netlify (Deploy manually o conectando el repositorio Git). La carpeta raíz debe ser la que contiene `index.html`, `netlify.toml` y `netlify/functions/`.
2. En Netlify: **Site configuration → Environment variables**, agregá `GEMINI_API_KEY` con una clave creada en Google AI Studio. Opcionalmente agregá `GEMINI_MODEL` (por defecto `gemini-2.5-flash`). No pongas la clave en `js/config.js` ni en HTML.
3. Volvé a desplegar el sitio para que las funciones lean las variables nuevas.
4. En **Forms**, verificá que aparezca `operator-contact`. Activá notificaciones por email en Netlify para recibir avisos de consultas. Si el formulario no aparece, enviá un nuevo deploy después de confirmar que el formulario con `data-netlify=true` está en `index.html`.
5. Probá `https://TU-SITIO.netlify.app/.netlify/functions/market?type=dollars` y luego el chat.

## Frecuencia y precisión
La interfaz refresca las cotizaciones en intervalos configurados en `js/config.js` (por defecto 60 segundos) y consulta de nuevo al entrar. Esto no equivale a un feed bursátil profesional tick-by-tick: DolarAPI, CoinGecko y Yahoo Finance tienen sus propias frecuencias, posibles demoras, límites y disponibilidad. Google Search no es una API financiera estable para consumir cotizaciones; por eso se usan proveedores de datos. Yahoo Finance se consulta mediante su endpoint público no oficial y puede cambiar o limitar el acceso. Para datos bursátiles con licencia/garantía, conectá un proveedor como Twelve Data, Polygon o Alpha Vantage mediante otra función y guardá la clave como variable de entorno.

## Nota de prototipo
El saldo, las compras, las transferencias y las tarjetas de Dólar Web siguen siendo datos de demostración en el navegador. Conectar precios y Gemini no convierte el sitio en una entidad financiera ni procesa operaciones reales. No recopiles datos de tarjeta reales en un prototipo publicado.
