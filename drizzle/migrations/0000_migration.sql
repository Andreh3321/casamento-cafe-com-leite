CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  access_code text NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT, UPDATE ON public.workspaces TO authenticated;
GRANT SELECT ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = auth.uid())
$$;

CREATE POLICY "members read workspace" ON public.workspaces FOR SELECT TO authenticated USING (public.is_workspace_member(id));
CREATE POLICY "members update workspace" ON public.workspaces FOR UPDATE TO authenticated USING (public.is_workspace_member(id)) WITH CHECK (public.is_workspace_member(id));
CREATE POLICY "members read members" ON public.workspace_members FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

-- Returns: 'member' | 'needs_code' | 'empty'
CREATE OR REPLACE FUNCTION public.workspace_status(_slug text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO ws FROM public.workspaces WHERE slug = _slug;
  IF ws IS NULL THEN RETURN 'empty'; END IF;
  IF public.is_workspace_member(ws) THEN RETURN 'member'; END IF;
  RETURN 'needs_code';
END $$;

CREATE OR REPLACE FUNCTION public.create_workspace(_slug text, _data jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.workspaces (slug, owner_id, data) VALUES (_slug, auth.uid(), _data)
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO ws;
  IF ws IS NULL THEN RAISE EXCEPTION 'workspace already exists'; END IF;
  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws, auth.uid(), 'owner');
  RETURN ws;
END $$;

CREATE OR REPLACE FUNCTION public.join_workspace(_slug text, _code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO ws FROM public.workspaces WHERE slug = _slug AND access_code = upper(trim(_code));
  IF ws IS NULL THEN RETURN false; END IF;
  INSERT INTO public.workspace_members (workspace_id, user_id) VALUES (ws, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN true;
END $$;

REVOKE EXECUTE ON FUNCTION public.workspace_status(text), public.create_workspace(text, jsonb), public.join_workspace(text, text), public.is_workspace_member(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.workspace_status(text), public.create_workspace(text, jsonb), public.join_workspace(text, text), public.is_workspace_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER workspaces_touch BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();