/**
 * Settings view - Application configuration and data management.
 * Provides summary navigation, category/member/group management,
 * multiple API sources, display settings, and backup/restore.
 */

import { getState, updateCategories, updateSettings, updateMember, removeMember, replaceMembers, addMembers } from '../state.js';
import { getAllSkillNames, getAllGroups } from '../models/data.js';
import { exportJSON, parseJSON } from '../services/exporter.js';
import {
  loadApiSources, addApiSource, removeApiSource,
  testConnection, convertApiDataToMembers, convertApiDataToSkills,
  applyGroupsToMembers, SOURCE_TYPES, getSourceTypeLabel,
} from '../services/api-source.js';
import { toastSuccess, toastError, toastWarning, toastInfo } from '../components/toast.js';
import { confirm, showModal } from '../components/modal.js';
import { downloadFile, escapeHtml, debounce, generateId } from '../utils/helpers.js';

// ============================================================
// Sections definition for summary navigation
// ============================================================

const SECTIONS = [
  { id: 'settings-categories', label: 'Categories', needsData: true },
  { id: 'settings-members', label: 'Membres', needsData: true },
  { id: 'settings-thresholds', label: 'Seuils', needsData: false },
  { id: 'settings-export', label: 'Export CSV', needsData: false },
  { id: 'settings-sources', label: 'Sources API', needsData: false },
  { id: 'settings-backup', label: 'Sauvegarde', needsData: false },
];

