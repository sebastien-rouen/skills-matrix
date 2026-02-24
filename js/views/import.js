/**
 * Import view - Bulk data import via paste (CSV/TSV).
 * Provides a textarea, preview, and import actions.
 */

import { getState, addMembers, replaceMembers, updateCategories, updateState } from '../state.js';
import { navigateTo } from '../components/sidebar.js';
import { parseImportData, validateImport, generateTemplate } from '../services/importer.js';
import { buildCategories, getAllSkillNames } from '../models/data.js';
import { toastSuccess } from '../components/toast.js';
import { confirm } from '../components/modal.js';
import { downloadFile, escapeHtml, SKILL_LEVELS, APPETENCE_LEVELS } from '../utils/helpers.js';
import { getDemoScenarios } from '../services/demos.js';

/** @type {Object|null} Last parse result for preview */
let lastParseResult = null;

/**
 * Render the import view.
 * @param {HTMLElement} container - The view container element
 */
export function renderImportView(container) {
  const state = getState();
  const hasData = state.members.length > 0;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Import de données</h1>
        <p class="page-header__subtitle">Collez vos données depuis Excel, Google Sheets ou un fichier CSV</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--secondary btn--sm" id="import-template-btn">
          📄 Télécharger le template
        </button>
      </div>
    </div>

    <!-- Demo Scenarios -->
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">🎮 Jeux de données de démonstration</h3>
        <button class="btn btn--ghost btn--sm" id="toggle-demos-btn">Afficher / Masquer</button>
      </div>
      <div id="demo-scenarios" style="display: ${hasData ? 'none' : 'block'};">
        <p style="margin-bottom: var(--space-4); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
          Chargez un scénario pré-construit pour explorer les fonctionnalités de l'application. Chaque démo illustre une situation d'équipe différente avec des conseils adaptés.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: var(--space-4);">
          ${getDemoScenarios().map(demo => `
            <div class="card card--flat" style="border: 2px solid var(--color-border); padding: var(--space-4); transition: all var(--transition-fast);"
                 onmouseover="this.style.borderColor='var(--color-primary-400)'"
                 onmouseout="this.style.borderColor='var(--color-border)'">
              <h4 style="font-size: var(--font-size-base); margin-bottom: var(--space-2);">${demo.title}</h4>
              <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-3); line-height: 1.5;">
                ${demo.description}
              </p>
              <div style="margin-bottom: var(--space-3);">
                ${demo.advice.slice(0, 2).map(a => `
                  <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-1); font-size: 11px; color: var(--color-text-secondary); line-height: 1.4;">
                    <span style="color: var(--color-primary-500); flex-shrink: 0;">💡</span>
                    <span>${a}</span>
                  </div>
                `).join('')}
                ${demo.advice.length > 2 ? `<div style="font-size: 11px; color: var(--color-text-tertiary); margin-top: var(--space-1);">+ ${demo.advice.length - 2} autre(s) conseil(s)…</div>` : ''}
              </div>
              <button class="btn btn--primary btn--sm" data-demo-id="${demo.id}" style="width: 100%;">
                Charger cette démo
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Format Guide -->
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">📋 Format attendu</h3>
        <button class="btn btn--ghost btn--sm" id="toggle-guide-btn">Afficher / Masquer</button>
      </div>
      <div id="format-guide" style="display: none;">
        <p style="margin-bottom: var(--space-3); font-size: var(--font-size-sm);">
          La première ligne contient les en-têtes. Les trois premières colonnes sont <strong>Nom</strong>, <strong>Ownership</strong> et <strong>Appétences</strong>.<br>
          Les colonnes suivantes sont les compétences. Chaque cellule contient <code>niveau/appétence</code>.
        </p>
        <div style="overflow-x: auto; margin-bottom: var(--space-4);">
          <table style="font-size: var(--font-size-xs); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <thead>
              <tr style="background: var(--color-bg-tertiary);">
                <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--color-border);">Nom</th>
                <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--color-border);">Ownership</th>
                <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--color-border);">Appétences</th>
                <th style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--color-border);">JavaScript</th>
                <th style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--color-border);">React</th>
                <th style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--color-border);">Python</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 6px 12px; border-bottom: 1px solid var(--color-border-light);">Jean Dupont</td>
                <td style="padding: 6px 12px; border-bottom: 1px solid var(--color-border-light);">Développeur</td>
                <td style="padding: 6px 12px; border-bottom: 1px solid var(--color-border-light);">IA, Cloud</td>
                <td style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--color-border-light);">4/3</td>
                <td style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--color-border-light);">3/2</td>
                <td style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--color-border-light);">1/1</td>
              </tr>
              <tr>
                <td style="padding: 6px 12px;">Marie Martin</td>
                <td style="padding: 6px 12px;">Tech Lead</td>
                <td style="padding: 6px 12px;">Architecture, DevOps</td>
                <td style="padding: 6px 12px; text-align: center;">3/2</td>
                <td style="padding: 6px 12px; text-align: center;">4/3</td>
                <td style="padding: 6px 12px; text-align: center;">2/0</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); font-size: var(--font-size-xs);">
          <div>
            <strong>Niveaux de compétence :</strong>
            <ul style="margin-top: var(--space-1); list-style: none; padding: 0;">
              ${SKILL_LEVELS.map(l => `
                <li style="display: flex; align-items: center; gap: 6px; padding: 2px 0;">
                  <span style="display: inline-block; width: 14px; height: 14px; border-radius: 3px; background: ${l.color}; border: 1px solid rgba(0,0,0,.08);"></span>
                  ${l.value} = ${l.label}
                </li>
              `).join('')}
            </ul>
          </div>
          <div>
            <strong>Niveaux d'appétence :</strong>
            <ul style="margin-top: var(--space-1); list-style: none; padding: 0;">
              ${APPETENCE_LEVELS.map(a => `
                <li style="padding: 2px 0;">${a.value} = ${a.label} ${a.icon}</li>
              `).join('')}
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Paste Area -->
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Collez vos données ici</h3>
      </div>
      <textarea
        class="form-textarea"
        id="import-textarea"
        placeholder="Collez ici le contenu copié depuis Excel, Google Sheets ou un fichier CSV...

Nom;Ownership;Appétences;JavaScript;React;Python
Jean Dupont;Développeur;IA, Cloud;4/3;3/2;1/1
Marie Martin;Tech Lead;Architecture, DevOps;3/2;4/3;2/0"
        rows="12"
      ></textarea>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-3);">
        <span id="import-status" style="font-size: var(--font-size-sm); color: var(--color-text-secondary);"></span>
        <div style="display: flex; gap: var(--space-2);">
          <button class="btn btn--secondary" id="import-preview-btn">Prévisualiser</button>
          <button class="btn btn--primary" id="import-add-btn" disabled>Ajouter aux données</button>
          <button class="btn btn--primary" id="import-replace-btn" disabled>Remplacer les données</button>
        </div>
      </div>
    </div>

    <!-- Preview Area -->
    <div id="import-preview" style="display: none;">
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">Prévisualisation</h3>
          <span id="preview-summary" class="badge badge--info"></span>
        </div>
        <div id="preview-content" style="overflow-x: auto; max-height: 400px;"></div>
        <div id="preview-errors" style="margin-top: var(--space-3);"></div>
      </div>
    </div>

  `;

  bindImportEvents(container);
}

/**
 * Bind all events for the import view.
 * @param {HTMLElement} container - The view container element
 */
function bindImportEvents(container) {
  const textarea = container.querySelector('#import-textarea');
  const previewBtn = container.querySelector('#import-preview-btn');
  const addBtn = container.querySelector('#import-add-btn');
  const replaceBtn = container.querySelector('#import-replace-btn');
  const templateBtn = container.querySelector('#import-template-btn');
  const toggleGuideBtn = container.querySelector('#toggle-guide-btn');
  const toggleDemosBtn = container.querySelector('#toggle-demos-btn');

  toggleGuideBtn?.addEventListener('click', () => {
    const guide = container.querySelector('#format-guide');
    guide.style.display = guide.style.display === 'none' ? 'block' : 'none';
  });

  toggleDemosBtn?.addEventListener('click', () => {
    const demos = container.querySelector('#demo-scenarios');
    demos.style.display = demos.style.display === 'none' ? 'block' : 'none';
  });

  // Demo scenario buttons
  container.querySelectorAll('[data-demo-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const demoId = btn.dataset.demoId;
      const scenarios = getDemoScenarios();
      const scenario = scenarios.find(s => s.id === demoId);
      if (!scenario) return;

      const state = getState();
      if (state.members.length > 0) {
        const confirmed = await confirm(
          'Charger la démo',
          `Cela remplacera toutes les données actuelles par le scénario « ${scenario.title} ». Continuer ?`
        );
        if (!confirmed) return;
      }

      const { members, categories } = scenario.load();
      replaceMembers(members);
      updateCategories(categories);
      // Store active demo ID for dashboard advice
      updateState({ activeDemo: demoId });
      toastSuccess(`Démo « ${scenario.title} » chargée avec succès.`);
      // Redirect to dashboard to see the results
      navigateTo('dashboard');
    });
  });

  previewBtn?.addEventListener('click', () => {
    const text = textarea.value;
    lastParseResult = parseImportData(text);
    const validation = validateImport(lastParseResult);
    showPreview(container, lastParseResult, validation);

    addBtn.disabled = !validation.isValid;
    replaceBtn.disabled = !validation.isValid;
    container.querySelector('#import-status').textContent = validation.summary;
  });

  addBtn?.addEventListener('click', () => {
    if (!lastParseResult?.members.length) return;
    addMembers(lastParseResult.members);
    syncCategories(lastParseResult.skills);
    updateState({ activeDemo: null });
    toastSuccess(`${lastParseResult.members.length} membre(s) ajouté(s).`);
    textarea.value = '';
    lastParseResult = null;
    container.querySelector('#import-preview').style.display = 'none';
    addBtn.disabled = true;
    replaceBtn.disabled = true;
  });

  replaceBtn?.addEventListener('click', async () => {
    if (!lastParseResult?.members.length) return;
    const confirmed = await confirm(
      'Remplacer les données',
      'Cette action remplacera toutes les données existantes. Continuer ?'
    );
    if (!confirmed) return;

    replaceMembers(lastParseResult.members);
    syncCategories(lastParseResult.skills, true);
    updateState({ activeDemo: null });
    toastSuccess(`Données remplacées : ${lastParseResult.members.length} membre(s).`);
    textarea.value = '';
    lastParseResult = null;
    container.querySelector('#import-preview').style.display = 'none';
    addBtn.disabled = true;
    replaceBtn.disabled = true;
  });

  templateBtn?.addEventListener('click', () => {
    const state = getState();
    const existingSkills = getAllSkillNames(state.members);
    const template = generateTemplate(existingSkills);
    downloadFile(template, 'skills-matrix-template.csv');
    toastSuccess('Template téléchargé.');
  });

}

