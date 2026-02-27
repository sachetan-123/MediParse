import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Sarvam AI Proxy Endpoints
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, target_language_code } = req.body;
      console.log(`Translating to ${target_language_code}...`);
      
      const response = await fetch("https://api.sarvam.ai/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": process.env.SARVAM_API_KEY || "",
        },
        body: JSON.stringify({
          input: text,
          source_language_code: "en-IN",
          target_language_code,
          model: "sarvam-translate:v1",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Sarvam Translation API error (${response.status}):`, errorText);
        return res.status(response.status).json({ error: "Sarvam API error", details: errorText });
      }

      const data = await response.json();
      console.log("Translation successful");
      res.json(data);
    } catch (error) {
      console.error("Translation proxy error:", error);
      res.status(500).json({ error: "Translation failed" });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      let { text, target_language_code } = req.body;
      
      // Truncate text to 500 chars to stay within common API limits
      if (text.length > 500) {
        console.log(`Truncating TTS text from ${text.length} to 500 chars`);
        text = text.substring(0, 500);
      }

      console.log(`Generating TTS for ${target_language_code}...`);

      const ttsPayload = {
        inputs: [text],
        target_language_code,
        speaker: "vidya",
        model: "bulbul:v2"
      };

      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": process.env.SARVAM_API_KEY || "",
        },
        body: JSON.stringify(ttsPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Sarvam TTS API error (${response.status}):`, errorText);
        return res.status(response.status).json({ error: "Sarvam TTS error", details: errorText });
      }

      const data = await response.json();
      if (!data.audios || data.audios.length === 0) {
        console.error("Sarvam TTS returned no audio data", data);
        return res.status(500).json({ error: "No audio data returned" });
      }

      console.log("TTS successful, audio length:", data.audios[0].length);
      res.json(data);
    } catch (error) {
      console.error("TTS proxy error:", error);
      res.status(500).json({ error: "TTS failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
