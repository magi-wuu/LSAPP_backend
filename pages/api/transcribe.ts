import type { NextApiRequest, NextApiResponse } from "next";
import FormData from "form-data";
import fetch from "node-fetch";

export const config = { api: { bodyParser: false } };

function streamToBuffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      console.log("Streamed audio buffer size:", buffer.length, "bytes");
      resolve(buffer);
    });
    req.on("error", (err) => {
      console.error("Error streaming request body:", err);
      reject(err);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    console.log("Request method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const audioBuffer = await streamToBuffer(req);
    console.log("Audio buffer received, first 20 bytes:", audioBuffer.slice(0, 20));

    const formData = new FormData();
    formData.append("file", audioBuffer, { filename: "recording.m4a", contentType: "audio/m4a" });
    formData.append("model", "whisper-1");

    console.log("FormData headers:", formData.getHeaders());

    const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LS_APP_WHISPER_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    console.log("OpenAI API response status:", openaiRes.status);

    const data = await openaiRes.json();
    console.log("OpenAI API response body:", data);

    if (!openaiRes.ok) {
      console.error("OpenAI API returned error:", data);
      return res.status(500).json({ error: data });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("Transcription failed with error:", error);
    return res.status(500).json({ error: "Transcription failed" });
  }
}
