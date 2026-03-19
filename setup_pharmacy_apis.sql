-- Table pour stocker les configurations API de chaque pharmacie (WinPharma, Logiciels sur mesure, etc.)
CREATE TABLE IF NOT EXISTS public.pharmacy_api_configs (
    pharmacie_id UUID PRIMARY KEY REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    software_name TEXT, -- Nom du logiciel utilisé (ex: 'WinPharma', 'SmartPharma', 'Custom')
    webhook_url TEXT, -- L'URL fournie par le logiciel de la pharmacie à contacter lors d'une vente sur Medoc
    api_key TEXT, -- Clé de sécurité (Token) pour s'authentifier auprès de leur logiciel
    is_active BOOLEAN DEFAULT false, -- Permet d'activer/désactiver la synchro facilement
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sécurité (Row Level Security)
ALTER TABLE public.pharmacy_api_configs ENABLE ROW LEVEL SECURITY;

-- Seul le pharmacien propriétaire peut voir et modifier sa propre configuration API
CREATE POLICY "Pharmacy owners can manage their API config" ON public.pharmacy_api_configs
    FOR ALL USING (pharmacie_id IN (SELECT id FROM public.pharmacies WHERE user_id = auth.uid()));

-- En général, on ne veut pas que les clients (patients) aient accès à ces clés secrètes.
-- Les validations vers les API externes seront idéalement faites par des Edge Functions backend.
