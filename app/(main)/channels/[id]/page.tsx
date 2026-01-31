import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ChannelView } from "@/components/channel-view";

interface ChannelPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: channel, error } = await supabase
    .from("channels")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !channel) {
    notFound();
  }

  return <ChannelView channel={channel} />;
}
