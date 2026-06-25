import { fetch } from '@vercel/blob';

const BLOB_FILE_NAME = 'submissions.json';

export default async function handler(req, res) {
  // Autoriser uniquement les requêtes GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // --- Authentification via token (dans l'URL ou l'en-tête) ---
  const tokenQuery = req.query.token;
  const tokenHeader = req.headers.authorization?.replace('Bearer ', '');
  const adminToken = process.env.ADMIN_TOKEN;

  // Le token est obligatoire et doit correspondre
  if (!adminToken) {
    console.error('ADMIN_TOKEN non défini dans les variables d\'environnement');
    return res.status(500).json({ error: 'Configuration serveur manquante.' });
  }

  const providedToken = tokenQuery || tokenHeader;
  if (providedToken !== adminToken) {
    return res.status(401).json({ error: 'Accès non autorisé. Token invalide.' });
  }

  try {
    // Lecture du fichier depuis Blob
    const response = await fetch(BLOB_FILE_NAME, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });

    if (!response.ok) {
      // Si le fichier n'existe pas encore, on retourne un tableau vide
      return res.status(200).json([]);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Erreur lecture soumissions:', error);
    return res.status(500).json({ error: 'Erreur lors de la lecture des données.' });
  }
}