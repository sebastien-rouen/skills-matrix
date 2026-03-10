/**
 * Mini serveur local pour Skills Matrix.
 * Sert les fichiers statiques + API CRUD pour les templates JSON.
 *
 * Convention :
 * - templates/*.json          → built-in, commites dans git (lecture seule)
 * - templates/*.local.json    → crees via l'app, gitignores (CRUD complet)
 * - templates/index.json      → manifeste des built-in uniquement
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5500;
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const INDEX_FILE = path.join(TEMPLATES_DIR, 'index.json');
const SHARES_FILE = path.join(__dirname, 'shares.json');

app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

// ── GET /api/templates — lister tous les templates (built-in + locaux) ──
app.get('/api/templates', (req, res) => {
  const builtIn = readIndex();
  const locals = scanLocalTemplates();
  res.json([...builtIn, ...locals]);
});

// ── POST /api/templates — creer un template local (.local.json) ──
app.post('/api/templates', (req, res) => {
  const { id, title, description, members, categories } = req.body;
  if (!id || !title || !members) {
    return res.status(400).json({ error: 'Champs requis : id, title, members' });
  }

  const slug = slugify(id);
  const filename = slug + '.local.json';
  const filepath = path.join(TEMPLATES_DIR, filename);

  // Ecrire le fichier template local
  const data = { id: slug, title, description: description || '', members, categories: categories || {} };
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`[Templates] Cree : ${filename}`);
  res.json({ success: true, id: slug, file: filename });
});

// ── DELETE /api/templates/:id — supprimer un template local uniquement ──
app.delete('/api/templates/:id', (req, res) => {
  const slug = req.params.id;

  // Verifier que c'est un template local (.local.json)
  const localFile = slug + '.local.json';
  const filepath = path.join(TEMPLATES_DIR, localFile);

  if (!fs.existsSync(filepath)) {
    // Verifier si c'est un built-in
    const builtIn = readIndex().find(t => t.id === slug);
    if (builtIn) {
      return res.status(403).json({ error: 'Les templates built-in ne peuvent pas etre supprimes.' });
    }
    return res.status(404).json({ error: 'Template introuvable' });
  }

  fs.unlinkSync(filepath);
  console.log(`[Templates] Supprime : ${localFile}`);
  res.json({ success: true });
});

// ── POST /api/share — generer un lien de partage pour un template ──
app.post('/api/share', (req, res) => {
  const { templateId } = req.body;
  if (!templateId) {
    return res.status(400).json({ error: 'Champ requis : templateId' });
  }

  // Verifier que le template existe
  const templateFile = findTemplateFile(templateId);
  if (!templateFile) {
    return res.status(404).json({ error: 'Template introuvable' });
  }

  // Generer un token unique
  const token = crypto.randomBytes(24).toString('base64url');
  const shares = readShares();

  shares[token] = {
    templateId,
    createdAt: new Date().toISOString(),
  };

  writeShares(shares);
  console.log(`[Share] Lien cree pour template "${templateId}" : ${token}`);
  res.json({ success: true, token });
});

// ── GET /api/share/:token — valider un token et charger le template ──
app.get('/api/share/:token', (req, res) => {
  const { token } = req.params;
  const shares = readShares();
  const share = shares[token];

  if (!share) {
    return res.status(404).json({ error: 'Lien de partage invalide ou revoque' });
  }

  // Charger le template
  const templateFile = findTemplateFile(share.templateId);
  if (!templateFile) {
    return res.status(404).json({ error: 'Template associe introuvable' });
  }

  try {
    const data = JSON.parse(fs.readFileSync(templateFile, 'utf-8'));
    res.json({
      success: true,
      templateId: share.templateId,
      title: data.title || share.templateId,
      members: data.members || [],
      categories: data.categories || {},
    });
  } catch {
    res.status(500).json({ error: 'Erreur lecture du template' });
  }
});

// ── PUT /api/share/:token/skills — sauvegarder les competences d'un membre ──
app.put('/api/share/:token/skills', (req, res) => {
  const { token } = req.params;
  const { memberName, skills } = req.body;

  if (!memberName || !skills) {
    return res.status(400).json({ error: 'Champs requis : memberName, skills' });
  }

  const shares = readShares();
  const share = shares[token];
  if (!share) {
    return res.status(404).json({ error: 'Lien de partage invalide ou revoque' });
  }

  const templateFile = findTemplateFile(share.templateId);
  if (!templateFile) {
    return res.status(404).json({ error: 'Template associe introuvable' });
  }

  try {
    const data = JSON.parse(fs.readFileSync(templateFile, 'utf-8'));
    const member = data.members.find(m => m.name === memberName);
    if (!member) {
      return res.status(404).json({ error: 'Membre introuvable dans le template' });
    }

    member.skills = skills;
    fs.writeFileSync(templateFile, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Share] Competences mises a jour pour "${memberName}" (template: ${share.templateId})`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Share] Erreur sauvegarde :', err.message);
    res.status(500).json({ error: 'Erreur sauvegarde' });
  }
});

// ── DELETE /api/share/:token — revoquer un lien de partage ──
app.delete('/api/share/:token', (req, res) => {
  const { token } = req.params;
  const shares = readShares();

  if (!shares[token]) {
    return res.status(404).json({ error: 'Lien introuvable' });
  }

  delete shares[token];
  writeShares(shares);
  console.log(`[Share] Lien revoque : ${token}`);
  res.json({ success: true });
});

// ── GET /api/shares/:templateId — lister les liens actifs pour un template ──
app.get('/api/shares/:templateId', (req, res) => {
  const { templateId } = req.params;
  const shares = readShares();
  const results = [];

  for (const [token, share] of Object.entries(shares)) {
    if (share.templateId === templateId) {
      results.push({ token, createdAt: share.createdAt });
    }
  }

  res.json(results);
});

// ── Helpers ──

/**
 * Lire le manifeste index.json (templates built-in).
 */
