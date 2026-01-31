import { NextRequest, NextResponse } from "next/server";
import { askcodi } from "@/lib/askcodi";
import { searchKnowledge, formatChunksForLLM, saveToDocumentation } from "@/lib/knowledge-search";

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || query.length < 10) {
      return NextResponse.json({ hasAnswer: false });
    }

    // Search knowledge base (now includes both messages and documentation)
    const { chunks, metadata } = await searchKnowledge(query);

    if (chunks.length === 0) {
      return NextResponse.json({ hasAnswer: false });
    }

    // Format chunks for LLM
    const formattedChunks = formatChunksForLLM(chunks);

    // Synthesize answer using AskCodi
    const completion = await askcodi.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a knowledge synthesizer for a team's chat history and documentation.

Given conversation fragments and/or previous answers that may span days/weeks, synthesize a clear answer.

Rules:
- Combine fragmented messages into coherent information
- Previous answers (documentation) are reliable but may be outdated - prefer recent messages if they contradict older docs
- Note when knowledge evolved over time (e.g., "Initially X, but later discovered Y")
- Cite who said what (briefly, like "according to Alice")
- If fragments don't fully answer, say what IS known and what's missing
- Be concise (2-4 sentences ideal)
- If there's genuinely no relevant info, respond with just: NO_RELEVANT_INFO
- Do NOT make up information - only use what's in the conversations/documentation`,
        },
        {
          role: "user",
          content: `Question: "${query}"

Relevant sources:
${formattedChunks}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const answer = completion.choices[0]?.message?.content?.trim() || "";

    if (answer === "NO_RELEVANT_INFO" || answer.length === 0) {
      return NextResponse.json({ hasAnswer: false });
    }

    // Calculate time range
    const allTimestamps = chunks.flatMap((c) =>
      c.messages.map((m) => new Date(m.created_at).getTime())
    );
    const earliest = new Date(Math.min(...allTimestamps)).toISOString();
    const latest = new Date(Math.max(...allTimestamps)).toISOString();

    // Determine source type for UI
    let sourceType: "messages" | "documentation" | "combined" = "messages";
    if (metadata.hasDocumentation && metadata.hasMessages) {
      sourceType = "combined";
    } else if (metadata.hasDocumentation) {
      sourceType = "documentation";
    }

    // Auto-save to documentation (async, non-blocking)
    const sourceMessages = chunks
      .filter((c) => c.sourceType === "message")
      .flatMap((c) =>
        c.messages.map((m) => ({
          id: m.id,
          channel_id: c.channelId,
          channel: c.channelName,
          username: m.username,
        }))
      );

    // Save in background (don't await)
    saveToDocumentation(query, answer, sourceMessages).catch((err) =>
      console.error("Background doc save error:", err)
    );

    return NextResponse.json({
      hasAnswer: true,
      answer,
      sourceCount: chunks.length,
      sourceType,
      timeRange: { earliest, latest },
    });
  } catch (error) {
    console.error("Preflight API error:", error);
    return NextResponse.json({ hasAnswer: false });
  }
}
