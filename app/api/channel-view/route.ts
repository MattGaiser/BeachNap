import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Update the channel view timestamp for a user
export async function POST(request: NextRequest) {
  try {
    const { channelId, userId } = await request.json();

    if (!channelId || !userId) {
      return NextResponse.json(
        { error: "Channel ID and User ID required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Update the channel view timestamp
    await supabase.rpc("update_channel_view", {
      p_user_id: userId,
      p_channel_id: channelId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating channel view:", error);
    return NextResponse.json(
      { error: "Failed to update channel view" },
      { status: 500 }
    );
  }
}

// Get the last viewed timestamp for a channel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const userId = searchParams.get("userId");

    if (!channelId || !userId) {
      return NextResponse.json(
        { error: "Channel ID and User ID required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: lastViewed } = await supabase.rpc("get_last_channel_view", {
      p_user_id: userId,
      p_channel_id: channelId,
    });

    return NextResponse.json({ lastViewed });
  } catch (error) {
    console.error("Error getting channel view:", error);
    return NextResponse.json(
      { error: "Failed to get channel view" },
      { status: 500 }
    );
  }
}
