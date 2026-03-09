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
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5500;
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const INDEX_FILE = path.join(TEMPLATES_DIR, 'index.json');

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
