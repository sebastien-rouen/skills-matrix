/**
 * Serveur Skills Matrix.
 * - Sert les fichiers statiques
 * - Proxy transparent /pb/* → PocketBase (évite les problèmes CORS pour la communauté)
 * - Routes /api/share* — gestion des liens de partage (tokens → shares.json)
 *
 * Pour BastaVerse : Nginx gère déjà le proxy /pb, ce serveur sert uniquement les statics + l'API share.
 * Pour la communauté : ce serveur fait tout (statics + proxy PB + share API).
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = parseInt(process.env.PORT || '5500', 10);
const PB_PORT = parseInt(process.env.PB_PORT || '8140', 10);

// Répertoire racine du projet (un niveau au-dessus de bdd/)
const ROOT_DIR = path.join(__dirname, '..');
const SHARES_FILE = path.join(ROOT_DIR, 'shares.json');

// ── Helpers shares.json ────────────────────────────────────────────────────────

function readShares() {
    try {
        return JSON.parse(fs.readFileSync(SHARES_FILE, 'utf8'));
    } catch { return {}; }
}

function writeShares(shares) {
    fs.writeFileSync(SHARES_FILE, JSON.stringify(shares, null, 2));
}

// ── Helper appels PocketBase internes ─────────────────────────────────────────

/**
 * Effectue une requête HTTP vers PocketBase en local.
 * @param {string} pbPath - Chemin de l'API PocketBase (ex: /api/collections/...)
 * @param {Object} [options] - { method, body }
 * @returns {Promise<{ status: number, body: Object }>}
 */
function pbRequest(pbPath, options = {}) {
    return new Promise((resolve, reject) => {
        const bodyData = options.body ? JSON.stringify(options.body) : null;
        const reqOptions = {
            hostname: 'localhost',
            port: PB_PORT,
            path: pbPath,
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json' },
        };
        if (process.env.PB_TOKEN) reqOptions.headers['Authorization'] = process.env.PB_TOKEN;
        if (bodyData) reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: {} }); }
            });
        });
        req.on('error', reject);
        if (bodyData) req.write(bodyData);
        req.end();
    });
}

// ── Proxy /pb/* → PocketBase ──────────────────────────────────────────────────
// Transparent : headers SSE préservés pour le realtime PocketBase
app.use('/pb', (req, res) => {
    const options = {
        hostname: 'localhost',
        port: PB_PORT,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `localhost:${PB_PORT}` },
    };

    const proxy = http.request(options, (pbRes) => {
        // Copier les headers de PocketBase (inclut Content-Type: text/event-stream pour SSE)
        res.writeHead(pbRes.statusCode, pbRes.headers);
        pbRes.pipe(res, { end: true });
    });

    req.pipe(proxy, { end: true });

    proxy.on('error', () => {
        if (!res.headersSent) {
            res.status(502).json({ error: 'PocketBase inaccessible. Vérifiez que ./start.sh est lancé.' });
        }
    });
});

app.use(express.json());

// ── API Catégories ────────────────────────────────────────────────────────────

