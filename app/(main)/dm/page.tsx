import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NewDmForm } from "@/components/new-dm-form";

export default async function DmPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get("user_id")?.value;

  // Get all users except current user
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", currentUserId || "")
    .order("username");

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold text-lg">Direct Messages</h2>
        <p className="text-sm text-muted-foreground">
          Start a conversation with a team member
        </p>
      </div>

      <div className="flex-1 p-6">
        <NewDmForm users={users || []} currentUserId={currentUserId || ""} />
      </div>
    </div>
  );
}
