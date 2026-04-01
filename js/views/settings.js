/**
 * Settings view - Application configuration and data management.
 * Provides summary navigation, category/member/group management,
 * multiple API sources, display settings, and backup/restore.
 */

import { getState, updateState, updateCategories, updateSettings, updateMember, removeMember, replaceMembers, addMembers, removeSkill, isEquipeMode, isShareMode } from '../state.js';
import { getAllSkillNames, getAllGroups, getAllRoles, createMember } from '../models/data.js';
import { exportJSON, parseJSON } from '../services/exporter.js';
import {
  loadApiSources, addApiSource, removeApiSource,
  testConnection, convertApiDataToMembers, convertApiDataToSkills,
  applyGroupsToMembers, SOURCE_TYPES, getSourceTypeLabel,
} from '../services/api-source.js';
import { toastSuccess, toastError, toastWarning, toastInfo } from '../components/toast.js';
import { updateCustomTemplate } from '../services/templates.js';
import { saveSharedCategories } from '../services/share.js';
import { confirm, showModal, closeModal } from '../components/modal.js';
import { downloadFile, escapeHtml, debounce, generateId } from '../utils/helpers.js';

// ============================================================
// Helpers
// ============================================================

/**
 * Save the active template to the server immediately.
 * In share mode, saves only categories via the share token.
 * Prevents stale server data from overwriting local changes on reload.
 */
function saveActiveTemplate() {
  if (isShareMode()) {
    void saveReferentiel();
    return;
  }
  const current = getState();
  if (!current.activeTemplate) return;
  updateCustomTemplate(current.activeTemplate.id, {
    members: current.members,
    categories: current.categories || {},
  });
}

/**
 * Sauvegarde le référentiel (catégories) sur le serveur en mode partage.
 * Appel direct, sans debounce, depuis chaque handler de modification.
 */
async function saveReferentiel() {
  if (!isShareMode()) return;
  const { shareToken, categories, members } = getState();
  if (!shareToken) return;
  const ok = await saveSharedCategories(shareToken, categories || {}, members || []);
  if (ok) {
    toastSuccess('Référentiel sauvegardé.');
  } else {
    toastError('Erreur lors de la sauvegarde — réessayez.');
  }
}

// ============================================================
// Sections definition for summary navigation
// ============================================================