function readIndex() {
  try {
    if (!fs.existsSync(INDEX_FILE)) return [];
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Scanner les fichiers *.local.json dans templates/.
 * Retourne un tableau d'entrees compatibles avec index.json.
 */
function scanLocalTemplates() {
  try {
    const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.local.json'));
    return files.map(file => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf-8'));
        return {
          id: data.id || file.replace('.local.json', ''),
          file,
          title: data.title || file,
          description: data.description || '',
          local: true,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Lire le fichier shares.json (liens de partage actifs).
 */
function readShares() {
  try {
    if (!fs.existsSync(SHARES_FILE)) return {};
    return JSON.parse(fs.readFileSync(SHARES_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Ecrire le fichier shares.json.
 */
function writeShares(shares) {
  fs.writeFileSync(SHARES_FILE, JSON.stringify(shares, null, 2), 'utf-8');
}

/**
 * Trouver le chemin du fichier template (built-in ou local).
 * @param {string} templateId
 * @returns {string|null} Chemin absolu ou null
 */
function findTemplateFile(templateId) {
  // Verifier local en priorite
  const localFile = path.join(TEMPLATES_DIR, templateId + '.local.json');
  if (fs.existsSync(localFile)) return localFile;

  // Verifier built-in
  const builtInFile = path.join(TEMPLATES_DIR, templateId + '.json');
  if (fs.existsSync(builtInFile)) return builtInFile;

  // Chercher dans index.json
  const index = readIndex();
  const entry = index.find(t => t.id === templateId);
  if (entry?.file) {
    const indexFile = path.join(TEMPLATES_DIR, entry.file);
    if (fs.existsSync(indexFile)) return indexFile;
  }

  return null;
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Demarrage ──
app.listen(PORT, () => {
  console.log(`Skills Matrix : http://localhost:${PORT}`);
});