// ============================================================
// Main render
// ============================================================

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
        <h1 class="page-header__title">Parametres</h1>
        <p class="page-header__subtitle">Configuration de l'application et gestion des donnees</p>
      </div>
    </div>

    ${renderSummary(hasData)}

    ${hasData ? renderCategoryCard(state) : ''}

    ${hasData ? renderMemberCard(state) : ''}

    ${renderThresholdsCard(settings)}

    ${renderExportCard(settings)}

    ${renderApiSourcesCard()}

    ${renderBackupCard(hasData)}
  `;

  bindSettingsEvents(container);
}

// ============================================================
// Card renderers
// ============================================================

/**
 * Render the summary navigation bar.
 */
function renderSummary(hasData) {
  const links = SECTIONS
    .filter(s => !s.needsData || hasData)
    .map(s => `<a class="settings-summary__link" href="#${s.id}" data-target="${s.id}">${s.label}</a>`)
    .join('');

  return `
    <nav class="settings-summary" id="settings-summary">
      ${links}
    </nav>
  `;
}

/**
 * Render the category management card.
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
        <strong style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Non categorisees</strong>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-2);">
          ${uncategorized.map(s => `<span class="badge badge--neutral">${escapeHtml(s)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="card" id="settings-categories" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Gestion des categories</h3>
        <button class="btn btn--secondary btn--sm" id="settings-auto-categorize">Auto-categoriser</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: var(--space-3);">
        ${catHtml}
        <div style="display: flex; gap: var(--space-2); margin-top: var(--space-2);">
          <input type="text" class="form-input" id="settings-new-category" placeholder="Nouvelle categorie..." style="flex: 1; max-width: 250px;" />
          <button class="btn btn--secondary btn--sm" id="settings-add-category">Ajouter</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the member management card with groups column.
 */
function renderMemberCard(state) {
  return `
    <div class="card" id="settings-members" style="margin-bottom: var(--space-6);">
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
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid var(--color-border);">Appetences</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid var(--color-border);">Groupes</th>
              <th style="padding: 8px 12px; text-align: center; width: 140px; border-bottom: 2px solid var(--color-border);">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.members.map(m => {
              const groupsStr = (m.groups || []).join(', ');
              return `
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
                <td style="padding: 8px 12px;">
                  <span class="member-display" data-field="groups">
                    ${(m.groups || []).map(g => `<span class="badge badge--neutral" style="margin: 1px;">${escapeHtml(g)}</span>`).join(' ') || '<span style="color: var(--color-text-tertiary);">—</span>'}
                  </span>
                  <input class="form-input member-edit-input" data-field="groups" type="text"
                         value="${escapeHtml(groupsStr)}" placeholder="Groupe1, Groupe2"
                         style="display: none; width: 100%; padding: 4px 8px;" />
                </td>
                <td style="padding: 8px 12px; text-align: center; white-space: nowrap;">
                  <button class="btn btn--ghost btn--sm member-edit-btn" title="Modifier">✏️</button>
                  <button class="btn btn--ghost btn--sm member-save-btn" title="Enregistrer" style="display: none;">✅</button>
                  <button class="btn btn--ghost btn--sm member-cancel-btn" title="Annuler" style="display: none;">❌</button>
                  <button class="btn btn--ghost btn--sm member-delete-btn" title="Supprimer">🗑</button>
                </td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Render the thresholds and display settings card.
 */
function renderThresholdsCard(settings) {
  return `
    <div class="card" id="settings-thresholds" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Seuils & Affichage</h3>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6);">
        <div>
          <label style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-1);">
            Seuil d'alerte critique
          </label>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-2);">
            Nombre minimum de Confirmes/Experts requis.
          </p>
          <select class="form-select" id="setting-critical-threshold" style="max-width: 200px;">
            ${[1, 2, 3].map(v => `
              <option value="${v}" ${settings.criticalThreshold === v ? 'selected' : ''}>${v} personne${v > 1 ? 's' : ''}</option>
            `).join('')}
          </select>
        </div>
        <div>
          <label style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-1);">
            Troncature des noms de competence
          </label>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-2);">
            Longueur max. dans les en-tetes de la matrice.
          </p>
          <select class="form-select" id="setting-skill-max-length" style="max-width: 200px;">
            ${[
              { v: 8, l: '8 caracteres' },
              { v: 12, l: '12 caracteres' },
              { v: 16, l: '16 caracteres' },
              { v: 20, l: '20 caracteres' },
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
 */
function renderExportCard(settings) {
  const options = [
    { value: ';', label: 'Point-virgule (;)' },
    { value: ',', label: 'Virgule (,)' },
    { value: 'tab', label: 'Tabulation' },
  ];
  const currentValue = settings.csvDelimiter === '\t' ? 'tab' : settings.csvDelimiter;

  return `
    <div class="card" id="settings-export" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Export CSV</h3>
      </div>
      <div>
        <label style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-2);">
          Separateur CSV
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
 * Render the multi-sources API card.
 */
function renderApiSourcesCard() {
  const sources = loadApiSources();

  const sourceListHtml = sources.length > 0
    ? sources.map(s => `
      <div class="api-source-item" data-source-id="${s.id}">
        <div class="api-source-item__info">
          <strong>${escapeHtml(s.name || 'Sans nom')}</strong>
          <span class="badge badge--info" style="font-size: var(--font-size-xs);">${getSourceTypeLabel(s.type)}</span>
          <span style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 250px; display: inline-block; vertical-align: middle;">
            ${escapeHtml(s.url)}
          </span>
        </div>
        <div class="api-source-item__actions">
          <button class="btn btn--secondary btn--sm source-test-btn" data-source-id="${s.id}">Tester</button>
          <button class="btn btn--primary btn--sm source-import-btn" data-source-id="${s.id}">Importer</button>
          <button class="btn btn--ghost btn--sm source-delete-btn" data-source-id="${s.id}" style="color: var(--color-danger-500);">✕</button>
        </div>
        <div class="api-source__status" id="source-status-${s.id}"></div>
      </div>
    `).join('')
    : '<p style="font-size: var(--font-size-sm); color: var(--color-text-tertiary);">Aucune source configuree.</p>';

  const typeOptions = SOURCE_TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`
  ).join('');

  return `
    <div class="card" id="settings-sources" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Sources externes (API)</h3>
        <span class="badge badge--neutral">${sources.length}</span>
      </div>
      <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-4);">
        Configurez des endpoints JSON pour alimenter la matrice en membres, competences ou groupes.
      </p>

      <div class="api-source-list" id="api-source-list">
        ${sourceListHtml}
      </div>

      <details class="api-source-form-details" style="margin-top: var(--space-4);">
        <summary class="btn btn--secondary btn--sm" style="cursor: pointer;">+ Ajouter une source</summary>
        <div class="api-source-form" style="margin-top: var(--space-3);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
            <div>
              <label style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-1);">Nom</label>
              <input type="text" class="form-input" id="new-source-name" placeholder="Ex: Skills Equipe X" />
            </div>
            <div>
              <label style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-1);">Type</label>
              <select class="form-select" id="new-source-type">${typeOptions}</select>
            </div>
          </div>
          <div style="margin-top: var(--space-3);">
            <label style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-1);">URL</label>
            <input type="url" class="form-input" id="new-source-url" placeholder="https://example.com/api/skills.json" />
          </div>
          <div style="margin-top: var(--space-3);">
            <label style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-1);">Token (optionnel)</label>
            <input type="password" class="form-input" id="new-source-token" placeholder="Bearer token" />
          </div>
          <button class="btn btn--primary btn--sm" id="new-source-save" style="margin-top: var(--space-3);">Enregistrer la source</button>
        </div>
      </details>

      <details style="margin-top: var(--space-4);">
        <summary style="font-size: var(--font-size-xs); color: var(--color-text-secondary); cursor: pointer;">Formats JSON attendus</summary>
        <div style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-2);">
          <div>
            <strong style="font-size: var(--font-size-xs);">Type : Membres + Skills</strong>
            <pre style="font-size: var(--font-size-xs); background: var(--color-bg-tertiary); padding: var(--space-2); border-radius: var(--radius-md); overflow-x: auto;">{ "members": [{ "name": "Alice", "role": "Dev", "groups": ["Tribu X"],
    "skills": { "JavaScript": { "level": 4, "appetence": 2 }, "React": 3 } }] }</pre>
          </div>
          <div>
            <strong style="font-size: var(--font-size-xs);">Type : Liste de skills</strong>
            <pre style="font-size: var(--font-size-xs); background: var(--color-bg-tertiary); padding: var(--space-2); border-radius: var(--radius-md); overflow-x: auto;">{ "skills": ["JavaScript", "React", "Docker", "Kubernetes"] }</pre>
          </div>
          <div>
            <strong style="font-size: var(--font-size-xs);">Type : Groupes</strong>
            <pre style="font-size: var(--font-size-xs); background: var(--color-bg-tertiary); padding: var(--space-2); border-radius: var(--radius-md); overflow-x: auto;">{ "groups": [{ "name": "Mission X", "members": ["Alice", "Bob"] },
             { "name": "Tribu Data", "members": ["Alice", "Charlie"] }] }</pre>
          </div>
        </div>
      </details>
    </div>
  `;
}

/**
 * Render the backup and data management card.
 */
function renderBackupCard(hasData) {
  return `
    <div class="card" id="settings-backup" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Sauvegarde & Donnees</h3>
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
          <button class="btn btn--danger" id="settings-reset-btn">🗑 Reinitialiser toutes les donnees</button>
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
 * @param {HTMLElement} container
 */
