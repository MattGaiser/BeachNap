import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ChannelsPage() {
  const supabase = await createClient();

  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .order("name")
    .limit(1);

  if (channels && channels.length > 0) {
    redirect(`/channels/${channels[0].id}`);
  }

  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <p>No channels available</p>
    </div>
  );
}
