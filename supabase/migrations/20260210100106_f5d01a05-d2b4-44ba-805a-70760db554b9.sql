
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Cities table (one per user, stores serialized game state)
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My City',
  grid_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  resources JSONB NOT NULL DEFAULT '{}'::jsonb,
  tick INTEGER NOT NULL DEFAULT 0,
  time_of_day INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all cities" ON public.cities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own city" ON public.cities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own city" ON public.cities FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own city" ON public.cities FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for cities
ALTER PUBLICATION supabase_realtime ADD TABLE public.cities;

-- City links (connecting two cities side by side)
CREATE TABLE public.city_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_a UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  city_b UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(city_a, city_b)
);
ALTER TABLE public.city_links ENABLE ROW LEVEL SECURITY;

-- Users can see links involving their cities
CREATE POLICY "Users can view own city links" ON public.city_links FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.cities WHERE id = city_a AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.cities WHERE id = city_b AND user_id = auth.uid())
  );
CREATE POLICY "Users can create links from own city" ON public.city_links FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cities WHERE id = city_a AND user_id = auth.uid()));
CREATE POLICY "Users can update links to own city" ON public.city_links FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cities WHERE id = city_b AND user_id = auth.uid()));
CREATE POLICY "Users can delete own links" ON public.city_links FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.cities WHERE id = city_a AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.cities WHERE id = city_b AND user_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.city_links;

-- Build permissions (allow a friend to build in your city)
CREATE TABLE public.build_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  granted_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(city_id, granted_to)
);
ALTER TABLE public.build_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "City owners can manage permissions" ON public.build_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cities WHERE id = city_id AND user_id = auth.uid()));
CREATE POLICY "Granted users can view their permissions" ON public.build_permissions FOR SELECT TO authenticated
  USING (granted_to = auth.uid());

-- Function to check build permission
CREATE OR REPLACE FUNCTION public.can_build_in_city(p_city_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cities WHERE id = p_city_id AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.build_permissions WHERE city_id = p_city_id AND granted_to = p_user_id
  );
$$;
