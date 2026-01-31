import { NextRequest, NextResponse } from "next/server";
import { askcodi } from "@/lib/askcodi";

// Regex patterns for quick classification (no API call needed)
const REACTION_PATTERNS: { pattern: RegExp; emojis: string[] }[] = [
  // Celebrations and achievements
  { pattern: /congrat|awesome|great job|well done|amazing|excellent|fantastic/i, emojis: ["🎉", "👏", "🙌", "🔥"] },
  { pattern: /ship(ped)?|launch(ed)?|deploy(ed)?|release(d)?|live!/i, emojis: ["🚀", "🎉", "👏", "💯"] },

  // Gratitude
  { pattern: /thank|thanks|appreciate/i, emojis: ["❤️", "🙏", "😊", "💜"] },

  // Questions
  { pattern: /\?$/i, emojis: ["👀", "🤔", "👍", "💡"] },

  // Humor
  { pattern: /lol|haha|lmao|rofl|funny|hilarious|😂|🤣/i, emojis: ["😂", "🤣", "😆", "💀"] },

  // Agreement
  { pattern: /\b(agree|exactly|yes|yep|yeah|correct|right)\b/i, emojis: ["👍", "💯", "✅", "🙌"] },

  // Announcements
  { pattern: /announce|fyi|heads up|attention|important/i, emojis: ["👀", "📢", "⭐", "💡"] },

  // Problems/Issues
  { pattern: /bug|issue|broken|error|fail|problem/i, emojis: ["👀", "🔍", "🐛", "💪"] },

  // Sad/Sympathy
  { pattern: /sad|sorry|unfortunate|tough|hard time/i, emojis: ["😢", "🫂", "❤️", "💙"] },

  // Completed tasks
  { pattern: /done|finished|completed|fixed|resolved/i, emojis: ["✅", "🎉", "👏", "💯"] },

  // Welcome/Greetings
  { pattern: /welcome|hello|hi everyone|hey team/i, emojis: ["👋", "😊", "🎉", "💜"] },
];

// Default suggestions when no pattern matches
const DEFAULT_EMOJIS = ["👍", "❤️", "👀", "🙌"];

function getPatternSuggestions(content: string): string[] | null {
  for (const { pattern, emojis } of REACTION_PATTERNS) {
    if (pattern.test(content)) {
      return emojis;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ suggestions: DEFAULT_EMOJIS, method: "default" });
    }

    // Try regex patterns first
    const patternSuggestions = getPatternSuggestions(content);
    if (patternSuggestions) {
      return NextResponse.json({ suggestions: patternSuggestions, method: "pattern" });
    }

    // For messages 20-200 chars, use AI fallback
    if (content.length >= 20 && content.length <= 200) {
      try {
        const completion = await askcodi.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `Suggest 4 relevant emoji reactions for a chat message.
Consider the tone, content, and context. Return ONLY emoji separated by spaces, nothing else.
Common reactions: 👍 ❤️ 😂 🎉 👀 🤔 👏 🔥 💯 ✅ 🙌 💡 🚀`,
            },
            { role: "user", content },
          ],
          max_tokens: 20,
          temperature: 0.5,
        });

        const response = completion.choices[0]?.message?.content?.trim() || "";
        // Extract emojis from response
        // Use Array.from to properly handle emoji characters (which may be multi-byte)
        const emojis = Array.from(response).filter(char => {
          const code = char.codePointAt(0) || 0;
          // Check if character is in common emoji ranges
          return (
            (code >= 0x1F300 && code <= 0x1F9FF) || // Misc symbols, emoticons, etc.
            (code >= 0x2600 && code <= 0x26FF) ||   // Misc symbols
            (code >= 0x2700 && code <= 0x27BF) ||   // Dingbats
            (code >= 0x1F600 && code <= 0x1F64F) || // Emoticons
            (code >= 0x1F680 && code <= 0x1F6FF)    // Transport & map
          );
        });

        if (emojis.length >= 2) {
          return NextResponse.json({ suggestions: emojis.slice(0, 4), method: "ai" });
        }
      } catch (error) {
        console.error("AI suggestion error:", error);
      }
    }

    // Fallback to defaults
    return NextResponse.json({ suggestions: DEFAULT_EMOJIS, method: "default" });
  } catch (error) {
    console.error("Reaction suggest error:", error);
    return NextResponse.json({ suggestions: DEFAULT_EMOJIS, method: "error" });
  }
}