function bindSettingsEvents(container) {
  // --- Summary navigation ---
  container.querySelectorAll('.settings-summary__link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(link.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // --- Category management ---
  container.querySelector('#settings-auto-categorize')?.addEventListener('click', () => {
    const state = getState();
    const allSkills = getAllSkillNames(state.members);
    if (allSkills.length === 0) {
      toastWarning('Aucune competence a categoriser. Importez des donnees d\'abord.');
      return;
    }
    const currentCats = state.categories || {};
    const newCats = autoCategorize(allSkills);

    // Construire le comparatif avant / apres
    const renderCatList = (cats) => {
      const entries = Object.entries(cats);
      if (entries.length === 0) return '<em style="color: var(--color-text-tertiary);">Aucune categorie</em>';
      return entries.map(([name, skills]) =>
        `<div style="margin-bottom: var(--space-2);">
          <strong style="color: var(--color-text-primary);">${escapeHtml(name)}</strong>
          <span style="color: var(--color-text-tertiary);"> (${skills.length})</span>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
            ${skills.map(s => `<span class="badge badge--neutral" style="font-size: var(--font-size-xs);">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>`
      ).join('');
    };

    showModal({
      title: 'Auto-categoriser les competences',
      body: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); max-height: 400px; padding: 0 10px; overflow-y: auto;">
          <div>
            <div style="font-weight: var(--font-weight-semibold); color: var(--color-text-secondary); margin-bottom: var(--space-2); font-size: var(--font-size-sm);">Avant</div>
            <div style="padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
              ${renderCatList(currentCats)}
            </div>
          </div>
          <div>
            <div style="font-weight: var(--font-weight-semibold); color: var(--color-primary); margin-bottom: var(--space-2); font-size: var(--font-size-sm);">Apres</div>
            <div style="padding: var(--space-3); background: rgba(99, 102, 241, 0.05); border-radius: var(--radius-md); border: 1px solid var(--color-primary-200);">
              ${renderCatList(newCats)}
            </div>
          </div>
        </div>
      `,
      confirmLabel: 'Appliquer',
      confirmClass: 'btn--primary',
      onConfirm: () => {
        updateCategories(newCats);
        toastSuccess('Categories auto-generees.');
      },
    });
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
    toastSuccess(`Categorie "${name}" ajoutee.`);
  });

  container.querySelectorAll('.category-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const catName = btn.dataset.category;
      const state = getState();
      const cats = { ...state.categories };
      delete cats[catName];
      updateCategories(cats);
      toastSuccess(`Categorie "${catName}" supprimee.`);
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
      const groupsRaw = row.querySelector('.member-edit-input[data-field="groups"]').value.trim();
      const groups = groupsRaw ? groupsRaw.split(',').map(g => g.trim()).filter(Boolean) : [];

      if (!name) {
        toastError('Le nom ne peut pas etre vide.');
        return;
      }

      updateMember(memberId, { name, role, appetences, groups });
      toastSuccess(`Membre "${name}" mis a jour.`);
    });
  });

  container.querySelectorAll('.member-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => renderSettingsView(container));
  });

  container.querySelectorAll('.member-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const memberId = row.dataset.memberId;
      const name = row.querySelector('.member-display[data-field="name"]').textContent;

      const confirmed = await confirm(
        'Supprimer le membre',
        `Supprimer definitivement « ${name} » et toutes ses competences ?`
      );
      if (!confirmed) return;

      removeMember(memberId);
      toastSuccess(`Membre "${name}" supprime.`);
    });
  });

  // --- Thresholds & Display ---
  container.querySelector('#setting-critical-threshold')?.addEventListener('change', (e) => {
    updateSettings({ criticalThreshold: parseInt(e.target.value, 10) });
    toastSuccess('Seuil critique mis a jour.');
  });

  container.querySelector('#setting-skill-max-length')?.addEventListener('change', (e) => {
    updateSettings({ skillNameMaxLength: parseInt(e.target.value, 10) });
    toastSuccess('Troncature mise a jour.');
  });

  // --- CSV delimiter ---
  container.querySelectorAll('input[name="csv-delimiter"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const value = e.target.value === 'tab' ? '\t' : e.target.value;
      updateSettings({ csvDelimiter: value });
      toastSuccess('Separateur CSV mis a jour.');
    });
  });

  // --- API Sources ---
  bindApiSourcesEvents(container);

  // --- Backup & Data ---
  container.querySelector('#settings-export-json')?.addEventListener('click', () => {
    const state = getState();
    const json = exportJSON(state);
    downloadFile(json, 'skills-matrix-backup.json', 'application/json');
    toastSuccess('Backup JSON exporte.');
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
        `Importer ${data.members.length} membre(s) ? Cela remplacera les donnees existantes.`
      );
      if (!confirmed) return;

      const { setState } = await import('../state.js');
      setState(data);
      toastSuccess(`${data.members.length} membre(s) importe(s) depuis JSON.`);
    } catch (err) {
      toastError('Erreur lors de la lecture du fichier.');
    }
    e.target.value = '';
  });

  container.querySelector('#settings-reset-btn')?.addEventListener('click', async () => {
    const confirmed = await confirm(
      'Reinitialiser toutes les donnees',
      'Cette action supprimera definitivement toutes les donnees. Irréversible.'
    );
    if (!confirmed) return;

    const { resetState } = await import('../state.js');
    resetState();
    toastWarning('Toutes les donnees ont ete reinitialisees.');
  });
}

