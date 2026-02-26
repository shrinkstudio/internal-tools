"use client";

import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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
    <header className="h-12 shrink-0 border-b border-border bg-card flex items-center justify-end px-5 gap-4">
      {email && (
        <>
          <span className="text-xs text-muted-foreground">{email}</span>
          <Button variant="ghost" size="xs" onClick={handleSignOut}>
            Sign out
          </Button>
        </>
      )}
    </header>
  );
}
