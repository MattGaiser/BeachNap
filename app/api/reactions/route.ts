import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { messageId, userId, emoji } = await request.json();

    if (!messageId || !userId || !emoji) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if reaction already exists (toggle behavior)
    const { data: existing } = await supabase
      .from("message_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .eq("emoji", emoji)
      .single();

    if (existing) {
      // Remove existing reaction (toggle off)
      await supabase
        .from("message_reactions")
        .delete()
        .eq("id", existing.id);

      return NextResponse.json({ action: "removed", emoji });
    } else {
      // Add new reaction
      const { error } = await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      });

      if (error) {
        console.error("Failed to add reaction:", error);
        return NextResponse.json(
          { error: "Failed to add reaction" },
          { status: 500 }
        );
      }

      return NextResponse.json({ action: "added", emoji });
    }
  } catch (error) {
    console.error("Reaction toggle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageIds = searchParams.get("messageIds");

    if (!messageIds) {
      return NextResponse.json(
        { error: "Missing messageIds parameter" },
        { status: 400 }
      );
    }

    const ids = messageIds.split(",");

    // Use the RPC function to get aggregated reactions
    const { data, error } = await supabase.rpc("get_message_reactions", {
      p_message_ids: ids,
    });

    if (error) {
      console.error("Failed to fetch reactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch reactions" },
        { status: 500 }
      );
    }

    // Group by message_id
    const reactionsByMessage: Record<
      string,
      { emoji: string; count: number; userIds: string[] }[]
    > = {};

    for (const row of data || []) {
      if (!reactionsByMessage[row.message_id]) {
        reactionsByMessage[row.message_id] = [];
      }
      reactionsByMessage[row.message_id].push({
        emoji: row.emoji,
        count: Number(row.count),
        userIds: row.user_ids,
      });
    }

    return NextResponse.json({ reactions: reactionsByMessage });
  } catch (error) {
    console.error("Fetch reactions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
