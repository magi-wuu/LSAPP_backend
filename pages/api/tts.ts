import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    const openaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.LS_APP_WHISPER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "marin",
        input: text
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI TTS error:", errText);
      return res.status(500).json({ error: "TTS failed" });
    }

    const arrayBuffer = await openaiRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    res.status(200).json({ audio: base64Audio });
  } catch (err) {
    console.error("TTS API error:", err);
    res.status(500).json({ error: "TTS failed" });
  }
}
