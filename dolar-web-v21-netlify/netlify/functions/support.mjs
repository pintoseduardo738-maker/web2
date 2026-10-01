const json = (body, status=200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const clean = (value, max=4000) => String(value ?? "").slice(0, max);
export default async (request) => {
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "Falta configurar GEMINI_API_KEY en las variables de entorno de Netlify." }, 503);
  let input;
  try { input = await request.json(); } catch { return json({ error: "Solicitud inválida" }, 400); }
  const message = clean(input.message, 2000).trim();
  if (!message) return json({ error: "Escribí una consulta" }, 400);
  const history = Array.isArray(input.history) ? input.history.slice(-8).map(item => ({ role: item.role === "user" ? "user" : "model", parts: [{ text: clean(item.text, 1200) }] })) : [];
  const quotes = Array.isArray(input.quoteContext) ? input.quoteContext.slice(0, 8) : [];
  const system = `Sos el asistente de soporte de Dólar Web, una aplicación web de demostración. Respondé en español rioplatense, con claridad, empatía y pasos concretos. Ayudá con navegación, cotizaciones, conversión, ahorro, inversiones, tarjetas y acceso. No inventes saldos ni cotizaciones: usá solo el contexto enviado y aclarà la hora/posible demora. No afirmes que se ejecutó una transferencia, compra real o solicitud financiera real: las operaciones del sitio son un prototipo local. No pidas contraseñas, CVV, números completos de tarjeta, códigos de verificación ni datos secretos. No des asesoramiento financiero personalizado ni prometas rentabilidad. Si preguntan por una persona, indicá que pueden enviar una consulta desde “Hablar con un operador”; no finjas ser humano. Contexto de cotizaciones actual (puede estar desactualizado): ${JSON.stringify(quotes)}`;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [...history, { role: "user", parts: [{ text: message }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 700 } })
    });
    const data = await response.json();
    if (!response.ok) return json({ error: data?.error?.message || `Gemini respondió ${response.status}` }, 502);
    const reply = data?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim();
    if (!reply) return json({ error: "La IA no devolvió una respuesta" }, 502);
    return json({ reply, provider: "Gemini", model });
  } catch (error) { return json({ error: "No se pudo conectar con el servicio de IA", detail: String(error?.message || error) }, 502); }
};
