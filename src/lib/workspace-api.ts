import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const WORKSPACE_SLUG = "nossa-casamento";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return {
    user: user
      ? { name: (user.user_metadata?.["full_name"] as string | undefined) ?? user.email?.split("@")[0] ?? null, email: user.email ?? null }
      : null,
    userId: user?.id ?? null,
    loading,
    isAuthenticated: Boolean(user),
    logout: () => supabase.auth.signOut(),
  };
}

export type WorkspaceLoad =
  | { status: "member"; data: unknown; code: string | null }
  | { status: "needs_code" }
  | { status: "empty" };

export async function loadWorkspace(): Promise<WorkspaceLoad> {
  const { data: status, error } = await supabase.rpc("workspace_status", { _slug: WORKSPACE_SLUG });
  if (error) throw error;
  if (status !== "member") return { status: status as "needs_code" | "empty" };
  const { data: row, error: e2 } = await supabase
    .from("workspaces")
    .select("data, access_code")
    .eq("slug", WORKSPACE_SLUG)
    .single();
  if (e2) throw e2;
  return { status: "member", data: row.data, code: row.access_code };
}

export async function createWorkspace(data: unknown) {
  const { error } = await supabase.rpc("create_workspace", { _slug: WORKSPACE_SLUG, _data: data as never });
  if (error) throw error;
}

export async function saveWorkspace(data: unknown) {
  const { error } = await supabase
    .from("workspaces")
    .update({ data: data as never })
    .eq("slug", WORKSPACE_SLUG);
  if (error) throw error;
}

export async function joinWorkspace(code: string) {
  const { data, error } = await supabase.rpc("join_workspace", { _slug: WORKSPACE_SLUG, _code: code });
  if (error) throw error;
  return data === true;
}
