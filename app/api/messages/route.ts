import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(request: NextRequest) {
  try {
    const { content, channelId, userId } = await request.json();

    if (!content || !channelId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Generate embedding for the message
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(content);
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      // Continue without embedding - it's not critical
    }

    // Insert the message
    const { data, error } = await supabase
      .from("messages")
      .insert({
        content,
        channel_id: channelId,
        user_id: userId,
        embedding,
      })
      .select("*, profiles(*)")
      .single();

    if (error) {
      console.error("Failed to insert message:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Message API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
