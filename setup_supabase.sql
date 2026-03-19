-- Enable the pgcrypto extension to generate UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Tables
CREATE TABLE public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    name TEXT NOT NULL
);

CREATE TABLE public.medicaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    description TEXT,
    dosage TEXT,
    forme TEXT,
    nom TEXT NOT NULL
);

CREATE TABLE public.pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    adresse TEXT NOT NULL,
    horaires TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    nom TEXT NOT NULL,
    telephone TEXT
);

CREATE TABLE public.stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    disponible BOOLEAN NOT NULL DEFAULT true,
    medicament_id UUID REFERENCES public.medicaments(id) ON DELETE CASCADE NOT NULL,
    pharmacie_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE NOT NULL,
    prix DOUBLE PRECISION NOT NULL DEFAULT 0,
    quantite INTEGER NOT NULL DEFAULT 0
);

-- 2. Configure Row Level Security (RLS)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read medicaments
CREATE POLICY "Medicaments are viewable by everyone" ON public.medicaments FOR SELECT USING (true);

-- Allow anyone to read pharmacies
CREATE POLICY "Pharmacies are viewable by everyone" ON public.pharmacies FOR SELECT USING (true);

-- Allow anyone to read stocks
CREATE POLICY "Stocks are viewable by everyone" ON public.stocks FOR SELECT USING (true);

-- Allow authenticated users to manage their own pharmacy
CREATE POLICY "Users can manage their own pharmacy" ON public.pharmacies FOR ALL USING (user_id = auth.uid());

-- Allow pharmacies to manage their own stocks
CREATE POLICY "Pharmacies can manage their own stocks" ON public.stocks FOR ALL USING (
    pharmacie_id IN (SELECT id FROM public.pharmacies WHERE user_id = auth.uid())
);

-- Allow anyone to submit a contact message
CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);


-- 3. Create Functions

-- Function: get_pharmacy_stocks
CREATE OR REPLACE FUNCTION public.get_pharmacy_stocks(pharmacy_id UUID)
RETURNS TABLE (
    disponible BOOLEAN,
    medicament_dosage TEXT,
    medicament_forme TEXT,
    medicament_nom TEXT,
    quantite INTEGER,
    stock_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.disponible,
        m.dosage AS medicament_dosage,
        m.forme AS medicament_forme,
        m.nom AS medicament_nom,
        s.quantite,
        s.id AS stock_id
    FROM public.stocks s
    JOIN public.medicaments m ON m.id = s.medicament_id
    WHERE s.pharmacie_id = get_pharmacy_stocks.pharmacy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: search_medicament
CREATE OR REPLACE FUNCTION public.search_medicament(search_term TEXT)
RETURNS TABLE (
    disponible BOOLEAN,
    medicament_id UUID,
    medicament_nom TEXT,
    pharmacie_adresse TEXT,
    pharmacie_horaires TEXT,
    pharmacie_id UUID,
    pharmacie_latitude DOUBLE PRECISION,
    pharmacie_longitude DOUBLE PRECISION,
    pharmacie_nom TEXT,
    pharmacie_telephone TEXT,
    prix DOUBLE PRECISION,
    quantite INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.disponible,
        m.id AS medicament_id,
        m.nom AS medicament_nom,
        p.adresse AS pharmacie_adresse,
        p.horaires AS pharmacie_horaires,
        p.id AS pharmacie_id,
        p.latitude AS pharmacie_latitude,
        p.longitude AS pharmacie_longitude,
        p.nom AS pharmacie_nom,
        p.telephone AS pharmacie_telephone,
        s.prix,
        s.quantite
    FROM public.stocks s
    JOIN public.medicaments m ON m.id = s.medicament_id
    JOIN public.pharmacies p ON p.id = s.pharmacie_id
    WHERE m.nom ILIKE '%' || search_term || '%' OR m.description ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_nearby_pharmacies using Haversine formula (no PostGIS needed)
CREATE OR REPLACE FUNCTION public.get_nearby_pharmacies(
    user_lat DOUBLE PRECISION, 
    user_lon DOUBLE PRECISION, 
    max_distance DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
    distance_km DOUBLE PRECISION,
    pharmacie_adresse TEXT,
    pharmacie_horaires TEXT,
    pharmacie_id UUID,
    pharmacie_latitude DOUBLE PRECISION,
    pharmacie_longitude DOUBLE PRECISION,
    pharmacie_nom TEXT,
    pharmacie_telephone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (
            6371 * acos(
                cos(radians(user_lat)) 
                * cos(radians(p.latitude)) 
                * cos(radians(p.longitude) - radians(user_lon)) 
                + sin(radians(user_lat)) 
                * sin(radians(p.latitude))
            )
        ) AS distance_km,
        p.adresse AS pharmacie_adresse,
        p.horaires AS pharmacie_horaires,
        p.id AS pharmacie_id,
        p.latitude AS pharmacie_latitude,
        p.longitude AS pharmacie_longitude,
        p.nom AS pharmacie_nom,
        p.telephone AS pharmacie_telephone
    FROM public.pharmacies p
    WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND (
            6371 * acos(
                cos(radians(user_lat)) 
                * cos(radians(p.latitude)) 
                * cos(radians(p.longitude) - radians(user_lon)) 
                + sin(radians(user_lat)) 
                * sin(radians(p.latitude))
            )
        ) <= max_distance
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
