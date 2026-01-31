import { NextRequest, NextResponse } from "next/server";
import { askcodi } from "@/lib/askcodi";

// Patterns that indicate incomplete/abrupt messages (nohello pattern)
const INCOMPLETE_PATTERNS = [
  /^(hi|hey|hello|yo|hiya|sup|heya)[\s!?.]*$/i,           // Bare greetings
  /^(ping|pinging)[\s!?.]*$/i,                             // Bare pings
  /^(quick question|got a sec|got a minute|you there|are you there|you around|are you around|you busy|are you busy)[\s!?.]*$/i,
  /^@\w+[\s!?.]*$/,                                        // Just a mention
  /^(can i ask|can i ask you|may i ask)[\s!?.]*$/i,       // Permission to ask
  /^(question|q)[\s!?.]*$/i,                              // Just "question"
];

// Patterns that indicate a complete message (has context)
const COMPLETE_PATTERNS = [
  /\?.*\w{3,}/,                    // Has a question mark followed by content
  /\w{3,}.*\?/,                    // Has content before a question mark
  /because|since|regarding|about|for|with/i,  // Contains context words
  /.{50,}/,                        // Long enough to have context
];

// Suggestions based on pattern type
const SUGGESTIONS: Record<string, string> = {
  greeting: "Try including your question or request in the same message. This helps the recipient respond with a complete answer right away.",
  ping: "Instead of just pinging, include what you need. They can respond when available with everything you need.",
  permission: "Go ahead and ask! Including your full question upfront helps everyone save time.",
  mention: "Add what you need from them so they can respond with a complete answer.",
  question_word: "Include your actual question in this message so they can help you immediately.",
  short: "Your message seems brief. Consider adding more context so the recipient can fully understand and respond.",
};

function detectPattern(text: string): { isIncomplete: boolean; patternType: string | null } {
  const trimmed = text.trim();

  // Check for complete patterns first
  if (COMPLETE_PATTERNS.some(p => p.test(trimmed))) {
    return { isIncomplete: false, patternType: null };
  }

  // Check for incomplete patterns
  if (/^(hi|hey|hello|yo|hiya|sup|heya)[\s!?.]*$/i.test(trimmed)) {
    return { isIncomplete: true, patternType: "greeting" };
  }

  if (/^(ping|pinging)[\s!?.]*$/i.test(trimmed)) {
    return { isIncomplete: true, patternType: "ping" };
  }

  if (/^(can i ask|can i ask you|may i ask)[\s!?.]*$/i.test(trimmed)) {
    return { isIncomplete: true, patternType: "permission" };
  }

  if (/^@\w+[\s!?.]*$/.test(trimmed)) {
    return { isIncomplete: true, patternType: "mention" };
  }

  if (/^(quick question|got a sec|got a minute|you there|are you there|you around|are you around|you busy|are you busy|question|q)[\s!?.]*$/i.test(trimmed)) {
    return { isIncomplete: true, patternType: "question_word" };
  }

  // Very short messages (under 15 chars) that aren't obvious complete messages
  if (trimmed.length < 15 && trimmed.length > 0) {
    return { isIncomplete: true, patternType: "short" };
  }

  return { isIncomplete: false, patternType: null };
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || message.length < 1) {
      return NextResponse.json({ isIncomplete: false });
    }

    // Quick pattern detection first
    const { isIncomplete, patternType } = detectPattern(message);

    if (!isIncomplete) {
      return NextResponse.json({ isIncomplete: false, method: "regex" });
    }

    if (isIncomplete && patternType) {
      return NextResponse.json({
        isIncomplete: true,
        suggestion: SUGGESTIONS[patternType] || SUGGESTIONS.short,
        patternType,
        method: "regex",
      });
    }

    // For messages 15-50 chars that don't match patterns, use AI
    if (message.length >= 15 && message.length <= 50) {
      const completion = await askcodi.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are analyzing if a chat message is a "conversation opener" that lacks context, similar to the nohello.net pattern.

A message is INCOMPLETE if it:
- Is just a greeting waiting for a response before asking the real question
- Asks for permission to ask something without including the actual question
- Is vague about what help is needed
- Would require a back-and-forth before the real question is asked

A message is COMPLETE if it:
- Contains a specific question or request
- Provides enough context that someone could respond helpfully
- Includes both a greeting AND a question/request in the same message

Respond with ONLY "INCOMPLETE" or "COMPLETE".`,
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 10,
        temperature: 0,
      });

      const answer = completion.choices[0]?.message?.content?.trim().toUpperCase() || "COMPLETE";
      const aiIncomplete = answer === "INCOMPLETE";

      return NextResponse.json({
        isIncomplete: aiIncomplete,
        suggestion: aiIncomplete ? SUGGESTIONS.short : undefined,
        method: "ai",
      });
    }

    return NextResponse.json({ isIncomplete: false, method: "length" });
  } catch (error) {
    console.error("Tone check error:", error);
    // On error, don't show a warning
    return NextResponse.json({ isIncomplete: false, method: "error" });
  }
}
