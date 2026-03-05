/**
 * Settings view - Application configuration and data management.
 * Provides category management, member editing, display settings, and backup/restore.
 */

import { getState, updateCategories, updateSettings, updateMember, removeMember, replaceMembers } from '../state.js';
import { getAllSkillNames } from '../models/data.js';
import { exportJSON, parseJSON } from '../services/exporter.js';
import { loadApiSettings, saveApiSettings, clearApiSettings, testConnection, convertApiDataToMembers } from '../services/api-source.js';
import { toastSuccess, toastError, toastWarning, toastInfo } from '../components/toast.js';
import { confirm } from '../components/modal.js';
import { downloadFile, escapeHtml, debounce } from '../utils/helpers.js';

/**
 * Render the settings view.
 * @param {HTMLElement} container - The view container element
 */
export function renderSettingsView(container) {
  const state = getState();
  const hasData = state.members.length > 0;
  const settings = state.settings || {};

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Paramètres</h1>
        <p class="page-header__subtitle">Configuration de l'application et gestion des données</p>
      </div>
    </div>

    ${hasData ? renderCategoryCard(state) : ''}

    ${hasData ? renderMemberCard(state) : ''}

    ${renderThresholdsCard(settings)}

    ${renderExportCard(settings)}

    ${renderApiSourceCard()}

    ${renderBackupCard(hasData)}
  `;

  bindSettingsEvents(container);
}

// ============================================================
// Card renderers
// ============================================================

/**
 * Render the category management card.
 * @param {Object} state - Current application state
 * @returns {string} Card HTML
 */
function renderCategoryCard(state) {
  const allSkills = getAllSkillNames(state.members);
  const categories = state.categories || {};
  const categorizedSkills = new Set();

  for (const skills of Object.values(categories)) {
    for (const s of skills) categorizedSkills.add(s);
  }

  const uncategorized = allSkills.filter(s => !categorizedSkills.has(s));

  let catHtml = '';
  for (const [catName, skills] of Object.entries(categories)) {
    catHtml += `
      <div style="padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-lg);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2);">
          <strong style="font-size: var(--font-size-sm);">${escapeHtml(catName)}</strong>
          <button class="btn btn--ghost btn--sm category-remove-btn" data-category="${escapeHtml(catName)}">✕</button>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-1);">
          ${skills.map(s => `<span class="badge badge--info">${escapeHtml(s)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  if (uncategorized.length > 0) {
    catHtml += `
      <div style="padding: var(--space-3); background: var(--color-bg-tertiary); border-radius: var(--radius-lg); border: 1px dashed var(--color-border);">
        <strong style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Non catégorisées</strong>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-2);">
          ${uncategorized.map(s => `<span class="badge badge--neutral">${escapeHtml(s)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Gestion des catégories</h3>
        <button class="btn btn--secondary btn--sm" id="settings-auto-categorize">Auto-catégoriser</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: var(--space-3);">
        ${catHtml}
        <div style="display: flex; gap: var(--space-2); margin-top: var(--space-2);">
          <input type="text" class="form-input" id="settings-new-category" placeholder="Nouvelle catégorie..." style="flex: 1; max-width: 250px;" />
          <button class="btn btn--secondary btn--sm" id="settings-add-category">Ajouter</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the member management card.
 * @param {Object} state - Current application state
 * @returns {string} Card HTML
 */
function renderMemberCard(state) {
  return `
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Gestion des membres</h3>
        <span class="badge badge--info">${state.members.length} membre(s)</span>
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; font-size: var(--font-size-sm); border-collapse: collapse;">
          <thead>
            <tr style="background: var(--color-bg-tertiary);">
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid var(--color-border);">Nom</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid var(--color-border);">Ownership</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid var(--color-border);">Appétences</th>
              <th style="padding: 8px 12px; text-align: center; width: 140px; border-bottom: 2px solid var(--color-border);">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.members.map(m => `
              <tr data-member-id="${m.id}" style="border-bottom: 1px solid var(--color-border-light);">
                <td style="padding: 8px 12px;">
                  <span class="member-display" data-field="name">${escapeHtml(m.name)}</span>
                  <input class="form-input member-edit-input" data-field="name" type="text"
                         value="${escapeHtml(m.name)}" style="display: none; width: 100%; padding: 4px 8px;" />
                </td>
                <td style="padding: 8px 12px;">
                  <span class="member-display" data-field="role">${escapeHtml(m.role)}</span>
                  <input class="form-input member-edit-input" data-field="role" type="text"
                         value="${escapeHtml(m.role)}" style="display: none; width: 100%; padding: 4px 8px;" />
                </td>
                <td style="padding: 8px 12px;">
                  <span class="member-display" data-field="appetences">${escapeHtml(m.appetences)}</span>
                  <input class="form-input member-edit-input" data-field="appetences" type="text"
                         value="${escapeHtml(m.appetences)}" style="display: none; width: 100%; padding: 4px 8px;" />
                </td>
                <td style="padding: 8px 12px; text-align: center; white-space: nowrap;">
                  <button class="btn btn--ghost btn--sm member-edit-btn" title="Modifier">✏️</button>
                  <button class="btn btn--ghost btn--sm member-save-btn" title="Enregistrer" style="display: none;">✅</button>
                  <button class="btn btn--ghost btn--sm member-cancel-btn" title="Annuler" style="display: none;">❌</button>
                  <button class="btn btn--ghost btn--sm member-delete-btn" title="Supprimer">🗑</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Render the thresholds and display settings card.
 * @param {Object} settings - Current settings
 * @returns {string} Card HTML
 */
function renderThresholdsCard(settings) {
  return `
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Seuils & Affichage</h3>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6);">
        <div>
          <label style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-1);">
            Seuil d'alerte critique
          </label>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-2);">
            Nombre minimum de Confirmés/Experts requis. En dessous, la compétence est marquée critique.
          </p>
          <select class="form-select" id="setting-critical-threshold" style="max-width: 200px;">
            ${[1, 2, 3].map(v => `
              <option value="${v}" ${settings.criticalThreshold === v ? 'selected' : ''}>${v} personne${v > 1 ? 's' : ''}</option>
            `).join('')}
          </select>
        </div>
        <div>
          <label style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-1);">
            Troncature des noms de compétence
          </label>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-2);">
            Longueur max. dans les en-têtes de la matrice.
          </p>
          <select class="form-select" id="setting-skill-max-length" style="max-width: 200px;">
            ${[
              { v: 8, l: '8 caractères' },
              { v: 12, l: '12 caractères' },
              { v: 16, l: '16 caractères' },
              { v: 20, l: '20 caractères' },
              { v: 0, l: 'Aucune troncature' },
            ].map(o => `
              <option value="${o.v}" ${settings.skillNameMaxLength === o.v ? 'selected' : ''}>${o.l}</option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the export settings card.
 * @param {Object} settings - Current settings
 * @returns {string} Card HTML
 */
function renderExportCard(settings) {
  const options = [
    { value: ';', label: 'Point-virgule (;)' },
    { value: ',', label: 'Virgule (,)' },
    { value: 'tab', label: 'Tabulation' },
  ];
  const currentValue = settings.csvDelimiter === '\t' ? 'tab' : settings.csvDelimiter;

  return `
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Export CSV</h3>
      </div>
      <div>
        <label style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-2);">
          Séparateur CSV
        </label>
        <div style="display: flex; gap: var(--space-4);">
          ${options.map(opt => `
            <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); cursor: pointer;">
              <input type="radio" name="csv-delimiter" value="${opt.value}"
                     ${currentValue === opt.value ? 'checked' : ''} />
              ${opt.label}
            </label>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the API source configuration card.
 * @returns {string} Card HTML
 */
function renderApiSourceCard() {
  const settings = loadApiSettings();
  return `
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Source externe (API)</h3>
      </div>
      <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-4);">
        Connectez une API JSON pour importer des compétences. Les paramètres sont conservés dans le navigateur.
      </p>
      <div class="api-source">
        <div class="api-source__field">
          <label for="api-source-url" style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-1);">
            URL du endpoint JSON
          </label>
          <input type="url" id="api-source-url" class="form-input"
                 value="${escapeHtml(settings.url)}"
                 placeholder="https://example.com/api/skills.json" />
        </div>
        <div class="api-source__field">
          <label for="api-source-token" style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-1);">
            Token d'authentification
          </label>
          <div class="api-source__token-row">
            <input type="password" id="api-source-token" class="form-input"
                   value="${escapeHtml(settings.token)}"
                   placeholder="Bearer token (optionnel)"
                   style="flex: 1;" />
            <button class="btn btn--ghost btn--sm" id="api-source-toggle-token" title="Afficher/masquer" type="button"
                    style="min-width: 40px;">👁️</button>
          </div>
        </div>
        <div class="api-source__status" id="api-source-status"></div>
        <div class="api-source__actions">
          <button class="btn btn--secondary btn--sm" id="api-source-test">Tester la connexion</button>
          <button class="btn btn--primary btn--sm" id="api-source-import">Importer</button>
          <button class="btn btn--ghost btn--sm" id="api-source-clear" style="margin-left: auto; color: var(--color-danger-500);">Effacer</button>
        </div>
      </div>
      <details style="margin-top: var(--space-4);">
        <summary style="font-size: var(--font-size-xs); color: var(--color-text-secondary); cursor: pointer;">Format JSON attendu</summary>
        <pre style="font-size: var(--font-size-xs); background: var(--color-bg-tertiary); padding: var(--space-3); border-radius: var(--radius-md); margin-top: var(--space-2); overflow-x: auto;">{
  "members": [
    {
      "name": "Alice Dupont",
      "role": "Dev Frontend",
      "appetences": "IA, Cloud",
      "skills": {
        "JavaScript": { "level": 4, "appetence": 2 },
        "React": { "level": 3, "appetence": 3 },
        "Python": 1
      }
    }
  ]
}</pre>
      </details>
    </div>
  `;
}

/**
 * Render the backup and data management card.
 * @param {boolean} hasData - Whether data exists
 * @returns {string} Card HTML
 */
function renderBackupCard(hasData) {
  return `
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Sauvegarde & Données</h3>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center;">
        ${hasData ? `
          <button class="btn btn--secondary" id="settings-export-json">💾 Exporter JSON</button>
        ` : ''}
        <label class="btn btn--secondary" style="cursor: pointer;">
          📁 Importer JSON
          <input type="file" accept=".json" id="settings-import-json" style="display: none;" />
        </label>
        ${hasData ? `
          <div style="flex: 1;"></div>
          <button class="btn btn--danger" id="settings-reset-btn">🗑 Réinitialiser toutes les données</button>
        ` : ''}
      </div>
    </div>
  `;
}

// ============================================================
// Event bindings
// ============================================================

/**
 * Bind all events for the settings view.
 * @param {HTMLElement} container - The view container element
 */
function bindSettingsEvents(container) {
  // --- Category management ---
  container.querySelector('#settings-auto-categorize')?.addEventListener('click', () => {
    const state = getState();
    const allSkills = getAllSkillNames(state.members);
    const autoCats = autoCategorize(allSkills);
    updateCategories(autoCats);
    toastSuccess('Catégories auto-générées.');
  });

  container.querySelector('#settings-add-category')?.addEventListener('click', () => {
    const input = container.querySelector('#settings-new-category');
    const name = input.value.trim();
    if (!name) return;
    const state = getState();
    const cats = { ...state.categories };
    if (!cats[name]) cats[name] = [];
    updateCategories(cats);
    input.value = '';
    toastSuccess(`Catégorie "${name}" ajoutée.`);
  });

  container.querySelectorAll('.category-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const catName = btn.dataset.category;
      const state = getState();
      const cats = { ...state.categories };
      delete cats[catName];
      updateCategories(cats);
      toastSuccess(`Catégorie "${catName}" supprimée.`);
    });
  });

  // --- Member management ---
  container.querySelectorAll('.member-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      row.querySelectorAll('.member-display').forEach(el => el.style.display = 'none');
      row.querySelectorAll('.member-edit-input').forEach(el => el.style.display = '');
      row.querySelector('.member-edit-btn').style.display = 'none';
      row.querySelector('.member-delete-btn').style.display = 'none';
      row.querySelector('.member-save-btn').style.display = '';
      row.querySelector('.member-cancel-btn').style.display = '';
    });
  });

  container.querySelectorAll('.member-save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      const memberId = row.dataset.memberId;
      const name = row.querySelector('.member-edit-input[data-field="name"]').value.trim();
      const role = row.querySelector('.member-edit-input[data-field="role"]').value.trim();
      const appetences = row.querySelector('.member-edit-input[data-field="appetences"]').value.trim();

      if (!name) {
        toastError('Le nom ne peut pas être vide.');
        return;
      }

      updateMember(memberId, { name, role, appetences });
      toastSuccess(`Membre "${name}" mis à jour.`);
    });
  });

  container.querySelectorAll('.member-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      renderSettingsView(container);
    });
  });

  container.querySelectorAll('.member-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const memberId = row.dataset.memberId;
      const name = row.querySelector('.member-display[data-field="name"]').textContent;

      const confirmed = await confirm(
        'Supprimer le membre',
        `Supprimer définitivement « ${name} » et toutes ses compétences ?`
      );
      if (!confirmed) return;

      removeMember(memberId);
      toastSuccess(`Membre "${name}" supprimé.`);
    });
  });

  // --- Thresholds & Display ---
  container.querySelector('#setting-critical-threshold')?.addEventListener('change', (e) => {
    updateSettings({ criticalThreshold: parseInt(e.target.value, 10) });
    toastSuccess('Seuil critique mis à jour.');
  });

  container.querySelector('#setting-skill-max-length')?.addEventListener('change', (e) => {
    updateSettings({ skillNameMaxLength: parseInt(e.target.value, 10) });
    toastSuccess('Troncature mise à jour.');
  });

  // --- CSV delimiter ---
  container.querySelectorAll('input[name="csv-delimiter"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const value = e.target.value === 'tab' ? '\t' : e.target.value;
      updateSettings({ csvDelimiter: value });
      toastSuccess('Séparateur CSV mis à jour.');
    });
  });

  // --- API Source ---
  const apiUrlInput = container.querySelector('#api-source-url');
  const apiTokenInput = container.querySelector('#api-source-token');
  const apiStatus = container.querySelector('#api-source-status');

  const persistApiFields = debounce(() => {
    saveApiSettings(
      apiUrlInput?.value.trim() || '',
      apiTokenInput?.value.trim() || ''
    );
  }, 800);

  apiUrlInput?.addEventListener('input', persistApiFields);
  apiTokenInput?.addEventListener('input', persistApiFields);

  container.querySelector('#api-source-toggle-token')?.addEventListener('click', () => {
    if (!apiTokenInput) return;
    const visible = apiTokenInput.type === 'text';
    apiTokenInput.type = visible ? 'password' : 'text';
    container.querySelector('#api-source-toggle-token').textContent = visible ? '👁️' : '🙈';
  });

  const setApiStatus = (msg, type) => {
    if (!apiStatus) return;
    apiStatus.textContent = msg;
    apiStatus.className = 'api-source__status';
    if (type) apiStatus.classList.add('api-source__status--' + type);
    apiStatus.style.display = msg ? 'block' : 'none';
  };

  container.querySelector('#api-source-test')?.addEventListener('click', async () => {
    const url = apiUrlInput?.value.trim();
    const token = apiTokenInput?.value.trim();
    saveApiSettings(url, token);
    setApiStatus('Connexion en cours...', 'info');

    const result = await testConnection(url, token);
    if (result.success) {
      setApiStatus(`Connexion OK — ${result.skillCount} competences, ${result.memberCount} membres detectes`, 'success');
    } else {
      setApiStatus(result.error, 'error');
    }
  });

  container.querySelector('#api-source-import')?.addEventListener('click', async () => {
    const url = apiUrlInput?.value.trim();
    const token = apiTokenInput?.value.trim();
    saveApiSettings(url, token);
    setApiStatus('Import en cours...', 'info');

    const result = await testConnection(url, token);
    if (!result.success) {
      setApiStatus(result.error, 'error');
      return;
    }

    const members = convertApiDataToMembers(result.data);
    const confirmed = await confirm(
      'Importer depuis l\'API',
      `Importer ${members.length} membre(s) et leurs compétences ? Cela remplacera les données existantes.`
    );
    if (!confirmed) {
      setApiStatus('Import annule', 'info');
      return;
    }

    replaceMembers(members);
    setApiStatus(`Import reussi — ${members.length} membre(s)`, 'success');
    toastSuccess(`${members.length} membre(s) importé(s) depuis l'API.`);
  });

  container.querySelector('#api-source-clear')?.addEventListener('click', () => {
    clearApiSettings();
    if (apiUrlInput) apiUrlInput.value = '';
    if (apiTokenInput) apiTokenInput.value = '';
    setApiStatus('', '');
    toastInfo('Paramètres API effacés.');
  });

  // --- Backup & Data ---
  container.querySelector('#settings-export-json')?.addEventListener('click', () => {
    const state = getState();
    const json = exportJSON(state);
    downloadFile(json, 'skills-matrix-backup.json', 'application/json');
    toastSuccess('Backup JSON exporté.');
  });

  container.querySelector('#settings-import-json')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = parseJSON(text);
      if (!data) {
        toastError('Fichier JSON invalide.');
        return;
      }
      const confirmed = await confirm(
        'Importer JSON',
        `Importer ${data.members.length} membre(s) ? Cela remplacera les données existantes.`
      );
      if (!confirmed) return;

      const { setState } = await import('../state.js');
      setState(data);
      toastSuccess(`${data.members.length} membre(s) importé(s) depuis JSON.`);
    } catch (err) {
      toastError('Erreur lors de la lecture du fichier.');
    }
    e.target.value = '';
  });

  container.querySelector('#settings-reset-btn')?.addEventListener('click', async () => {
    const confirmed = await confirm(
      'Réinitialiser toutes les données',
      'Cette action supprimera définitivement toutes les données. Cette action est irréversible.'
    );
    if (!confirmed) return;

    const { resetState } = await import('../state.js');
    resetState();
    toastWarning('Toutes les données ont été réinitialisées.');
  });
}