/**
 * Bind events for the API sources section.
 */
function bindApiSourcesEvents(container) {
  const setStatus = (sourceId, msg, type) => {
    const el = container.querySelector(`#source-status-${sourceId}`);
    if (!el) return;
    el.textContent = msg;
    el.className = 'api-source__status';
    if (type) el.classList.add('api-source__status--' + type);
    el.style.display = msg ? 'block' : 'none';
  };

  // Add new source
  container.querySelector('#new-source-save')?.addEventListener('click', () => {
    const name = container.querySelector('#new-source-name')?.value.trim();
    const url = container.querySelector('#new-source-url')?.value.trim();
    const token = container.querySelector('#new-source-token')?.value.trim() || '';
    const type = container.querySelector('#new-source-type')?.value || 'members';

    if (!name || !url) {
      toastError('Nom et URL sont requis.');
      return;
    }

    addApiSource({ name, url, token, type });
    toastSuccess(`Source "${name}" ajoutee.`);
    renderSettingsView(container);
  });

  // Test source
  container.querySelectorAll('.source-test-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sourceId = btn.dataset.sourceId;
      const sources = loadApiSources();
      const source = sources.find(s => s.id === sourceId);
      if (!source) return;

      setStatus(sourceId, 'Connexion en cours...', 'info');
      const result = await testConnection(source.url, source.token, source.type);

      if (result.success) {
        setStatus(sourceId, `OK — ${result.summary}`, 'success');
      } else {
        setStatus(sourceId, result.error, 'error');
      }
    });
  });

  // Import source
  container.querySelectorAll('.source-import-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sourceId = btn.dataset.sourceId;
      const sources = loadApiSources();
      const source = sources.find(s => s.id === sourceId);
      if (!source) return;

      setStatus(sourceId, 'Import en cours...', 'info');
      const result = await testConnection(source.url, source.token, source.type);

      if (!result.success) {
        setStatus(sourceId, result.error, 'error');
        return;
      }

      if (source.type === 'members') {
        const members = convertApiDataToMembers(result.data);
        const confirmed = await confirm(
          'Importer les membres',
          `Importer ${members.length} membre(s) ? Cela remplacera les donnees existantes.`
        );
        if (!confirmed) { setStatus(sourceId, 'Import annule', 'info'); return; }

        replaceMembers(members);
        setStatus(sourceId, `${members.length} membre(s) importes`, 'success');
        toastSuccess(`${members.length} membre(s) importes depuis "${source.name}".`);

      } else if (source.type === 'skills') {
        const skills = convertApiDataToSkills(result.data);
        const state = getState();
        const existingSkills = getAllSkillNames(state.members);
        const newSkills = skills.filter(s => !existingSkills.includes(s));

        if (newSkills.length === 0) {
          setStatus(sourceId, 'Toutes les competences existent deja', 'info');
          return;
        }

        // Ajouter les skills vides a tous les membres existants
        const updatedMembers = state.members.map(m => {
          const memberSkills = { ...m.skills };
          for (const skill of newSkills) {
            if (!memberSkills[skill]) memberSkills[skill] = { level: 0, appetence: 0 };
          }
          return { ...m, skills: memberSkills };
        });
        replaceMembers(updatedMembers);
        setStatus(sourceId, `${newSkills.length} competence(s) ajoutee(s)`, 'success');
        toastSuccess(`${newSkills.length} competence(s) ajoutee(s) depuis "${source.name}".`);

      } else if (source.type === 'groups') {
        const state = getState();
        if (state.members.length === 0) {
          setStatus(sourceId, 'Importez des membres avant les groupes', 'error');
          return;
        }
        const updatedMembers = applyGroupsToMembers(result.data, state.members);
        replaceMembers(updatedMembers);
        const groupCount = result.data.groups.length;
        setStatus(sourceId, `${groupCount} groupe(s) applique(s)`, 'success');
        toastSuccess(`${groupCount} groupe(s) applique(s) depuis "${source.name}".`);
      }
    });
  });

  // Delete source
  container.querySelectorAll('.source-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sourceId = btn.dataset.sourceId;
      removeApiSource(sourceId);
      toastInfo('Source supprimee.');
      renderSettingsView(container);
    });
  });
}

