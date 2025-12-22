import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userText, conversationMode } = req.body;

    if (!userText || !userText.trim()) {
      return res.status(400).json({ error: "No user text provided" });
    }

    // Customize system prompt based on mode
    const systemPrompt =
      conversationMode === "practice"
        ? `
You are an English tutor AI speaking directly to the user.
Your response will be spoken aloud using text-to-speech.

Rules:
- Respond ONLY in natural, conversational spoken English.
- Use complete sentences.
- Do NOT use lists, bullet points, headings, or formatting.
- If the user's sentence has grammar or pronunciation errors, gently correct it and explain naturally.
- Keep responses concise and friendly.
`
        : `
You are an AI conversational partner speaking aloud.
Respond naturally in full spoken sentences.
Do NOT use lists, bullets, headings, or notes.
If the user's sentence has grammar errors, naturally restate it correctly.
`;

    // Call Groq API
    const response = await axios.post(
      "https://api.groq.com/openai/v1/responses",
      {
        model: "openai/gpt-oss-20b",
        input: [
          { role: "system", content: systemPrompt.trim() },
          { role: "user", content: userText.trim() },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LS_APP_GROQ_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Extract AI text from the response
    const messageObj = response.data.output?.find(
      (o: any) => o.type === "message" && o.role === "assistant"
    );

    let aiText = "";
    if (messageObj?.content) {
      const textItem = messageObj.content.find(
        (c: any) => c.type === "output_text"
      );
      if (textItem) aiText = textItem.text;
    }

    if (!aiText) {
      return res.status(500).json({ error: "AI returned an empty response" });
    }

    return res.status(200).json({ aiText });
  } catch (err: any) {
    console.error("Groq AI error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to get AI response" });
  }
}
