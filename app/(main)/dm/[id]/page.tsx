import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { DmView } from "@/components/dm-view";

interface DmPageProps {
  params: Promise<{ id: string }>;
}

export default async function DmConversationPage({ params }: DmPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get("user_id")?.value;

  // Verify user is part of this conversation
  const { data: participant } = await supabase
    .from("dm_participants")
    .select("*")
    .eq("conversation_id", id)
    .eq("user_id", currentUserId || "")
    .single();

  if (!participant) {
    notFound();
  }

  // Get the other participant
  const { data: otherParticipant } = await supabase
    .from("dm_participants")
    .select("user_id, profiles(*)")
    .eq("conversation_id", id)
    .neq("user_id", currentUserId || "")
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = otherParticipant?.profiles as any;
  const otherUser = profiles ? { id: profiles.id, username: profiles.username } : null;

  return (
    <DmView
      conversationId={id}
      otherUser={otherUser}
      currentUserId={currentUserId || ""}
    />
  );
}
