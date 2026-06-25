import { put } from '@vercel/blob';

// Nom du fichier qui contient toutes les soumissions (stocké dans Blob)
const BLOB_FILE_NAME = 'submissions.json';

/**
 * Fonction pour lire le contenu actuel du fichier JSON
 */
async function getSubmissions() {
  try {
    // Tentative de récupération du fichier existant
    const response = await fetch(BLOB_FILE_NAME, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });

    if (!response.ok) {
      // Si le fichier n'existe pas encore, on retourne un tableau vide
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // En cas d'erreur (ex: fichier inexistant), on retourne []
    return [];
  }
}

/**
 * Fonction pour écraser le fichier avec le nouveau tableau
 */
async function saveSubmissions(submissions) {
  await put(BLOB_FILE_NAME, JSON.stringify(submissions, null, 2), {
    access: 'public', // Le fichier est accessible en lecture (mais protégé par le token)
    contentType: 'application/json',
    addRandomSuffix: false, // On garde le nom exact pour le retrouver facilement
  });
}

export default async function handler(req, res) {
  // Autoriser uniquement les requêtes POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const body = req.body;

    // --- Validation des champs obligatoires ---
    const { nom, prenom, email, typeDemande, macTel, consentement } = body;

    if (!nom?.trim()) return res.status(400).json({ error: 'Le nom est requis.' });
    if (!prenom?.trim()) return res.status(400).json({ error: 'Le prénom est requis.' });
    if (!email?.trim()) return res.status(400).json({ error: 'L\'email est requis.' });
    if (!typeDemande) return res.status(400).json({ error: 'Le type de demande est requis.' });
    if (!macTel?.trim()) return res.status(400).json({ error: 'L\'adresse MAC du téléphone est obligatoire.' });

    // Validation simple du format MAC
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macTel.trim())) {
      return res.status(400).json({ error: 'Format MAC téléphone invalide (ex: AA:BB:CC:DD:EE:FF).' });
    }
    if (body.macPc && body.macPc.trim() && !macRegex.test(body.macPc.trim())) {
      return res.status(400).json({ error: 'Format MAC PC invalide.' });
    }

    if (!consentement) {
      return res.status(400).json({ error: 'Vous devez accepter le traitement des données.' });
    }

    // --- Construction de l'objet à sauvegarder ---
    const newEntry = {
      id: Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.trim(),
      typeDemande: typeDemande,
      niveau: body.niveau?.trim() || '',
      motivation: body.motivation?.trim() || '',
      macTel: macTel.trim(),
      macPc: body.macPc?.trim() || '',
      consentement: true,
      createdAt: new Date().toISOString(),
    };

    // --- Lecture du fichier existant ---
    const currentSubmissions = await getSubmissions();

    // --- Ajout de la nouvelle entrée ---
    currentSubmissions.push(newEntry);

    // --- Sauvegarde dans Vercel Blob ---
    await saveSubmissions(currentSubmissions);

    // --- Réponse de succès ---
    return res.status(201).json({
      success: true,
      message: 'Demande enregistrée avec succès.',
      data: newEntry,
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({
      error: 'Une erreur interne est survenue. Veuillez réessayer.'
    });
  }
}