// ============================================================
// Auto-categorization (moved from import.js)
// ============================================================

/**
 * Auto-categorize skills based on common technology groupings.
 * @param {string[]} skills - List of skill names
 * @returns {Object} Categories map
 */
function autoCategorize(skills) {
  const rules = [
    { name: 'Frontend', patterns: [/react/i, /vue/i, /angular/i, /css/i, /html/i, /sass/i, /scss/i, /tailwind/i, /bootstrap/i, /next\.?js/i, /nuxt/i, /svelte/i, /typescript/i, /javascript/i, /jquery/i, /webpack/i, /vite/i] },
    { name: 'Backend', patterns: [/node\.?js/i, /express/i, /nestjs/i, /python/i, /django/i, /flask/i, /java\b/i, /spring/i, /\.net/i, /c#/i, /php/i, /laravel/i, /ruby/i, /rails/i, /go\b/i, /rust/i, /kotlin/i] },
    { name: 'Data & IA', patterns: [/sql/i, /postgres/i, /mysql/i, /mongo/i, /redis/i, /elastic/i, /machine.?learning/i, /deep.?learning/i, /tensorflow/i, /pytorch/i, /pandas/i, /data/i, /bi\b/i, /power.?bi/i, /tableau/i] },
    { name: 'DevOps & Cloud', patterns: [/docker/i, /kubernetes/i, /k8s/i, /aws/i, /azure/i, /gcp/i, /ci.?cd/i, /jenkins/i, /terraform/i, /ansible/i, /linux/i, /git\b/i, /github/i, /gitlab/i] },
    { name: 'Méthodo & Soft Skills', patterns: [/agile/i, /scrum/i, /kanban/i, /management/i, /communication/i, /leadership/i, /design.?thinking/i, /product/i, /ux/i, /ui\b/i] },
  ];

  const categories = {};
  const assigned = new Set();

  for (const rule of rules) {
    const matched = skills.filter(s =>
      !assigned.has(s) && rule.patterns.some(p => p.test(s))
    );
    if (matched.length > 0) {
      categories[rule.name] = matched;
      matched.forEach(s => assigned.add(s));
    }
  }

  const unmatched = skills.filter(s => !assigned.has(s));
  if (unmatched.length > 0) {
    categories['Autres'] = unmatched;
  }

  return categories;
}
