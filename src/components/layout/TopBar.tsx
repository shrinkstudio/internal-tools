"use client";

import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function TopBar() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-12 shrink-0 border-b border-border bg-surface flex items-center justify-end px-5 gap-4">
      {email && (
        <>
          <span className="text-xs text-text-muted">{email}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-text-dim hover:text-text-muted transition-colors"
          >
            Sign out
          </button>
        </>
      )}
    </header>
  );
}
