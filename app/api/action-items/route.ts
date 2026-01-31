import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { askcodi } from "@/lib/askcodi";
import { ActionItem, ActionItemsResult } from "@/types/action-items";

// Regex patterns for quick action item detection
const ACTION_PATTERNS = [
  // Explicit markers
  { pattern: /\bTODO[:\s-]+(.+)/i, type: "todo" },
  { pattern: /\baction item[:\s-]+(.+)/i, type: "action" },

  // Requests to others
  { pattern: /@(\w+)\s+(please|can you|could you|would you)\s+(.+)/i, type: "request" },

  // Self-commitments
  { pattern: /\b(I'll|I will|I'm going to|I am going to)\s+(.+)/i, type: "commitment" },

  // Obligations
  { pattern: /\b(need to|have to|must|should)\s+(.+)/i, type: "obligation" },

  // Follow-ups
  { pattern: /\b(let me|let's|we need to|we should)\s+(.+)/i, type: "followup" },
];

interface MessageWithProfile {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  profiles: { username: string } | { username: string }[] | null;
  user_id: string;
}

function getUsername(profiles: { username: string } | { username: string }[] | null): string {
  if (!profiles) return "Unknown";
  if (Array.isArray(profiles)) {
    return profiles[0]?.username || "Unknown";
  }
  return profiles.username || "Unknown";
}

function extractActionItemFromPattern(
  message: MessageWithProfile,
  channelName?: string
): ActionItem | null {
  const content = message.content;

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
        // Self-assigned
      } else if (match[1]) {
        extractedTask = match[1].replace(/[.!?]+$/, "").trim();
      }

      // Skip if extracted task is too short or looks like noise
      if (extractedTask.length < 5 || extractedTask.split(" ").length < 2) {
        continue;
      }

      return {
        messageId: message.id,
        content: message.content,
        extractedTask: extractedTask.charAt(0).toUpperCase() + extractedTask.slice(1),
        assignee,
        createdAt: message.created_at,
        channelId: message.channel_id,
        channelName,
        authorUsername: getUsername(message.profiles),
        authorId: message.user_id,
      };
    }
  }

  return null;
}

async function extractActionItemWithAI(
  message: MessageWithProfile,
  channelName?: string
): Promise<ActionItem | null> {
  try {
    const completion = await askcodi.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `Analyze this chat message for action items, tasks, or commitments.
An action item is something someone has committed to do or asked someone else to do.

If there's an action item, respond with EXACTLY this format:
TASK: [extracted task description - be concise]
ASSIGNEE: [username if someone is assigned with @mention, "self" if author committed, "team" if collective, "none" if unclear]

If NO action item exists, respond with just:
NONE

Examples:
- "I'll review the PR tomorrow" -> TASK: Review the PR / ASSIGNEE: self
- "@alice can you check the logs?" -> TASK: Check the logs / ASSIGNEE: alice
- "We should update the docs" -> TASK: Update the docs / ASSIGNEE: team
- "Had a great lunch!" -> NONE`,
        },
        { role: "user", content: message.content },
      ],
      max_tokens: 100,
      temperature: 0,
    });

    const response = completion.choices[0]?.message?.content?.trim() || "";

    if (response === "NONE" || !response.includes("TASK:")) {
      return null;
    }

    const taskMatch = response.match(/TASK:\s*(.+)/);
    const assigneeMatch = response.match(/ASSIGNEE:\s*(\w+)/);

    if (!taskMatch || !taskMatch[1]) {
      return null;
    }

    const extractedTask = taskMatch[1].trim();
    let assignee = assigneeMatch?.[1]?.toLowerCase();

    // Normalize assignee
    if (assignee === "self" || assignee === "none") {
      assignee = undefined;
    } else if (assignee === "team") {
      assignee = "Team";
    }

    return {
      messageId: message.id,
      content: message.content,
      extractedTask,
      assignee,
      createdAt: message.created_at,
      channelId: message.channel_id,
      channelName,
      authorUsername: getUsername(message.profiles),
      authorId: message.user_id,
    };
  } catch (error) {
    console.error("AI extraction error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { channelId, userId, hoursBack = 24 } = await request.json();

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get channel name
    const { data: channel } = await supabase
      .from("channels")
      .select("name")
      .eq("id", channelId)
      .single();

    const channelName = channel?.name;

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
        channel_id,
        user_id,
        profiles:user_id (
          username
        )
      `)
      .eq("channel_id", channelId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    if (!messages || messages.length === 0) {
      const result: ActionItemsResult = {
        items: [],
        timeRange: `Last ${hoursBack} hours`,
        totalCount: 0,
      };
      return NextResponse.json(result);
    }

    const actionItems: ActionItem[] = [];
    const messagesForAI: MessageWithProfile[] = [];

    // First pass: try regex patterns (skip dismissed items)
    for (const msg of messages as MessageWithProfile[]) {
      // Skip dismissed action items
      if (dismissedMessageIds.includes(msg.id)) {
        continue;
      }

      const item = extractActionItemFromPattern(msg, channelName);
      if (item) {
        actionItems.push(item);
      } else if (msg.content.length >= 20 && msg.content.length <= 300) {
        // Queue for AI analysis if message is in the right length range
        messagesForAI.push(msg);
      }
    }

    // Second pass: AI analysis for uncertain messages (limit to 10 for performance)
    const aiPromises = messagesForAI.slice(0, 10).map((msg) =>
      extractActionItemWithAI(msg, channelName)
    );

    const aiResults = await Promise.all(aiPromises);
    for (const item of aiResults) {
      if (item) {
        actionItems.push(item);
      }
    }

    // Sort by creation time (newest first)
    actionItems.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Calculate time range
    const firstMessage = new Date(messages[messages.length - 1].created_at);
    const lastMessage = new Date(messages[0].created_at);

    const result: ActionItemsResult = {
      items: actionItems,
      timeRange: formatTimeRange(firstMessage, lastMessage),
      totalCount: actionItems.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Action items error:", error);
    return NextResponse.json({ error: "Failed to extract action items" }, { status: 500 });
  }
}

// Dismiss an action item
export async function DELETE(request: NextRequest) {
  try {
    const { messageId, userId } = await request.json();

    if (!messageId || !userId) {
      return NextResponse.json(
        { error: "Message ID and User ID required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Insert into dismissed_action_items (upsert to handle duplicates)
    const { error } = await supabase
      .from("dismissed_action_items")
      .upsert(
        { user_id: userId, message_id: messageId },
        { onConflict: "user_id,message_id" }
      );

    if (error) {
      console.error("Error dismissing action item:", error);
      return NextResponse.json(
        { error: "Failed to dismiss action item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dismiss action item error:", error);
    return NextResponse.json(
      { error: "Failed to dismiss action item" },
      { status: 500 }
    );
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
