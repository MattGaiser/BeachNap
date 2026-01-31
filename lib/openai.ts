import OpenAI from "openai";

// OpenAI client for embeddings only
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
