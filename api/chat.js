export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (req.headers["x-pass"] !== process.env.APP_PASSWORD)
    return res.status(401).json({ error: "Falsches Passwort" });

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "Ungültige Anfrage" });

  const system = `Du bist J.A.R.V.I.S., der KI-Butler des Nutzers, wie in Iron Man.
Sprich Deutsch, höflich, präzise, mit trockenem britischem Humor. Sprich den Nutzer mit "Sir" an.
Antworte kurz (1-3 Sätze), weil deine Antworten vorgelesen werden. Keine Markdown-Formatierung, keine Emojis, keine Listen.`;

  const model = process.env.MODEL || "gemini-flash-latest";
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.slice(-20).map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: 1000 },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data?.error?.message || "API-Fehler" });
    const reply = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
    res.json({ reply: reply || "Keine Antwort erhalten, Sir." });
  } catch (e) {
    res.status(500).json({ error: "Verbindung zur KI fehlgeschlagen" });
  }
}
