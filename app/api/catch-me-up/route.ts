import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { askcodi } from "@/lib/askcodi";

export async function POST(request: NextRequest) {
  try {
    const { channelId, hoursBack = 24 } = await request.json();

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Calculate time range
    const since = new Date();
    since.setHours(since.getHours() - hoursBack);

    // Fetch messages from the time range
    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        profiles:user_id (
          username
        )
      `)
      .eq("channel_id", channelId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        summary: null,
        messageCount: 0,
        timeRange: `Last ${hoursBack} hours`,
        noActivity: true,
      });
    }

    // Format messages for the AI
    const formattedMessages = messages.map((msg) => {
      const username = (msg.profiles as { username: string } | null)?.username || "Unknown";
      const time = new Date(msg.created_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      return `[${time}] ${username}: ${msg.content}`;
    }).join("\n");

    // Generate summary with AskCodi
    const completion = await askcodi.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are summarizing a team chat channel for someone who missed the conversation.

Your task is to provide a concise summary of what happened. Focus on:
- Key decisions that were made
- Important questions and answers
- Tasks assigned or completed
- Notable announcements or updates
- Any unresolved issues or pending discussions

Format your response as a brief summary (2-4 sentences) followed by bullet points for key items if there are any.

Skip small talk, greetings, and casual messages. If there's nothing notable to report, say so briefly.

Keep your response under 200 words.`,
        },
        {
          role: "user",
          content: `Here are the messages from the last ${hoursBack} hours:\n\n${formattedMessages}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || "Unable to generate summary.";

    // Calculate actual time range
    const firstMessage = new Date(messages[0].created_at);
    const lastMessage = new Date(messages[messages.length - 1].created_at);

    return NextResponse.json({
      summary,
      messageCount: messages.length,
      timeRange: formatTimeRange(firstMessage, lastMessage),
      noActivity: false,
    });
  } catch (error) {
    console.error("Catch-me-up error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}

function formatTimeRange(start: Date, end: Date): string {
  const now = new Date();
  const startDiff = now.getTime() - start.getTime();
  const hoursDiff = Math.round(startDiff / (1000 * 60 * 60));

  if (hoursDiff < 1) {
    return "Last hour";
  } else if (hoursDiff < 24) {
    return `Last ${hoursDiff} hours`;
  } else {
    const daysDiff = Math.round(hoursDiff / 24);
    return `Last ${daysDiff} day${daysDiff !== 1 ? "s" : ""}`;
  }
}