// PATCH /api/categories/order — met à jour skills_categories.ordre selon l'ordre fourni
// Nécessite PB_TOKEN car skills_categories.updateRule = null (admin only)
app.patch('/api/categories/order', async (req, res) => {
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) {
        return res.status(400).json({ error: 'order requis (array de noms)' });
    }
    try {
        const all = await pbRequest('/api/collections/skills_categories/records?perPage=200&sort=ordre');
        const cats = all.body.items || [];
        await Promise.all(cats.map(cat => {
            const idx = order.indexOf(cat.name);
            return pbRequest(`/api/collections/skills_categories/records/${cat.id}`, {
                method: 'PATCH',
                body: { ordre: idx >= 0 ? idx : 999 },
            });
        }));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── API Templates ─────────────────────────────────────────────────────────────

// PATCH /api/templates/:slug — mettre à jour members+categories d'un template
// Passe par le serveur pour bénéficier du PB_TOKEN (les règles PB bloquent les writes anonymes)
app.patch('/api/templates/:slug', express.json(), async (req, res) => {
    const { slug } = req.params;
    const { members, categories, categoryOrder } = req.body || {};

    try {
        const filter = encodeURIComponent(`slug="${slug}"`);
        const found = await pbRequest(`/api/collections/skills_templates/records?filter=${filter}&perPage=1`);
        const tpl = found.body.items?.[0];
        if (!tpl) return res.status(404).json({ error: 'Template introuvable' });

        const existing = tpl.data || {};
        const patch = await pbRequest(`/api/collections/skills_templates/records/${tpl.id}`, {
            method: 'PATCH',
            body: { data: { ...existing, members: members ?? existing.members, categories: categories ?? existing.categories, categoryOrder: categoryOrder ?? existing.categoryOrder ?? [] } },
        });
        if (patch.status >= 400) {
            console.error('[Templates] PB PATCH refusé :', patch.status, JSON.stringify(patch.body));
            return res.status(502).json({ error: 'PocketBase a refusé la mise à jour', pbStatus: patch.status });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── API Share ──────────────────────────────────────────────────────────────────

app.use(express.json());

// POST /api/share — créer un lien de partage
app.post('/api/share', (req, res) => {
    const { templateId } = req.body || {};
    if (!templateId) return res.status(400).json({ error: 'templateId requis' });

    const token = crypto.randomBytes(24).toString('base64url');
    const shares = readShares();
    shares[token] = { templateId, createdAt: new Date().toISOString() };
    writeShares(shares);
    res.json({ success: true, token });
});

// GET /api/shares/:templateId — lister les tokens actifs pour un template
app.get('/api/shares/:templateId', (req, res) => {
    const shares = readShares();
    const result = Object.entries(shares)
        .filter(([, v]) => v.templateId === req.params.templateId)
        .map(([token, v]) => ({ token, createdAt: v.createdAt }));
    res.json(result);
});

// GET /api/share/:token — charger le template partagé
app.get('/api/share/:token', async (req, res) => {
    const shares = readShares();
    const share = shares[req.params.token];
    if (!share) return res.status(404).json({ error: 'Token invalide ou révoqué' });

    try {
        const filter = encodeURIComponent(`slug="${share.templateId}"`);
        const result = await pbRequest(`/api/collections/skills_templates/records?filter=${filter}&perPage=1`);
        const tpl = result.body.items?.[0];
        if (!tpl) return res.status(404).json({ error: 'Template introuvable' });

        const raw = tpl.data || {};
        const catOrder = raw.categoryOrder || [];
        const cats = raw.categories || {};
        // Réappliquer l'ordre explicite (PB/Go peut réordonner les clés JSON)
        const orderedCats = catOrder.length
            ? Object.fromEntries([
                ...catOrder.filter(k => k in cats).map(k => [k, cats[k]]),
                ...Object.entries(cats).filter(([k]) => !catOrder.includes(k)),
              ])
            : cats;
        res.json({
            success: true,
            templateId: share.templateId,
            title: tpl.title,
            members: raw.members || [],
            categories: orderedCats,
            categoryOrder: catOrder,
        });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/share/:token/skills — mettre à jour les compétences d'un membre
app.put('/api/share/:token/skills', async (req, res) => {
    const shares = readShares();
    const share = shares[req.params.token];
    if (!share) return res.status(404).json({ error: 'Token invalide ou révoqué' });

    const { memberName, skills } = req.body || {};
    if (!memberName) return res.status(400).json({ error: 'memberName requis' });

    try {
        const filter = encodeURIComponent(`slug="${share.templateId}"`);
        const result = await pbRequest(`/api/collections/skills_templates/records?filter=${filter}&perPage=1`);
        const tpl = result.body.items?.[0];
        if (!tpl) return res.status(404).json({ error: 'Template introuvable' });

        const raw = tpl.data || {};
        const members = raw.members || [];
        const memberIdx = members.findIndex(m => m.name === memberName);
        if (memberIdx === -1) return res.status(404).json({ error: 'Membre introuvable' });

        members[memberIdx] = { ...members[memberIdx], skills };

        await pbRequest(`/api/collections/skills_templates/records/${tpl.id}`, {
            method: 'PATCH',
            body: { data: { ...raw, members } },
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/share/:token/categories — mettre à jour les catégories via lien de partage
app.put('/api/share/:token/categories', async (req, res) => {
    const shares = readShares();
    const share = shares[req.params.token];
    if (!share) return res.status(404).json({ error: 'Token invalide ou révoqué' });

    const { categories, members } = req.body || {};
    if (!categories || typeof categories !== 'object') {
        return res.status(400).json({ error: 'categories requis (objet)' });
    }

    try {
        const filter = encodeURIComponent(`slug="${share.templateId}"`);
        const result = await pbRequest(`/api/collections/skills_templates/records?filter=${filter}&perPage=1`);
        const tpl = result.body.items?.[0];
        if (!tpl) return res.status(404).json({ error: 'Template introuvable' });

        const raw = tpl.data || {};
        const patch = { ...raw, categories };
        if (Array.isArray(members)) patch.members = members;
        await pbRequest(`/api/collections/skills_templates/records/${tpl.id}`, {
            method: 'PATCH',
            body: { data: patch },
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/share/:token — révoquer un lien de partage
app.delete('/api/share/:token', (req, res) => {
    const shares = readShares();
    if (!shares[req.params.token]) return res.status(404).json({ error: 'Token introuvable' });
    delete shares[req.params.token];
    writeShares(shares);
    res.json({ success: true });
});

// ── Fichiers statiques ────────────────────────────────────────────────────────
app.use(express.static(ROOT_DIR));

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

// ── Démarrage ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Skills Matrix : http://localhost:${PORT}`);
    console.log(`PocketBase    : http://localhost:${PB_PORT} (proxy via /pb)`);
});
