-- Mettre à jour le stock après un achat
CREATE OR REPLACE FUNCTION public.decrease_stock(
    p_pharmacie_name TEXT,
    p_medicament_name TEXT,
    p_quantite_achetee INTEGER
)
RETURNS void AS $$
BEGIN
    UPDATE public.stocks
    SET 
        quantite = quantite - p_quantite_achetee,
        disponible = CASE WHEN (quantite - p_quantite_achetee) > 0 THEN true ELSE false END
    FROM public.pharmacies p, public.medicaments m
    WHERE 
        public.stocks.pharmacie_id = p.id 
        AND public.stocks.medicament_id = m.id
        AND p.nom = p_pharmacie_name
        AND m.nom = p_medicament_name
        AND public.stocks.quantite >= p_quantite_achetee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