/**
 * Display the preview of parsed data.
 * @param {HTMLElement} container - The view container
 * @param {Object} parseResult - Result from parseImportData
 * @param {Object} validation - Validation summary
 */
function showPreview(container, parseResult, validation) {
  const previewArea = container.querySelector('#import-preview');
  const previewContent = container.querySelector('#preview-content');
  const previewSummary = container.querySelector('#preview-summary');
  const previewErrors = container.querySelector('#preview-errors');

  previewArea.style.display = 'block';
  previewSummary.textContent = validation.summary;

  if (parseResult.members.length === 0) {
    previewContent.innerHTML = '<p style="padding: var(--space-4); color: var(--color-text-secondary);">Aucune donnée à afficher.</p>';
    return;
  }

  // Build preview table
  let html = '<table style="width: 100%; font-size: var(--font-size-xs);">';
  html += '<thead><tr style="background: var(--color-bg-tertiary);">';
  html += '<th style="padding: 6px 10px; text-align: left; position: sticky; left: 0; background: var(--color-bg-tertiary);">Nom</th>';
  html += '<th style="padding: 6px 10px; text-align: left;">Ownership</th>';
  html += '<th style="padding: 6px 10px; text-align: left;">Appétences</th>';

  for (const skill of parseResult.skills) {
    html += `<th style="padding: 6px 10px; text-align: center;">${escapeHtml(skill)}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const member of parseResult.members) {
    html += '<tr>';
    html += `<td style="padding: 6px 10px; font-weight: 500; position: sticky; left: 0; background: var(--color-surface);">${escapeHtml(member.name)}</td>`;
    html += `<td style="padding: 6px 10px; color: var(--color-text-secondary);">${escapeHtml(member.role)}</td>`;
    html += `<td style="padding: 6px 10px; color: var(--color-text-secondary);">${escapeHtml(member.appetences)}</td>`;

    for (const skill of parseResult.skills) {
      const entry = member.skills[skill];
      const level = entry?.level ?? 0;
      const appetence = entry?.appetence ?? 0;
      const bgColor = ['#E2E8F0', '#FCA5A5', '#FDE68A', '#93C5FD', '#6EE7B7'][level];

      html += `<td style="padding: 4px; text-align: center;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${bgColor}; font-weight: 600; font-size: 11px;">
          ${level}/${appetence}
        </span>
      </td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  previewContent.innerHTML = html;

  // Show errors if any
  if (validation.errors.length > 0) {
    previewErrors.innerHTML = validation.errors
      .map(err => `<div class="alert-item alert-item--warning" style="margin-top: var(--space-1);"><span class="alert-item__icon">⚠</span><span class="alert-item__text">${escapeHtml(err)}</span></div>`)
      .join('');
  } else {
    previewErrors.innerHTML = '';
  }
}

/**
 * Sync skill categories after import.
 * @param {string[]} newSkills - Newly imported skill names
 * @param {boolean} [replace=false] - Replace existing categories if true
 */
function syncCategories(newSkills, replace = false) {
  const state = getState();
  const existing = replace ? {} : (state.categories || {});
  const cats = buildCategories(newSkills, existing);
  updateCategories(cats);
}

