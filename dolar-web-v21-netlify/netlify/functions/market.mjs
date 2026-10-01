const cors = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const allowed = new Map([
  ["AAPL", "AAPL"], ["MSFT", "MSFT"], ["NVDA", "NVDA"], ["GOOGL", "GOOGL"], ["AMZN", "AMZN"],
  ["TSLA", "TSLA"], ["META", "META"], ["MELI", "MELI"], ["KO", "KO"], ["NFLX", "NFLX"],
  ["SPY", "SPY"], ["QQQ", "QQQ"], ["VOO", "VOO"], ["DIA", "DIA"], ["IWM", "IWM"],
  ["BRK.B", "BRK-B"], ["AMD", "AMD"], ["INTC", "INTC"], ["DIS", "DIS"], ["JPM", "JPM"]
]);
const json = (body, status=200) => new Response(JSON.stringify(body), { status, headers: cors });
export default async (request) => {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "dollars";
  try {
    if (type === "dollars") {
      const res = await fetch("https://dolarapi.com/v1/dolares", { headers: { Accept: "application/json" } });
      if (!res.ok) return json({ error: `DolarAPI respondió ${res.status}` }, 502);
      const data = await res.json();
      if (!Array.isArray(data)) return json({ error: "Formato de cotizaciones inesperado" }, 502);
      return json(data);
    }
    if (type === "asset") {
      const symbol = (url.searchParams.get("symbol") || "").toUpperCase();
      if (symbol === "BTC") {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true", { headers: { Accept: "application/json" } });
        if (!res.ok) return json({ error: `CoinGecko respondió ${res.status}` }, 502);
        const data = await res.json();
        const price = Number(data?.bitcoin?.usd);
        if (!(price > 0)) return json({ error: "Precio de BTC no disponible" }, 502);
        return json({ symbol, price, changePercent: Number(data?.bitcoin?.usd_24h_change) || 0, updatedAt: new Date().toISOString(), source: "CoinGecko" });
      }
      const ticker = allowed.get(symbol);
      if (!ticker) return json({ error: "Activo no permitido" }, 400);
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`, { headers: { Accept: "application/json", "User-Agent": "DolarWeb/1.0" } });
      if (!res.ok) return json({ error: `Proveedor de mercado respondió ${res.status}` }, 502);
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const price = Number(meta?.regularMarketPrice ?? meta?.postMarketPrice ?? meta?.preMarketPrice);
      const previous = Number(meta?.chartPreviousClose ?? meta?.previousClose);
      if (!(price > 0)) return json({ error: "Precio de activo no disponible" }, 502);
      return json({ symbol, price, changePercent: previous > 0 ? ((price - previous) / previous) * 100 : null, updatedAt: new Date().toISOString(), source: "Yahoo Finance" });
    }
    return json({ error: "Tipo de consulta no reconocido" }, 400);
  } catch (error) {
    return json({ error: "No se pudo consultar el proveedor de datos", detail: String(error?.message || error) }, 502);
  }
};
