-- Politique pour permettre aux utilisateurs connectés (pharmacies) d'ajouter de nouveaux médicaments
CREATE POLICY "Authenticated users can insert medicaments" 
ON public.medicaments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);
