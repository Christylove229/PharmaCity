-- Table pour mémoriser les achats des clients
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    pharmacie_name TEXT NOT NULL,
    medicament_name TEXT NOT NULL,
    prix_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'completed',
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Securité
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres achats
CREATE POLICY "Users can view their own purchases" ON public.purchases FOR SELECT USING (user_id = auth.uid());

-- Les utilisateurs peuvent ajouter leurs propres achats
CREATE POLICY "Users can insert their own purchases" ON public.purchases FOR INSERT WITH CHECK (user_id = auth.uid());
