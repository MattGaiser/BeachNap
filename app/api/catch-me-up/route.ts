import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { askcodi } from "@/lib/askcodi";
import { ActionItem } from "@/types/action-items";

// Action item patterns (simplified subset for inline use)
const ACTION_PATTERNS = [
  { pattern: /\bTODO[:\s-]+(.+)/i, type: "todo" },
  { pattern: /@(\w+)\s+(please|can you|could you)\s+(.+)/i, type: "request" },
  { pattern: /\b(I'll|I will|I'm going to)\s+(.+)/i, type: "commitment" },
];

type ProfileType = { username: string } | { username: string }[] | null;

function getUsername(profiles: ProfileType): string {
  if (!profiles) return "Unknown";
  if (Array.isArray(profiles)) {
    return profiles[0]?.username || "Unknown";
  }
  return profiles.username || "Unknown";
}

export async function POST(request: NextRequest) {
  try {
    const { channelId, userId, hoursBack = 24 } = await request.json();

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get last viewed time for this user/channel, or default to hoursBack
    let since = new Date();
    let timeRangeLabel = `Last ${hoursBack} hours`;

    if (userId) {
      const { data: lastView } = await supabase
        .rpc('get_last_channel_view', { p_user_id: userId, p_channel_id: channelId });

      if (lastView) {
        since = new Date(lastView);
        timeRangeLabel = "Since your last visit";
      } else {
        since.setHours(since.getHours() - hoursBack);
      }
    } else {
      since.setHours(since.getHours() - hoursBack);
    }

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
        timeRange: timeRangeLabel,
        noActivity: true,
        actionItems: [],
      });
    }

    // Format messages for the AI
    const formattedMessages = messages.map((msg) => {
      const username = getUsername(msg.profiles as ProfileType);
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
          content: `Here are the messages from ${timeRangeLabel.toLowerCase()}:\n\n${formattedMessages}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || "Unable to generate summary.";

    // Get dismissed action items for this user
    let dismissedMessageIds: string[] = [];
    if (userId) {
      const { data: dismissed } = await supabase
        .from("dismissed_action_items")
        .select("message_id")
        .eq("user_id", userId);

      if (dismissed) {
        dismissedMessageIds = dismissed.map(d => d.message_id);
      }
    }

    // Extract action items using quick patterns
    const actionItems: ActionItem[] = [];
    for (const msg of messages) {
      // Skip dismissed action items
      if (dismissedMessageIds.includes(msg.id)) {
        continue;
      }

      const username = getUsername(msg.profiles as ProfileType);
      const content = msg.content;

      for (const { pattern, type } of ACTION_PATTERNS) {
        const match = content.match(pattern);
        if (match) {
          let extractedTask = "";
          let assignee: string | undefined;

          if (type === "request" && match[1] && match[3]) {
            assignee = match[1];
            extractedTask = match[3].replace(/[.!?]+$/, "").trim();
          } else if (type === "commitment" && match[2]) {
            extractedTask = match[2].replace(/[.!?]+$/, "").trim();
          } else if (match[1]) {
            extractedTask = match[1].replace(/[.!?]+$/, "").trim();
          }

          if (extractedTask.length >= 5 && extractedTask.split(" ").length >= 2) {
            actionItems.push({
              messageId: msg.id,
              content: msg.content,
              extractedTask: extractedTask.charAt(0).toUpperCase() + extractedTask.slice(1),
              assignee,
              createdAt: msg.created_at,
              channelId,
              authorUsername: username,
              authorId: "",
            });
            break; // Only one action item per message
          }
        }
      }
    }

    // Calculate actual time range
    const firstMessage = new Date(messages[0].created_at);
    const lastMessage = new Date(messages[messages.length - 1].created_at);

    // Update channel view timestamp for this user
    if (userId) {
      await supabase.rpc('update_channel_view', { p_user_id: userId, p_channel_id: channelId });
    }

    return NextResponse.json({
      summary,
      messageCount: messages.length,
      timeRange: formatTimeRange(firstMessage, lastMessage),
      noActivity: false,
      actionItems,
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