const SECTIONS = [
  { id: 'settings-categories', label: 'Categories', needsData: true },
  { id: 'settings-members', label: 'Membres', needsData: true },
  { id: 'settings-objectives', label: 'Objectifs', needsData: true },
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
 * In share mode, shows only the category management section.
 * @param {HTMLElement} container - The view container element
 */
export function renderSettingsView(container) {
  if (isShareMode()) {
    renderShareReferentielView(container);
    return;
  }

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

    ${hasData ? renderObjectivesCard(state) : ''}

    ${renderThresholdsCard(settings)}

    ${renderExportCard(settings)}

    ${renderApiSourcesCard()}

    ${renderBackupCard(hasData)}
  `;

  bindSettingsEvents(container);
}

/**
 * Render a simplified view for share mode — only category/skill management.
 * @param {HTMLElement} container
 */
function renderShareReferentielView(container) {
  const state = getState();
  const hasData = state.members.length > 0;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Référentiel de compétences</h1>
        <p class="page-header__subtitle">Modifiez les catégories et compétences — les changements sont sauvegardés pour tous</p>
      </div>
    </div>

    ${hasData ? renderCategoryCard(state) : `
      <div class="card">
        <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
          Aucune donnée disponible dans ce partage.
        </p>
      </div>
    `}
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
      <div class="cat-card" data-category="${escapeHtml(catName)}" draggable="true">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2);">
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="cat-card__handle" aria-hidden="true">⠿</span>
            <strong class="cat-card__title" title="Cliquer pour renommer" style="font-size: var(--font-size-sm); cursor: text;">${escapeHtml(catName)}</strong>
          </div>
          <button class="btn btn--ghost btn--sm category-remove-btn" data-category="${escapeHtml(catName)}">✕</button>
        </div>
        <div class="skill-drop-zone" data-category="${escapeHtml(catName)}" style="display: flex; flex-wrap: wrap; gap: var(--space-1); min-height: 28px;">
          ${skills.map(s => `<span class="badge badge--info skill-remove-badge" draggable="true" data-category="${escapeHtml(catName)}" data-skill="${escapeHtml(s)}" title="Glisser pour réordonner · Cliquer pour retirer" style="cursor: grab;">${escapeHtml(s)}</span>`).join('')}
        </div>
        <div style="display: flex; gap: var(--space-1); margin-top: var(--space-2);">
          <input type="text" class="form-input add-skill-input" data-category="${escapeHtml(catName)}" placeholder="Nouvelle compétence..." style="flex: 1; font-size: var(--font-size-xs); padding: 4px 8px;" />
          <button class="btn btn--ghost btn--sm add-skill-btn" data-category="${escapeHtml(catName)}">+</button>
        </div>
      </div>
    `;
  }

  if (uncategorized.length > 0) {
    catHtml += `
      <div class="settings-categories-grid__uncategorized" style="padding: var(--space-3); background: var(--color-bg-tertiary); border-radius: var(--radius-lg); border: 1px dashed var(--color-border);">
        <strong style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Non catégorisées</strong>
        <div class="skill-drop-zone" data-category="__uncategorized__" style="display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-2); min-height: 28px;">
          ${uncategorized.map(s => `<span class="badge badge--neutral skill-uncategorized-badge skill-remove-badge" draggable="true" data-category="__uncategorized__" data-skill="${escapeHtml(s)}" title="Glisser vers une catégorie · Cliquer pour assigner"><span class="skill-move-btn" data-skill="${escapeHtml(s)}">${escapeHtml(s)}</span><button class="skill-delete-btn" data-skill="${escapeHtml(s)}" aria-label="Supprimer cette compétence" title="Supprimer cette compétence">✕</button></span>`).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="card" id="settings-categories" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Gestion des categories</h3>
        <div style="display: flex; gap: var(--space-2);">
          <button class="btn btn--ghost btn--sm" id="settings-copy-slack" title="Copier le référentiel formaté pour Slack">📋 Copier pour Slack</button>
          <button class="btn btn--secondary btn--sm" id="settings-auto-categorize">Auto-categoriser</button>
        </div>
      </div>
      <div class="settings-categories-grid">
        ${catHtml}
      </div>
      <div style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
        <input type="text" class="form-input" id="settings-new-category" placeholder="Nouvelle categorie..." style="flex: 1; max-width: 250px;" />
        <button class="btn btn--secondary btn--sm" id="settings-add-category">Ajouter</button>
      </div>
    </div>
  `;
}

/**
 * Render the member management card as a 2-column grid of cards.
 */
function renderMemberCard(state) {
  const membersHtml = state.members.map(m => {
    const groupsStr = (m.groups || []).join(', ');
    return `
      <div class="settings-member-card" data-member-id="${m.id}">
        <div class="settings-member-card__header">
          <div class="settings-member-card__avatar">${escapeHtml(m.name.charAt(0))}</div>
          <div class="settings-member-card__identity">
            <span class="member-display settings-member-card__name" data-field="name">${escapeHtml(m.name)}</span>
            <input class="form-input member-edit-input" data-field="name" type="text"
                   value="${escapeHtml(m.name)}" style="display: none;" />
            <span class="member-display settings-member-card__role" data-field="role">${escapeHtml(m.role)}</span>
            <input class="form-input member-edit-input" data-field="role" type="text"
                   value="${escapeHtml(m.role)}" style="display: none;" />
          </div>
          <div class="settings-member-card__actions">
            <button class="btn btn--ghost btn--sm member-edit-btn" aria-label="Modifier le membre" title="Modifier">✏️</button>
            <button class="btn btn--ghost btn--sm member-save-btn" aria-label="Enregistrer les modifications" title="Enregistrer" style="display: none;">✅</button>
            <button class="btn btn--ghost btn--sm member-cancel-btn" aria-label="Annuler les modifications" title="Annuler" style="display: none;">❌</button>
            <button class="btn btn--ghost btn--sm member-delete-btn" aria-label="Supprimer le membre" title="Supprimer">🗑</button>
          </div>
        </div>
        <div class="settings-member-card__fields">
          <div class="settings-member-card__field">
            <span class="settings-member-card__label">Appétences</span>
            <span class="member-display" data-field="appetences">${escapeHtml(m.appetences || '—')}</span>
            <input class="form-input member-edit-input" data-field="appetences" type="text"
                   value="${escapeHtml(m.appetences)}" style="display: none;" />
          </div>
          <div class="settings-member-card__field">
            <span class="settings-member-card__label">Groupes</span>
            <span class="member-display" data-field="groups">
              ${(m.groups || []).map(g => `<span class="badge badge--neutral" style="margin: 1px;">${escapeHtml(g)}</span>`).join(' ') || '<span style="color: var(--color-text-tertiary);">—</span>'}
            </span>
            <input class="form-input member-edit-input" data-field="groups" type="text"
                   value="${escapeHtml(groupsStr)}" placeholder="Groupe1, Groupe2"
                   style="display: none;" />
          </div>
        </div>
      </div>
    `;
  }).join('');

  const groups = getAllGroups(state.members);
  const roles = getAllRoles(state.members);
  const groupSuggestions = groups.map(g => `<option value="${escapeHtml(g)}">`).join('');
  const roleSuggestions = roles.map(r => `<option value="${escapeHtml(r)}">`).join('');

  return `
    <div class="card" id="settings-members" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Gestion des membres</h3>
        <span class="badge badge--info">${state.members.length} membre(s)</span>
      </div>
      <div class="settings-members-grid">
        ${membersHtml}
      </div>
      <datalist id="member-groups-suggestions">${groupSuggestions}</datalist>
      <datalist id="member-role-suggestions">${roleSuggestions}</datalist>
      <div class="member-add-form" style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
        <p style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3);">Ajouter un membre</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: var(--space-2); align-items: end;">
          <div>
            <label style="font-size: var(--font-size-xs); color: var(--color-text-secondary); display: block; margin-bottom: 4px;">Nom <span style="color: var(--color-danger-400);">*</span></label>
            <input type="text" class="form-input" id="member-add-name" placeholder="Prénom Nom" />
          </div>
          <div>
            <label style="font-size: var(--font-size-xs); color: var(--color-text-secondary); display: block; margin-bottom: 4px;">Rôle</label>
            <input type="text" class="form-input" id="member-add-role" placeholder="Dev, PO..." list="member-role-suggestions" />
          </div>
          <div>
            <label style="font-size: var(--font-size-xs); color: var(--color-text-secondary); display: block; margin-bottom: 4px;">Groupes</label>
            <input type="text" class="form-input" id="member-add-groups" placeholder="Groupe1, Groupe2" list="member-groups-suggestions" />
          </div>
          <button class="btn btn--primary btn--sm" id="member-add-btn" style="white-space: nowrap;">+ Ajouter</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the objectives management card.
 * Allows defining target thresholds per skill (min experts/confirmed).
 * @param {Object} state - Application state
 * @returns {string} Card HTML
 */
function renderObjectivesCard(state) {
  const allSkills = getAllSkillNames(state.members);
  const objectives = state.objectives || {};

  // Compétences avec un objectif défini
  const defined = Object.entries(objectives).filter(([skill]) => allSkills.includes(skill));
  // Compétences sans objectif
  const available = allSkills.filter(s => !objectives[s]);

  return `
    <div class="card" id="settings-objectives" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Objectifs d'équipe</h3>
        <span class="badge badge--info">${defined.length} défini(s)</span>
      </div>
      <div style="padding: 0 var(--space-5) var(--space-4); font-size: var(--font-size-xs); color: var(--color-text-secondary);">
        Définissez un nombre minimum de Confirmés/Experts par compétence. La progression s'affiche dans le Dashboard.
      </div>
      <div class="objectives-settings-list" style="padding: 0 var(--space-5) var(--space-4);">
        ${defined.map(([skill, obj]) => `
          <div class="objective-setting-row" data-skill="${escapeHtml(skill)}">
            <span class="objective-setting-row__name">${escapeHtml(skill)}</span>
            <label class="objective-setting-row__label">
              Cible :
              <select class="form-select objective-target-select" data-skill="${escapeHtml(skill)}" style="width: 80px;">
                ${[1, 2, 3, 4, 5].map(v => `<option value="${v}" ${(obj.minExperts || 2) === v ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </label>
            <button class="btn btn--ghost btn--sm objective-remove-btn" data-skill="${escapeHtml(skill)}" title="Retirer cet objectif">✕</button>
          </div>
        `).join('')}
      </div>
      ${available.length > 0 ? `
        <div style="padding: 0 var(--space-5) var(--space-5); display: flex; gap: var(--space-2); align-items: center;">
          <select class="form-select" id="objective-add-skill" style="flex: 1; max-width: 300px;">
            <option value="">Ajouter une compétence...</option>
            ${available.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
          </select>
          <button class="btn btn--sm btn--primary" id="objective-add-btn">+ Ajouter</button>
        </div>
      ` : ''}
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
  // --- Copier pour Slack ---
  container.querySelector('#settings-copy-slack')?.addEventListener('click', () => {
    const { categories } = getState();
    const lines = Object.entries(categories || {})
      .filter(([, skills]) => skills.length > 0)
      .map(([cat, skills]) => `## ${cat}\n${skills.map(s => `- ${s}`).join('\n')}`);
    if (!lines.length) { toastWarning('Aucune catégorie à copier.'); return; }
    navigator.clipboard.writeText(lines.join('\n\n'))
      .then(() => toastSuccess('Référentiel copié pour Slack !'))
      .catch(() => toastError('Impossible d\'accéder au presse-papiers.'));
  });

  // --- Drag and drop categories / skills ---
  initDragDrop(container);

  // --- Renommage inline des catégories ---
  container.querySelectorAll('.cat-card__title').forEach(title => {
    title.addEventListener('click', () => {
      const card = title.closest('.cat-card');
      const oldName = card.dataset.category;
      let cancelled = false;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = oldName;
      input.className = 'form-input';
      input.style.cssText = 'font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); padding: 2px 6px; height: 24px; min-width: 80px;';
      title.replaceWith(input);
      input.select();

      const commit = () => {
        if (cancelled) return;
        const newName = input.value.trim();
        if (!newName || newName === oldName) { input.replaceWith(title); return; }
        const state = getState();
        if (state.categories[newName] !== undefined) {
          toastError(`La catégorie « ${newName} » existe déjà.`);
          setTimeout(() => input.select(), 0);
          return;
        }
        const entries = Object.entries(state.categories);
        const idx = entries.findIndex(([k]) => k === oldName);
        if (idx < 0) return;
        entries[idx] = [newName, entries[idx][1]];
        updateCategories(Object.fromEntries(entries));
        saveActiveTemplate();
        toastSuccess(`Catégorie renommée en « ${newName} ».`);
      };

      input.addEventListener('blur', commit);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { cancelled = true; input.replaceWith(title); }
      });
    });
  });

  // --- Summary navigation (scroll + scrollspy) ---
  const summaryLinks = container.querySelectorAll('.settings-summary__link');

  const setActiveLink = (id) => {
    summaryLinks.forEach(l => {
      l.classList.toggle('settings-summary__link--active', l.dataset.target === id);
    });
  };

  summaryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveLink(link.dataset.target);
      const target = document.getElementById(link.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Scrollspy : active le lien correspondant à la section visible
  const sections = [...summaryLinks]
    .map(l => document.getElementById(l.dataset.target))
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveLink(entry.target.id);
      });
    }, { rootMargin: '-10% 0px -75% 0px', threshold: 0 });

    sections.forEach(s => observer.observe(s));

    // Nettoyage quand la vue est remplacée (re-render ou changement de vue)
    const nav = container.querySelector('#settings-summary');
    if (nav) {
      const mo = new MutationObserver(() => observer.disconnect());
      mo.observe(nav.parentNode || container, { childList: true, subtree: false });
    }
  }

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
        saveActiveTemplate();
        toastSuccess('Categories auto-generees et sauvegardees.');
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
    saveActiveTemplate();
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
      saveActiveTemplate();
      toastSuccess(`Categorie "${catName}" supprimee.`);
    });
  });

  // Ajouter une competence dans une categorie
  container.querySelectorAll('.add-skill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const catName = btn.dataset.category;
      const input = container.querySelector(`.add-skill-input[data-category="${catName}"]`);
      const skillName = input.value.trim();
      if (!skillName) return;

      const state = getState();
      const cats = { ...state.categories };
      if (!cats[catName]) cats[catName] = [];
      if (cats[catName].includes(skillName)) {
        toastWarning(`« ${skillName} » existe deja dans ${catName}.`);
        return;
      }
      cats[catName] = [...cats[catName], skillName];
      updateCategories(cats);

      // Ajouter la competence a tous les membres (level 0, appetence 0)
      const members = state.members.map(m => {
        if (!m.skills[skillName]) {
          return { ...m, skills: { ...m.skills, [skillName]: { level: 0, appetence: 0 } } };
        }
        return m;
      });
      replaceMembers(members);
      saveActiveTemplate();
      toastSuccess(`Compétence « ${skillName} » ajoutée dans ${catName}.`);

      // Re-focaliser l'input après le re-rendu déclenché par les mutations d'état
      setTimeout(() => {
        container.querySelector(`.add-skill-input[data-category="${catName}"]`)?.focus();
      }, 0);
    });
  });

  // Valider avec Enter dans l'input de competence
  container.querySelectorAll('.add-skill-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        container.querySelector(`.add-skill-btn[data-category="${input.dataset.category}"]`)?.click();
      }
    });
  });

  // Retirer une competence d'une categorie (clic sur le badge)
  container.querySelectorAll('.skill-remove-badge').forEach(badge => {
    badge.addEventListener('click', () => {
      const catName = badge.dataset.category;
      const skillName = badge.dataset.skill;
      const state = getState();
      const cats = { ...state.categories };
      if (cats[catName]) {
        cats[catName] = cats[catName].filter(s => s !== skillName);
        if (cats[catName].length === 0) delete cats[catName];
        updateCategories(cats);
        saveActiveTemplate();
        toastSuccess(`« ${skillName} » retire de ${catName}.`);
      }
    });
  });

  // Assigner une competence non categorisee a une categorie (clic sur le texte)
  container.querySelectorAll('.skill-move-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skillName = btn.dataset.skill;
      const state = getState();
      const cats = Object.keys(state.categories || {});

      if (cats.length === 0) {
        toastWarning('Aucune categorie disponible. Creez-en une d\'abord.');
        return;
      }

      const optionsHtml = cats.map(c =>
        `<button class="btn btn--secondary btn--sm cat-assign-btn" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
      ).join('');

      const backdrop = showModal({
        title: `Assigner « ${skillName} »`,
        body: `
          <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-3);">
            Choisissez la categorie de destination :
          </p>
          <div class="cat-assign-list">${optionsHtml}</div>
        `,
        confirmLabel: 'Annuler',
        confirmClass: 'btn--ghost',
        onConfirm: () => {},
      });

      backdrop.querySelectorAll('.cat-assign-btn').forEach(catBtn => {
        catBtn.addEventListener('click', () => {
          const catName = catBtn.dataset.category;
          const current = getState();
          const updated = { ...current.categories };
          if (!updated[catName].includes(skillName)) {
            updated[catName] = [...updated[catName], skillName];
            updateCategories(updated);
            saveActiveTemplate();
            toastSuccess(`« ${skillName} » assignee a "${catName}".`);
          }
          closeModal();
        });
      });
    });
  });

  // Supprimer une competence non categorisee (clic sur ✕)
  container.querySelectorAll('.skill-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const skillName = btn.dataset.skill;
      const confirmed = await confirm(
        'Supprimer la competence',
        `Supprimer « ${skillName} » de tous les membres ? Cette action est irreversible.`
      );
      if (!confirmed) return;
      removeSkill(skillName);
      saveActiveTemplate();
      toastSuccess(`Compétence « ${skillName} » supprimée.`);
    });
  });

  // --- Member management ---
  container.querySelectorAll('.member-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.settings-member-card');
      card.querySelectorAll('.member-display').forEach(el => el.style.display = 'none');
      card.querySelectorAll('.member-edit-input').forEach(el => el.style.display = '');
      card.querySelector('.member-edit-btn').style.display = 'none';
      card.querySelector('.member-delete-btn').style.display = 'none';
      card.querySelector('.member-save-btn').style.display = '';
      card.querySelector('.member-cancel-btn').style.display = '';
    });
  });

  container.querySelectorAll('.member-save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.settings-member-card');
      const memberId = card.dataset.memberId;
      const name = card.querySelector('.member-edit-input[data-field="name"]').value.trim();
      const role = card.querySelector('.member-edit-input[data-field="role"]').value.trim();
      const appetences = card.querySelector('.member-edit-input[data-field="appetences"]').value.trim();
      const groupsRaw = card.querySelector('.member-edit-input[data-field="groups"]').value.trim();
      const groups = groupsRaw ? groupsRaw.split(',').map(g => g.trim()).filter(Boolean) : [];

      if (!name) {
        toastError('Le nom ne peut pas etre vide.');
        return;
      }

      updateMember(memberId, { name, role, appetences, groups });
      saveActiveTemplate();
      toastSuccess(`Membre "${name}" mis a jour.`);
    });
  });

  container.querySelectorAll('.member-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => renderSettingsView(container));
  });

  container.querySelectorAll('.member-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.settings-member-card');
      const memberId = card.dataset.memberId;
      const name = card.querySelector('.member-display[data-field="name"]').textContent;

      const confirmed = await confirm(
        'Supprimer le membre',
        `Supprimer definitivement « ${name} » et toutes ses competences ?`
      );
      if (!confirmed) return;

      removeMember(memberId);
      saveActiveTemplate();
      toastSuccess(`Membre "${name}" supprime.`);
    });
  });

  // --- Add member ---
  const memberAddBtn = container.querySelector('#member-add-btn');
  memberAddBtn?.addEventListener('click', () => {
    const name = container.querySelector('#member-add-name')?.value.trim();
    if (!name) {
      toastError('Le nom est obligatoire.');
      container.querySelector('#member-add-name')?.focus();
      return;
    }
    const role = container.querySelector('#member-add-role')?.value.trim() || '';
    const groupsRaw = container.querySelector('#member-add-groups')?.value.trim() || '';
    const groups = groupsRaw ? groupsRaw.split(',').map(g => g.trim()).filter(Boolean) : [];

    const state = getState();
    const allSkillNames = getAllSkillNames(state.members);
    const skills = Object.fromEntries(allSkillNames.map(s => [s, { level: 0, appetence: 0 }]));

    const member = createMember({ name, role, groups, skills });
    addMembers([member]);
    saveActiveTemplate();
    toastSuccess(`Membre « ${name} » ajouté.`);
  });

  container.querySelector('#member-add-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') memberAddBtn?.click();
  });

  // --- Objectifs d'équipe ---
  container.querySelector('#objective-add-btn')?.addEventListener('click', () => {
    const select = container.querySelector('#objective-add-skill');
    const skill = select?.value;
    if (!skill) return;
    const state = getState();
    const objectives = { ...state.objectives, [skill]: { minExperts: 2 } };
    updateState({ objectives });
    saveActiveTemplate();
    toastSuccess(`Objectif ajouté pour « ${skill} ».`);
  });

  container.querySelectorAll('.objective-target-select').forEach(select => {
    select.addEventListener('change', () => {
      const skill = select.dataset.skill;
      const val = parseInt(select.value, 10);
      const state = getState();
      const objectives = { ...state.objectives, [skill]: { minExperts: val } };
      updateState({ objectives });
      saveActiveTemplate();
    });
  });

  container.querySelectorAll('.objective-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skill = btn.dataset.skill;
      const state = getState();
      const objectives = { ...state.objectives };
      delete objectives[skill];
      updateState({ objectives });
      saveActiveTemplate();
      toastSuccess(`Objectif retiré pour « ${skill} ».`);
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
        setStatus(sourceId, `${newSkills.length} compétence(s) ajoutée(s)`, 'success');
        toastSuccess(`${newSkills.length} compétence(s) ajoutée(s) depuis "${source.name}".`);

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
// Drag and drop — categories and skills
// ============================================================

/**
 * Enable drag-and-drop reordering for category cards and skill badges.
 * - Drag a category card handle → reorder categories (impacts column groups in the matrix)
 * - Drag a skill badge → reorder within category or move to another category
 * @param {HTMLElement} container
 */
function initDragDrop(container) {
  let drag = null; // { type: 'cat'|'skill', category, skill? }

  const clearFeedback = () => {
    container.querySelectorAll('.cat-card--drag-over, .skill-drop-zone--drag-over')
      .forEach(el => el.classList.remove('cat-card--drag-over', 'skill-drop-zone--drag-over'));
  };

  // Register skill badges FIRST so stopPropagation prevents card dragstart
  container.querySelectorAll('.skill-remove-badge[draggable]').forEach(badge => {
    badge.addEventListener('dragstart', e => {
      drag = { type: 'skill', category: badge.dataset.category, skill: badge.dataset.skill };
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation();
    });
  });

  // Category cards
  container.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      drag = { type: 'cat', category: card.dataset.category };
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => card.classList.add('cat-card--dragging'), 0);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('cat-card--dragging');
      clearFeedback();
      drag = null;
    });
    card.addEventListener('dragover', e => {
      if (!drag || drag.type !== 'cat' || card.dataset.category === drag.category) return;
      e.preventDefault();
      clearFeedback();
      card.classList.add('cat-card--drag-over');
    });
    card.addEventListener('drop', e => {
      e.preventDefault();
      if (!drag || drag.type !== 'cat') return;
      clearFeedback();
      const fromCat = drag.category;
      const toCat = card.dataset.category;
      if (fromCat === toCat) return;
      const entries = Object.entries(getState().categories);
      const fi = entries.findIndex(([k]) => k === fromCat);
      const ti = entries.findIndex(([k]) => k === toCat);
      if (fi < 0 || ti < 0) return;
      const [moved] = entries.splice(fi, 1);
      entries.splice(ti, 0, moved);
      const newOrder = entries.map(([k]) => k);
      updateCategories(Object.fromEntries(entries));
      saveActiveTemplate();
      if (isEquipeMode()) {
        fetch('/api/categories/order', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: newOrder }),
        });
      }
      drag = null;
    });
  });

  // Skill drop zones
  container.querySelectorAll('.skill-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => {
      if (!drag || drag.type !== 'skill') return;
      e.preventDefault();
      e.stopPropagation();
      clearFeedback();
      zone.classList.add('skill-drop-zone--drag-over');
    });
    zone.addEventListener('dragleave', e => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('skill-drop-zone--drag-over');
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      if (!drag || drag.type !== 'skill') return;
      e.stopPropagation();
      zone.classList.remove('skill-drop-zone--drag-over');
      const { category: fromCat, skill } = drag;
      const toCat = zone.dataset.category;
      const cats = JSON.parse(JSON.stringify(getState().categories));
      const over = e.target.closest('.skill-remove-badge[data-skill]');

      if (fromCat === toCat && toCat !== '__uncategorized__') {
        // Réordonnement dans la même catégorie
        const list = cats[toCat];
        if (!list) { drag = null; return; }
        const fromIdx = list.indexOf(skill);
        const toIdx = over && over.dataset.skill !== skill ? list.indexOf(over.dataset.skill) : -1;
        if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) { drag = null; return; }
        list.splice(fromIdx, 1);
        list.splice(toIdx, 0, skill);
        updateCategories(cats);
        saveActiveTemplate();
        drag = null;
        return;
      }

      // Déplacement entre catégories
      if (fromCat !== '__uncategorized__' && cats[fromCat]) {
        cats[fromCat] = cats[fromCat].filter(s => s !== skill);
        if (cats[fromCat].length === 0) delete cats[fromCat];
      }
      if (toCat !== '__uncategorized__') {
        if (!cats[toCat]) cats[toCat] = [];
        if (!cats[toCat].includes(skill)) {
          const idx = over ? cats[toCat].indexOf(over.dataset.skill) : -1;
          idx >= 0 ? cats[toCat].splice(idx, 0, skill) : cats[toCat].push(skill);
        }
      }
      updateCategories(cats);
      saveActiveTemplate();
      drag = null;
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
