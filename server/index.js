import dotenv from "dotenv";
// override:true because some environments (e.g. the editor/harness shell) export an empty
// ANTHROPIC_API_KEY; dotenv won't replace an already-set var unless told to. .env is the source of truth.
dotenv.config({ override: true });

import express from "express";
import cors from "cors";
import { analyze } from "./claudeProxy.js";

const app = express();
const PORT = process.env.PORT || 4100;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  const keySet =
    !!process.env.ANTHROPIC_API_KEY &&
    !process.env.ANTHROPIC_API_KEY.includes("REPLACE_ME");
  res.json({ ok: true, apiKeyConfigured: keySet });
});

app.post("/api/analyze", async (req, res) => {
  const { messages, system } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Request body must include a non-empty 'messages' array." });
  }

  try {
    const result = await analyze(messages, system);
    res.json(result);
  } catch (err) {
    const status = err?.status || 500;
    console.error("[/api/analyze] error:", err?.message || err);
    res.status(status).json({ error: err?.message || "Unexpected error calling Anthropic API." });
  }
});

app.listen(PORT, () => {
  console.log(`ErgoBuild backend listening on http://localhost:${PORT}`);
});
