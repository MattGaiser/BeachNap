import OpenAI from "openai";

// AskCodi client for LLM completions (synthesis)
export const askcodi = new OpenAI({
  apiKey: process.env.ASKCODI_API_KEY,
  baseURL: process.env.ASKCODI_BASE_URL || "https://api.askcodi.com/v1",
});
