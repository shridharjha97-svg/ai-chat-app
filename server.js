require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Groq = require("groq-sdk");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // max 5MB audio upload
});

const app = express();

/* ================= SECURITY HEADERS (Helmet) ================= */
app.use(helmet({
  contentSecurityPolicy: false // keep false so your frontend scripts load fine
}));

/* ================= CORS — only allow YOUR website ================= */
const allowedOrigins = [
  process.env.FRONTEND_URL,   // set this in Render env vars = your Render URL
  "http://localhost:3000"     // for local development
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, Postman during dev)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));

/* ================= BODY SIZE LIMIT ================= */
app.use(express.json({ limit: "10kb" }));
app.use(express.static("public"));

/* ================= RATE LIMITERS ================= */
// Chat: 30 messages per 10 minutes per IP
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a few minutes." }
});

// TTS / STT: 20 requests per 10 minutes per IP
const voiceLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many voice requests. Please wait a few minutes." }
});

/* ================= GROQ CLIENT ================= */
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/* ================= CHAT ROUTE (Groq - Streaming) ================= */
app.post("/chat", chatLimiter, async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).send("Message is required.");
    }

    // Limit message length to prevent abuse
    if (userMessage.length > 1000) {
      return res.status(400).send("Message too long. Max 1000 characters.");
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a concise AI assistant. For simple or factual questions, reply in 1-2 sentences only. For detailed questions, keep answers under 5 lines. Never give unnecessary background info unless specifically asked."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
      stream: true
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";

      if (text) {
        const cleaned = text
          .replace(/#{1,6}\s?/g, "")
          .replace(/\*\*/g, "")
          .replace(/\*/g, "")
          .replace(/`{1,3}/g, "");

        res.write(cleaned);
      }
    }

    res.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).send("Server error.");
    } else {
      res.end();
    }
  }
});

/* ================= STT ROUTE (Sarvam AI) ================= */
app.post("/stt", voiceLimiter, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file provided." });

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: "audio.wav",
      contentType: req.file.mimetype || "audio/wav"
    });
    form.append("model", "saarika:v2.5");
    form.append("language_code", "en-IN");

    const response = await axios.post(
      "https://api.sarvam.ai/speech-to-text",
      form,
      {
        headers: {
          ...form.getHeaders(),
          "api-subscription-key": process.env.SARVAM_API_KEY
        }
      }
    );

    const transcript = response.data?.transcript || "";
    res.json({ transcript });
  } catch (error) {
    console.error("STT error:", error?.response?.data || error.message);
    res.status(500).json({ error: "STT failed." });
  }
});

/* ================= TTS ROUTE (Sarvam AI) ================= */
app.post("/tts", voiceLimiter, express.json({ limit: "5kb" }), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided." });

    const truncated = text.slice(0, 500);

    // Auto detect: Devanagari script = Hindi, otherwise English
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    const languageCode = hasDevanagari ? "hi-IN" : "en-IN";

    const response = await axios.post(
      "https://api.sarvam.ai/text-to-speech",
      {
        inputs: [truncated],
        target_language_code: languageCode,
        speaker: "shubh",
        pace: 1.0,
        enable_preprocessing: true,
        model: "bulbul:v3"
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": process.env.SARVAM_API_KEY
        }
      }
    );

    const audioBase64 = response.data?.audios?.[0];
    if (!audioBase64) return res.status(500).json({ error: "No audio returned." });

    res.json({ audio: audioBase64 });
  } catch (error) {
    console.error("TTS error:", error?.response?.data || error.message);
    res.status(500).json({ error: "TTS failed." });
  }
});

/* ================= GLOBAL ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: "Something went wrong." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});