"use server";

import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function login(username: string) {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // First, check if this username already exists in profiles
  const { data: existingProfile } = await serviceClient
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .single();

  let userId: string;

  if (existingProfile) {
    // Username exists - use the existing profile
    userId = existingProfile.id;
  } else {
    // New username - create anonymous auth user and profile
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          username: username,
        },
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return { error: "Failed to sign in. Please try again." };
    }

    const user = authData?.user;
    if (!user) {
      return { error: "Failed to create user" };
    }

    userId = user.id;

    // Create the profile
    const { error: profileError } = await serviceClient
      .from("profiles")
      .insert({
        id: userId,
        username: username,
      });

    if (profileError) {
      console.error("Profile error:", profileError);
      return { error: "Username might already be taken. Please try another." };
    }
  }

  // Set cookies for client-side access
  const cookieStore = await cookies();
  cookieStore.set("user_id", userId, {
    httpOnly: false, // Allow client-side access for useUser hook
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  cookieStore.set("username", username, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return { success: true, user: { id: userId, username } };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete("username");

  return { success: true };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const username = user.user_metadata?.username ||
    (await cookies()).get("username")?.value;

  return { id: user.id, username: username || "anonymous" };
}
