/**
 * CONFIGURATION FEDAPAY POUR MEDOC
 * 
 * Étapes à suivre :
 * 1. Créez un compte sur https://fedapay.com
 * 2. Allez dans "Paramètres" -> "Clés API"
 * 3. Copiez votre Clé Secrète (Secret Key)
 * 4. Remplacez 'VOTRE_CLE_API_REELLE' ci-dessous.
 */

export const FEDAPAY_CONFIG = {
  // Utilisez la clé "sandbox" pour les tests et la clé "live" pour les vrais paiements
  public_key: 'pk_sandbox_votre_cle_publique', 
  secret_key: 'sk_sandbox_VOTRE_CLE_API_REELLE', 
  environment: 'sandbox', // Changez par 'live' pour la production
  currency: 'XOF', // Franc CFA (Bénin, Togo, etc.)
  commission_rate: 0.01, // Tes 1% de commission
};

// Fonction pour initialiser un paiement
export const createPaymentUrl = async (amount: number, customerEmail: string) => {
  // Dans une version avancée, on utilise l'API FedaPay ici
  console.log(`Initialisation paiement de ${amount} FCFA pour ${customerEmail}`);
  // Retourne l'URL de la page de paiement FedaPay
  return `https://checkout.fedapay.com/pay?amount=${amount}&email=${customerEmail}`;
};
