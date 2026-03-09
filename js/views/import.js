/**
 * Import view - Bulk data import via paste (CSV/TSV).
 * Provides a textarea, preview, and import actions.
 */

import { getState, addMembers, replaceMembers, updateCategories, updateState } from '../state.js';
import { navigateTo } from '../components/sidebar.js';
import { parseImportData, validateImport, generateTemplate } from '../services/importer.js';
import { buildCategories, getAllSkillNames } from '../models/data.js';
import { toastSuccess, toastWarning } from '../components/toast.js';
import { confirm, promptCreateTemplate } from '../components/modal.js';
import { downloadFile, escapeHtml, SKILL_LEVELS, APPETENCE_LEVELS } from '../utils/helpers.js';
import { getDemoScenarios } from '../services/demos.js';
import { getCustomTemplates, loadCustomTemplate, deleteCustomTemplate, saveCustomTemplate, exportTemplateAsFile, importTemplateFromFile } from '../services/templates.js';


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
        <h3 class="card__title" id="toggle-demos-btn" style="cursor: pointer;">🎮 Jeux de données de démonstration</h3>
      </div>
      <div id="demo-scenarios" style="display: block;">
        <p style="margin-bottom: var(--space-4); font-size: var(--font-size-xs); color: var(--color-text-secondary);">
          Chargez un scénario pré-construit pour explorer l'application.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-3);">
          ${getDemoScenarios().map(demo => `
            <div class="card card--flat" style="border: 2px solid var(--color-border); padding: var(--space-3); transition: all var(--transition-fast); display: flex; flex-direction: column; gap: var(--space-2);"
                 onmouseover="this.style.borderColor='var(--color-primary-400)'"
                 onmouseout="this.style.borderColor='var(--color-border)'">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);">
                <h4 style="font-size: var(--font-size-sm); margin: 0;">${demo.title}</h4>
                <button class="btn btn--primary btn--sm" data-demo-id="${demo.id}" style="flex-shrink: 0;">
                  Charger
                </button>
              </div>
              <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin: 0; line-height: 1.4;">
                ${demo.description}
              </p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Custom Templates -->
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title" id="toggle-templates-btn" style="cursor: pointer;">💾 Templates personnalisés</h3>
        <div style="display: flex; gap: var(--space-2);">
          <button class="btn btn--secondary btn--sm" id="import-json-template-btn" title="Importer un fichier .json">
            ⬆ Importer .json
          </button>
          <button class="btn btn--secondary btn--sm" id="save-template-btn" title="Sauvegarder les données actuelles comme template">
            💾 Sauvegarder
          </button>
          <input type="file" id="import-json-file" accept=".json" style="display: none;">
        </div>
      </div>
      <div id="custom-templates" style="display: block;">
        <p style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Chargement...</p>
      </div>
    </div>

    <!-- Format Guide -->
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title" id="toggle-guide-btn" style="cursor: pointer;">📋 Format attendu</h3>
        <button class="btn btn--ghost btn--icon" id="copy-template-btn" title="Copier le template">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
      <div id="format-guide" style="display: block;">
        <p style="margin-bottom: var(--space-3); font-size: var(--font-size-sm);">
          La première ligne contient les en-têtes. Les trois premières colonnes sont <strong>Nom</strong>, <strong>Ownership</strong> et <strong>Appétences</strong>.<br>
          La 4e colonne <strong>Groupes</strong> est optionnelle (missions, tribus…). Les colonnes suivantes sont les compétences. Chaque cellule contient <code>niveau/appétence</code>.
        </p>
        <div style="overflow-x: auto; margin-bottom: var(--space-4);">
          <table style="font-size: var(--font-size-xs); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <thead>
              <tr style="background: var(--color-bg-tertiary);">
                <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--color-border);">Nom</th>
                <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--color-border);">Ownership</th>
                <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--color-border);">Appétences</th>
                <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); font-style: italic;">Groupes</th>
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
                <td style="padding: 6px 12px; border-bottom: 1px solid var(--color-border-light); color: var(--color-text-secondary); font-style: italic;">Mission X, Tribu Data</td>
                <td style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--color-border-light);">4/3</td>
                <td style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--color-border-light);">3/2</td>
                <td style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--color-border-light);">1/1</td>
              </tr>
              <tr>
                <td style="padding: 6px 12px;">Marie Martin</td>
                <td style="padding: 6px 12px;">Tech Lead</td>
                <td style="padding: 6px 12px;">Architecture, DevOps</td>
                <td style="padding: 6px 12px; color: var(--color-text-secondary); font-style: italic;">Mission Y</td>
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
        <button class="btn btn--ghost btn--icon" id="paste-data-btn" title="Coller depuis le presse-papiers">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
        </button>
      </div>
      <textarea
        class="form-textarea"
        id="import-textarea"
        placeholder="Collez ici le contenu copié depuis Excel, Google Sheets ou un fichier CSV...

Nom;Ownership;Appétences;Groupes;JavaScript;React;Python
Jean Dupont;Développeur;IA, Cloud;Mission X, Tribu Data;4/3;3/2;1/1
Marie Martin;Tech Lead;Architecture, DevOps;Mission Y;3/2;4/3;2/0"
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
 * Render the custom templates cards grid.
 * @param {Object[]} templates - Array of template objects
 * @returns {string} HTML string
 */
function renderCustomTemplatesHTML(templates) {
  if (templates.length === 0) {
    return '<p style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); font-style: italic;">Aucun template sauvegardé.</p>';
  }
  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-3);">
      ${templates.map(tpl => `
        <div class="card card--flat" style="border: 2px solid var(--color-border); padding: var(--space-3); transition: all var(--transition-fast); display: flex; flex-direction: column; gap: var(--space-2);"
             onmouseover="this.style.borderColor='var(--color-primary-400)'"
             onmouseout="this.style.borderColor='var(--color-border)'">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);">
            <h4 style="font-size: var(--font-size-sm); margin: 0;">${tpl.builtIn ? '📦' : '💾'} ${escapeHtml(tpl.title)}</h4>
            <div style="display: flex; gap: var(--space-1); flex-shrink: 0;">
              <button class="btn btn--primary btn--sm" data-template-id="${escapeHtml(tpl.id)}">Charger</button>
              ${tpl.builtIn ? '' : `
                <button class="btn btn--secondary btn--sm" data-template-export="${escapeHtml(tpl.id)}" title="Exporter en fichier JSON">📤</button>
                <button class="btn btn--danger btn--sm" data-template-delete="${escapeHtml(tpl.id)}" title="Supprimer">✕</button>
              `}
            </div>
          </div>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin: 0; line-height: 1.4;">
            ${escapeHtml(tpl.description)}${tpl.members ? ` — ${tpl.members.length} membres` : ''}
          </p>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Load and render templates into the container (async).
 * @param {HTMLElement} container - The view container element
 */
async function refreshTemplates(container) {
  const { templates, fromServer } = await getCustomTemplates();
  const section = container.querySelector('#custom-templates');
  if (!section) return;

  let html = '';
  if (!fromServer && templates.length > 0) {
    html += `<div style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); margin-bottom: var(--space-3); background: var(--color-warning-50, rgba(234,179,8,.1)); border: 1px solid var(--color-warning-200, rgba(234,179,8,.3)); border-radius: var(--radius-md); font-size: var(--font-size-xs); color: var(--color-text-secondary);">
      <span>⚠</span> Serveur non disponible — affichage depuis le stockage local. Lancez <code style="background: var(--color-bg-tertiary); padding: 1px 4px; border-radius: 3px;">npm start</code> pour la persistance fichier.
    </div>`;
  }
  if (!fromServer && templates.length === 0) {
    html += renderCustomTemplatesHTML([]);
    html += `<p style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-2);">Lancez <code style="background: var(--color-bg-tertiary); padding: 1px 4px; border-radius: 3px;">npm start</code> pour charger les templates depuis le serveur.</p>`;
  } else {
    html += renderCustomTemplatesHTML(templates);
  }

  section.innerHTML = html;
  bindTemplateButtons(container, templates);
}

/**
 * Bind load/delete/export buttons for custom templates.
 * @param {HTMLElement} container - The view container element
 * @param {Object[]} templates - Current templates array (for export lookup)
 */
function bindTemplateButtons(container, templates) {
  container.querySelectorAll('[data-template-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tplId = btn.dataset.templateId;
      const data = await loadCustomTemplate(tplId);
      if (!data) return;

      const state = getState();
      if (state.members.length > 0) {
        const confirmed = await confirm(
          'Charger le template',
          'Cela remplacera toutes les données actuelles. Continuer ?'
        );
        if (!confirmed) return;
      }

      const tpl = templates.find(t => t.id === tplId);
      replaceMembers(data.members);
      updateCategories(data.categories);
      updateState({
        activeDemo: null,
        activeTemplate: tpl ? { id: tpl.id, title: tpl.title, description: tpl.description || '', builtIn: !!tpl.builtIn } : null,
      });
      toastSuccess('Template chargé avec succès.');
      navigateTo('dashboard');
    });
  });

  container.querySelectorAll('[data-template-export]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tplId = btn.dataset.templateExport;
      const tpl = templates.find(t => t.id === tplId);
      if (tpl) {
        exportTemplateAsFile(tpl);
        toastSuccess('Template exporté en fichier JSON.');
      }
    });
  });

  container.querySelectorAll('[data-template-delete]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tplId = btn.dataset.templateDelete;
      const confirmed = await confirm('Supprimer le template', 'Cette action est irréversible. Continuer ?');
      if (!confirmed) return;
      const delResult = await deleteCustomTemplate(tplId);
      if (delResult.success) {
        toastSuccess(delResult.fromServer ? 'Template supprimé (fichier).' : 'Template supprimé (local).');
      } else {
        toastWarning('Impossible de supprimer ce template.');
      }
      refreshTemplates(container);
    });
  });
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
  const copyTemplateBtn = container.querySelector('#copy-template-btn');
  const pasteDataBtn = container.querySelector('#paste-data-btn');

  toggleGuideBtn?.addEventListener('click', () => {
    const guide = container.querySelector('#format-guide');
    const isHidden = guide.style.display === 'none';
    guide.style.display = isHidden ? 'block' : 'none';
    toggleGuideBtn.title = isHidden ? 'Cliquer pour masquer' : 'Cliquer pour afficher';
  });

  toggleDemosBtn?.addEventListener('click', () => {
    const demos = container.querySelector('#demo-scenarios');
    const isHidden = demos.style.display === 'none';
    demos.style.display = isHidden ? 'block' : 'none';
    toggleDemosBtn.title = isHidden ? 'Cliquer pour masquer' : 'Cliquer pour afficher';
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
      updateState({ activeDemo: demoId, activeTemplate: null });
      toastSuccess(`Démo « ${scenario.title} » chargée avec succès.`);
      // Redirect to dashboard to see the results
      navigateTo('dashboard');
    });
  });

  // Toggle custom templates section
  const toggleTemplatesBtn = container.querySelector('#toggle-templates-btn');
  toggleTemplatesBtn?.addEventListener('click', () => {
    const section = container.querySelector('#custom-templates');
    const isHidden = section.style.display === 'none';
    section.style.display = isHidden ? 'block' : 'none';
  });

  // Creer un template via la modale (API ou fallback localStorage)
  container.querySelector('#save-template-btn')?.addEventListener('click', async () => {
    const state = getState();
    if (state.members.length === 0) {
      toastWarning('Aucune donnée à enregistrer. Importez des données d\'abord.');
      return;
    }
    const skillCount = getAllSkillNames(state.members).length;
    const formData = await promptCreateTemplate(state.members.length, skillCount);
    if (!formData) return;

    const result = await saveCustomTemplate({
      title: formData.title,
      description: formData.description,
      members: state.members,
      categories: state.categories || {},
    });
    if (!result || !result.success) {
      toastWarning('Erreur lors de la création du template.');
      return;
    }
    if (result.fromServer) {
      toastSuccess(`Template « ${formData.title} » créé (fichier JSON).`);
    } else {
      toastWarning(`Serveur indisponible — template « ${formData.title} » sauvegardé en local (localStorage). Lancez le serveur avec npm start pour la persistance fichier.`);
    }
    refreshTemplates(container);
  });

  // Import template from JSON file
  const importJsonBtn = container.querySelector('#import-json-template-btn');
  const importJsonFile = container.querySelector('#import-json-file');
  importJsonBtn?.addEventListener('click', () => importJsonFile?.click());
  importJsonFile?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = await importTemplateFromFile(reader.result);
      if (result && result.success) {
        if (result.fromServer) {
          toastSuccess('Template importé (fichier JSON).');
        } else {
          toastWarning('Serveur indisponible — template importé en local (localStorage).');
        }
        refreshTemplates(container);
      } else {
        toastWarning('Erreur : fichier JSON invalide.');
      }
    };
    reader.readAsText(file);
    importJsonFile.value = '';
  });

  // Load templates async on init
  refreshTemplates(container);

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

  copyTemplateBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const state = getState();
    const existingSkills = getAllSkillNames(state.members);
    const template = generateTemplate(existingSkills);
    // Retirer les lignes de commentaire (#) pour le presse-papiers
    const cleanTemplate = template.split('\n').filter(l => !l.startsWith('#')).join('\n');
    await navigator.clipboard.writeText(cleanTemplate);
    copyTemplateBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    setTimeout(() => {
      copyTemplateBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    }, 1500);
    toastSuccess('Template copié dans le presse-papiers.');
  });

  pasteDataBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const text = await navigator.clipboard.readText();
    if (text) {
      textarea.value = text;
      textarea.focus();
      toastSuccess('Données collées depuis le presse-papiers.');
    }
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