// ============================================================
// Auto-categorization
// ============================================================

/**
 * Auto-categorize skills based on common technology groupings.
 */
function autoCategorize(skills) {
  const rules = [
    { name: 'Frontend', patterns: [/react/i, /vue/i, /angular/i, /css/i, /html/i, /sass/i, /scss/i, /tailwind/i, /bootstrap/i, /next\.?js/i, /nuxt/i, /svelte/i, /typescript/i, /javascript/i, /jquery/i, /webpack/i, /vite/i] },
    { name: 'Backend', patterns: [/node\.?js/i, /express/i, /nestjs/i, /python/i, /venv.?python/i, /django/i, /flask/i, /java\b/i, /spring/i, /\.net/i, /c#/i, /php/i, /laravel/i, /ruby/i, /rails/i, /go\b/i, /rust/i, /kotlin/i] },
    { name: 'Data & IA', patterns: [/sql/i, /postgres/i, /mysql/i, /mongo/i, /redis/i, /elastic/i, /machine.?learning/i, /deep.?learning/i, /tensorflow/i, /pytorch/i, /pandas/i, /\bdata\b/i, /\bbi\b/i, /power.?bi/i, /tableau/i, /\bia\b/i] },
    { name: 'DevOps & CI/CD', patterns: [/docker/i, /kubernetes/i, /k8s/i, /ci.?cd/i, /jenkins/i, /gitlab.?ci/i, /github.?actions/i, /devops/i, /argocd/i, /helm/i] },
    { name: 'Cloud & Infra', patterns: [/aws/i, /azure/i, /gcp/i, /terraform/i, /terragrunt/i, /ansible/i, /openstack/i, /api.?cloud/i, /proxmox/i, /vmware/i, /vagrant/i] },
    { name: 'Observabilite', patterns: [/observa/i, /grafana/i, /prometheus/i, /elk/i, /kibana/i, /logstash/i, /datadog/i, /new.?relic/i, /splunk/i, /monitoring/i, /alerting/i] },
    { name: 'Reseau & Securite', patterns: [/ssh/i, /vpn/i, /firewall/i, /ssl/i, /tls/i, /dns/i, /proxy/i, /nginx/i, /haproxy/i, /reseau/i, /network/i, /securite/i, /security/i, /iam/i, /oauth/i] },
    { name: 'SRE & Pratiques', patterns: [/sre/i, /devex/i, /incident/i, /postmortem/i, /reliability/i, /toil/i, /slo\b/i, /sli\b/i, /sla\b/i, /chaos/i, /on.?call/i] },
    { name: 'Methodo & Soft Skills', patterns: [/agile/i, /scrum/i, /kanban/i, /management/i, /communication/i, /leadership/i, /design.?thinking/i, /product/i, /ux/i, /\bui\b/i, /soft.?skill/i, /coach/i, /mentor/i, /facilitat/i, /okr/i, /lean/i, /safe/i] },
    { name: 'Strategie & Conseil', patterns: [/strateg/i, /conseil/i, /consulting/i, /audit/i, /governance/i, /roadmap/i, /vision/i, /innovation/i, /transformation/i] },
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
