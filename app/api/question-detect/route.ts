import { NextRequest, NextResponse } from "next/server";
import { askcodi } from "@/lib/askcodi";

// Quick regex patterns for obvious questions
const DEFINITE_QUESTION_PATTERNS = [
  /\?$/,
  /^(how do|how does|how can|how to|what is|what are|where is|where can|when did|when does|why is|why does|who is|who can)/i,
];

// Quick regex patterns for obvious non-questions
const DEFINITE_NON_QUESTION_PATTERNS = [
  /^(lol|haha|thanks|thank you|ok|okay|sure|yes|no|yep|nope|cool|nice|great|awesome|done|got it|makes sense|sounds good)$/i,
  /^(hey|hi|hello|morning|afternoon|evening|night|bye|goodbye|later|cheers|brb|afk|gtg)/i,
  /^@\w+/,
  /^:\w+:$/,
];

// Patterns that need AI confirmation (uncertain)
const UNCERTAIN_PATTERNS = [
  /anyone/i,
  /help/i,
  /wondering/i,
  /looking for/i,
  /does.*know/i,
  /can.*tell/i,
  /need to/i,
  /trying to/i,
];

function quickClassify(text: string): "question" | "not_question" | "uncertain" {
  const trimmed = text.trim();

  // Definite non-questions (greetings, reactions, etc.)
  if (DEFINITE_NON_QUESTION_PATTERNS.some((p) => p.test(trimmed))) {
    return "not_question";
  }

  // Definite questions (explicit question marks, question words)
  if (DEFINITE_QUESTION_PATTERNS.some((p) => p.test(trimmed))) {
    return "question";
  }

  // Uncertain patterns that need AI
  if (UNCERTAIN_PATTERNS.some((p) => p.test(trimmed))) {
    return "uncertain";
  }

  // Too short to be a question
  if (trimmed.length < 15) {
    return "not_question";
  }

  // Default: uncertain, let AI decide
  return "uncertain";
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || text.length < 3) {
      return NextResponse.json({ isQuestion: false, confidence: "high", method: "length" });
    }

    // Try quick classification first
    const quickResult = quickClassify(text);

    if (quickResult === "question") {
      return NextResponse.json({ isQuestion: true, confidence: "high", method: "regex" });
    }

    if (quickResult === "not_question") {
      return NextResponse.json({ isQuestion: false, confidence: "high", method: "regex" });
    }

    // Uncertain - use AI to classify
    const completion = await askcodi.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a text classifier. Determine if the following message is asking a question or seeking information that could be answered from a knowledge base.

Respond with ONLY "YES" or "NO".

YES if:
- The person is asking for information, help, or clarification
- They want to know something (even without a question mark)
- They're seeking guidance or looking for answers

NO if:
- It's a statement, greeting, or reaction
- It's sharing information rather than seeking it
- It's a command or instruction`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      max_tokens: 5,
      temperature: 0,
    });

    const answer = completion.choices[0]?.message?.content?.trim().toUpperCase() || "NO";
    const isQuestion = answer === "YES";

    return NextResponse.json({
      isQuestion,
      confidence: "medium",
      method: "ai",
    });
  } catch (error) {
    console.error("Question detection error:", error);
    // On error, fall back to assuming it might be a question
    return NextResponse.json({ isQuestion: false, confidence: "low", method: "error" });
  }
}
