"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  username: string;
}

function getCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    function loadUser() {
      // Read user from cookies (set by auth.ts server action)
      const userId = getCookie("user_id");
      const username = getCookie("username");

      if (userId && username) {
        setUser({
          id: userId,
          username: decodeURIComponent(username),
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }

    loadUser();

    // Re-check on focus (in case user logged in/out in another tab)
    const handleFocus = () => loadUser();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return { user, isLoading };
}
