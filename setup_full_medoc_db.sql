-- =========================================================
-- CONFIGURATION GLOBALE DE LA BASE DE DONNÉES MEDOC (SQL)
-- Collez ce code dans le SQL Editor de Supabase
-- =========================================================

-- 1. TABLE DES PHARMACIES
-- Contient les infos des officines et leur numéro de retrait auto.
CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  adresse TEXT,
  telephone TEXT,
  horaires TEXT,
  payout_number TEXT, -- Numéro Mobile Money pour le retrait AUTO
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLE DES MÉDICAMENTS (Catalogue global)
CREATE TABLE IF NOT EXISTS medicaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL UNIQUE,
  forme TEXT, -- Comprimé, Sirop, etc.
  dosage TEXT, -- 500mg, 1g, etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLE DES STOCKS (Inventaire par pharmacie)
CREATE TABLE IF NOT EXISTS stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicament_id UUID REFERENCES medicaments(id) ON DELETE CASCADE,
  quantite INTEGER DEFAULT 0,
  prix NUMERIC DEFAULT 0, -- Prix de vente unitaire
  disponible BOOLEAN DEFAULT true,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- 4. TABLE DES COMMANDES (Transactions financières)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES auth.users(id),
  pharmacie_id UUID REFERENCES pharmacies(id),
  total_amount NUMERIC NOT NULL,
  app_commission NUMERIC NOT NULL, -- Part de 1%
  pharmacy_net_amount NUMERIC NOT NULL, -- Part de 99%
  status TEXT DEFAULT 'pending_payout', -- pending_payout, payout_sent, completed
  pickup_code TEXT NOT NULL, -- Code à 6 chiffres pour le client
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. VUE POUR LE DASHBOARD (Simplifie l'affichage du stock)
CREATE OR REPLACE VIEW stocks_view AS
SELECT 
    s.id as stock_id,
    s.pharmacie_id,
    s.quantite,
    s.prix,
    s.disponible,
    m.nom as medicament_nom,
    m.forme as medicament_forme,
    m.dosage as medicament_dosage
FROM stocks s
JOIN medicaments m ON s.medicament_id = m.id;

-- 6. POLITIQUES DE SÉCURITÉ (RLS)
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Les pharmacies ne voient que LEUR stock
CREATE POLICY "Pharmacie : Voir ses propres stocks" ON stocks
FOR ALL USING (pharmacie_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid()));

-- Tout le monde peut voir les médicaments en recherche
CREATE POLICY "Public : Voir les médicaments dispos" ON stocks
FOR SELECT USING (true);
