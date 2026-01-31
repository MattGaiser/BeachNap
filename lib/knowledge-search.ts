import { createServiceClient } from "./supabase/server";
import { generateEmbedding } from "./embeddings";

interface CombinedSearchResult {
  id: string;
  content: string;
  source_type: "message" | "documentation";
  channel_id: string | null;
  channel_name: string | null;
  user_id: string | null;
  username: string;
  created_at: string;
  similarity: number;
  recency_score: number;
  combined_score: number;
}

interface ContextMessage {
  id: string;
  content: string;
  user_id: string;
  username: string;
  created_at: string;
}

export interface KnowledgeChunk {
  channelId: string | null;
  channelName: string;
  messages: ContextMessage[];
  timestamp: string;
  sourceType: "message" | "documentation";
}

export interface SearchMetadata {
  hasDocumentation: boolean;
  hasMessages: boolean;
  documentationCount: number;
  messageCount: number;
}

export async function searchKnowledge(query: string): Promise<{ chunks: KnowledgeChunk[]; metadata: SearchMetadata }> {
  const supabase = createServiceClient();

  // Generate embedding for the query
  const embedding = await generateEmbedding(query);

  // Use combined search that includes both messages and documentation
  const { data: hits, error } = await supabase.rpc("search_knowledge_combined", {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 25,
    recency_weight: 0.1,
  });

  if (error || !hits || hits.length === 0) {
    return {
      chunks: [],
      metadata: { hasDocumentation: false, hasMessages: false, documentationCount: 0, messageCount: 0 },
    };
  }

  const typedHits = hits as CombinedSearchResult[];

  // Track metadata
  const metadata: SearchMetadata = {
    hasDocumentation: typedHits.some((h) => h.source_type === "documentation"),
    hasMessages: typedHits.some((h) => h.source_type === "message"),
    documentationCount: typedHits.filter((h) => h.source_type === "documentation").length,
    messageCount: typedHits.filter((h) => h.source_type === "message").length,
  };

  // Group by source and expand context for messages
  const chunks: KnowledgeChunk[] = [];
  const processedContexts = new Set<string>();

  for (const hit of typedHits) {
    if (hit.source_type === "documentation") {
      // Documentation entries are already synthesized - use directly
      chunks.push({
        channelId: null,
        channelName: "Documentation",
        messages: [
          {
            id: hit.id,
            content: hit.content,
            user_id: hit.user_id || "",
            username: hit.username,
            created_at: hit.created_at,
          },
        ],
        timestamp: hit.created_at,
        sourceType: "documentation",
      });
    } else {
      // Messages need context expansion
      const contextKey = `${hit.channel_id}-${Math.floor(new Date(hit.created_at).getTime() / (30 * 60 * 1000))}`;
      if (processedContexts.has(contextKey)) continue;
      processedContexts.add(contextKey);

      // Get context window around this message
      const { data: contextMessages, error: contextError } = await supabase.rpc(
        "get_context_window",
        {
          p_channel_id: hit.channel_id,
          p_timestamp: hit.created_at,
          p_window_minutes: 30,
        }
      );

      if (contextError || !contextMessages || contextMessages.length === 0) {
        chunks.push({
          channelId: hit.channel_id,
          channelName: hit.channel_name || "Unknown",
          messages: [
            {
              id: hit.id,
              content: hit.content,
              user_id: hit.user_id || "",
              username: hit.username,
              created_at: hit.created_at,
            },
          ],
          timestamp: hit.created_at,
          sourceType: "message",
        });
      } else {
        chunks.push({
          channelId: hit.channel_id,
          channelName: hit.channel_name || "Unknown",
          messages: contextMessages as ContextMessage[],
          timestamp: hit.created_at,
          sourceType: "message",
        });
      }
    }

    // Limit total chunks
    if (chunks.length >= 6) break;
  }

  return { chunks, metadata };
}

export function formatChunksForLLM(chunks: KnowledgeChunk[]): string {
  return chunks
    .map((chunk, index) => {
      const date = new Date(chunk.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (chunk.sourceType === "documentation") {
        return `[Previous Answer ${index + 1}] (${date}):\n  ${chunk.messages[0].content}`;
      }

      const messages = chunk.messages
        .map((m) => `  ${m.username}: ${m.content}`)
        .join("\n");

      return `[Conversation ${index + 1}] #${chunk.channelName} (${date}):\n${messages}`;
    })
    .join("\n\n");
}

export async function saveToDocumentation(
  question: string,
  answer: string,
  sourceMessages: Array<{ id: string; channel_id: string | null; channel: string; username: string }>
): Promise<boolean> {
  const supabase = createServiceClient();

  try {
    // Generate embedding for the question (for future searches)
    const embedding = await generateEmbedding(question);

    const { error } = await supabase.from("documentation").insert({
      question,
      answer,
      source_messages: sourceMessages,
      embedding,
    });

    if (error) {
      console.error("Failed to save documentation:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error saving documentation:", error);
    return false;
  }
}
