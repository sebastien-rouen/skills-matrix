/**
 * Onboarding wizard component for empty states.
 * Provides quick-start demos and a simple form to create a first matrix.
 */

import { createMember, createSkillEntry } from '../models/data.js';
import { replaceMembers, updateCategories, updateState } from '../state.js';
import { navigateTo } from './sidebar.js';
import { getDemoScenarios } from '../services/demos.js';
import { toastSuccess } from './toast.js';
import { confirm } from './modal.js';
import { escapeHtml } from '../utils/helpers.js';

/** Pre-built skill packs for quick setup */
const SKILL_TEMPLATES = {
  'Frontend':   ['JavaScript', 'TypeScript', 'React', 'Vue.js', 'CSS/HTML', 'Accessibilité'],
  'Backend':    ['Node.js', 'Python', 'Java', 'PostgreSQL', 'API REST', 'MongoDB'],
  'DevOps':     ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Terraform', 'Git'],
  'Data & IA':  ['SQL', 'Python Data', 'Machine Learning', 'Data Viz', 'ETL', 'Spark'],
  'Management': ['Gestion projet', 'Agilité', 'Leadership', 'Communication', 'Coaching'],
};

const TEMPLATE_ICONS = {
  'Frontend':   '🎨',
  'Backend':    '⚙️',
  'DevOps':     '🚀',
  'Data & IA':  '🧠',
  'Management': '📋',
};

/**
 * Render the onboarding wizard into a container.
 * @param {HTMLElement} container - Target DOM element
 */
export function renderOnboarding(container) {
  // Local wizard state
  const memberNames = [];
  const selectedSkills = [];
  const customSkills = new Set();
  const activeTemplates = new Set();

  const render = () => {
    container.innerHTML = buildHTML(memberNames, selectedSkills, activeTemplates);
    bindEvents(container, memberNames, selectedSkills, customSkills, activeTemplates, render);
  };

  render();
}

/**
 * Build the full onboarding HTML.
 * @param {string[]} memberNames - Current member names
 * @param {string[]} selectedSkills - Current skill names
 * @param {Set<string>} activeTemplates - Currently active template names
 * @returns {string} HTML string
 */
function buildHTML(memberNames, selectedSkills, activeTemplates) {
  const demos = getDemoScenarios().slice(0, 3);
  const canCreate = memberNames.length > 0 && selectedSkills.length > 0;

  return `
    <div class="onboarding">
      <!-- Hero -->
      <div class="onboarding__hero">
        <div class="onboarding__hero-icon">📊</div>
        <h1 class="onboarding__hero-title">Bienvenue dans Skills Matrix</h1>
        <p class="onboarding__hero-subtitle">Créez votre matrice de compétences en quelques clics</p>
      </div>

      <!-- Quick-start Demos -->
      <div class="onboarding__section">
        <div class="onboarding__section-header">
          <h2 class="onboarding__section-title">Démarrage rapide</h2>
          <span class="onboarding__section-hint">Explorez avec un jeu de données pré-construit</span>
        </div>
        <div class="onboarding__demos">
          ${demos.map(d => `
            <button class="onboarding__demo-card" data-demo-id="${d.id}">
              <div class="onboarding__demo-title">${d.title}</div>
              <div class="onboarding__demo-desc">${escapeHtml(d.description).slice(0, 100)}${d.description.length > 100 ? '…' : ''}</div>
            </button>
          `).join('')}
        </div>
        <button class="onboarding__demos-more" id="onboarding-all-demos">Voir toutes les démos →</button>
      </div>

      <!-- Divider -->
      <div class="onboarding__divider">
        <span>ou</span>
      </div>

      <!-- Create your team -->
      <div class="onboarding__section">
        <h2 class="onboarding__section-title">Créer votre équipe</h2>

        <!-- Members -->
        <div class="onboarding__field">
          <label class="onboarding__label">Membres de l'équipe</label>
          <div class="onboarding__input-row">
            <input type="text" class="onboarding__input" id="onboarding-member-input"
                   placeholder="Prénom Nom" maxlength="60" />
            <button class="onboarding__add-btn" id="onboarding-add-member">Ajouter</button>
          </div>
          <div class="onboarding__chips" id="onboarding-member-chips">
            ${memberNames.map((name, i) => `
              <span class="onboarding__chip">
                <span class="onboarding__chip-avatar">${name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}</span>
                ${escapeHtml(name)}
                <button class="onboarding__chip-remove" data-member-idx="${i}">&times;</button>
              </span>
            `).join('') || '<span class="onboarding__chips-empty">Aucun membre ajouté</span>'}
          </div>
        </div>

        <!-- Skills -->
        <div class="onboarding__field">
          <label class="onboarding__label">Compétences à suivre</label>
          <div class="onboarding__templates">
            <span class="onboarding__templates-label">Packs :</span>
            ${Object.keys(SKILL_TEMPLATES).map(name => `
              <button class="onboarding__template-btn ${activeTemplates.has(name) ? 'onboarding__template-btn--active' : ''}"
                      data-template="${escapeHtml(name)}">
                ${TEMPLATE_ICONS[name] || ''} ${escapeHtml(name)}
              </button>
            `).join('')}
          </div>
          <div class="onboarding__chips" id="onboarding-skill-chips">
            ${selectedSkills.map((skill, i) => `
              <span class="onboarding__chip onboarding__chip--skill">
                ${escapeHtml(skill)}
                <button class="onboarding__chip-remove" data-skill-idx="${i}">&times;</button>
              </span>
            `).join('') || '<span class="onboarding__chips-empty">Sélectionnez un pack ou ajoutez manuellement</span>'}
          </div>
          <div class="onboarding__input-row">
            <input type="text" class="onboarding__input" id="onboarding-skill-input"
                   placeholder="Ajouter une compétence…" maxlength="60" />
            <button class="onboarding__add-btn" id="onboarding-add-skill">Ajouter</button>
          </div>
        </div>

        <!-- CTA -->
        <button class="onboarding__cta ${canCreate ? '' : 'onboarding__cta--disabled'}"
                id="onboarding-create" ${canCreate ? '' : 'disabled'}>
          Créer la matrice
        </button>
        ${!canCreate ? `
          <p class="onboarding__cta-hint">
            ${memberNames.length === 0 ? 'Ajoutez au moins un membre' : ''}${memberNames.length === 0 && selectedSkills.length === 0 ? ' et ' : ''}${selectedSkills.length === 0 ? 'Ajoutez au moins une compétence' : ''}
          </p>
        ` : `
          <p class="onboarding__cta-hint onboarding__cta-hint--ready">
            ${memberNames.length} membre${memberNames.length > 1 ? 's' : ''} × ${selectedSkills.length} compétence${selectedSkills.length > 1 ? 's' : ''}
          </p>
        `}
      </div>
    </div>
  `;
}

/**
 * Bind all interactive events on the onboarding wizard.
 * @param {HTMLElement} container - Wizard container
 * @param {string[]} memberNames - Mutable member names array
 * @param {string[]} selectedSkills - Mutable skills array
 * @param {Set<string>} customSkills - Skills added manually (not from templates)
 * @param {Set<string>} activeTemplates - Active template names
 * @param {Function} render - Re-render callback
 */
function bindEvents(container, memberNames, selectedSkills, customSkills, activeTemplates, render) {
  // --- Demo buttons ---
  container.querySelectorAll('[data-demo-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const demoId = btn.dataset.demoId;
      const scenarios = getDemoScenarios();
      const scenario = scenarios.find(s => s.id === demoId);
      if (!scenario) return;

      const { members, categories } = scenario.load();
      replaceMembers(members);
      updateCategories(categories);
      updateState({ activeDemo: demoId });
      toastSuccess(`Démo « ${scenario.title} » chargée !`);
      navigateTo('dashboard');
    });
  });

  container.querySelector('#onboarding-all-demos')?.addEventListener('click', () => {
    navigateTo('import');
  });

  // --- Add member ---
  const memberInput = container.querySelector('#onboarding-member-input');
  const addMemberBtn = container.querySelector('#onboarding-add-member');

  const addMember = () => {
    const name = memberInput.value.trim();
    if (!name) return;
    if (memberNames.includes(name)) {
      memberInput.select();
      return;
    }
    memberNames.push(name);
    render();
    // Re-focus after render
    setTimeout(() => {
      const input = container.querySelector('#onboarding-member-input');
      if (input) { input.value = ''; input.focus(); }
    }, 0);
  };

  addMemberBtn?.addEventListener('click', addMember);
  memberInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addMember(); }
  });

  // --- Remove member ---
  container.querySelectorAll('[data-member-idx]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.memberIdx, 10);
      memberNames.splice(idx, 1);
      render();
    });
  });

  // --- Template toggle ---
  container.querySelectorAll('[data-template]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.template;
      if (activeTemplates.has(name)) {
        activeTemplates.delete(name);
        // Remove template skills that aren't custom
        const toRemove = new Set(SKILL_TEMPLATES[name] || []);
        for (let i = selectedSkills.length - 1; i >= 0; i--) {
          if (toRemove.has(selectedSkills[i]) && !customSkills.has(selectedSkills[i])) {
            selectedSkills.splice(i, 1);
          }
        }
      } else {
        activeTemplates.add(name);
        // Add template skills that aren't already present
        for (const skill of (SKILL_TEMPLATES[name] || [])) {
          if (!selectedSkills.includes(skill)) {
            selectedSkills.push(skill);
          }
        }
      }
      render();
    });
  });

  // --- Add custom skill ---
  const skillInput = container.querySelector('#onboarding-skill-input');
  const addSkillBtn = container.querySelector('#onboarding-add-skill');

  const addSkill = () => {
    const skill = skillInput.value.trim();
    if (!skill) return;
    if (selectedSkills.includes(skill)) {
      skillInput.select();
      return;
    }
    selectedSkills.push(skill);
    customSkills.add(skill);
    render();
    setTimeout(() => {
      const input = container.querySelector('#onboarding-skill-input');
      if (input) { input.value = ''; input.focus(); }
    }, 0);
  };

  addSkillBtn?.addEventListener('click', addSkill);
  skillInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
  });

  // --- Remove skill ---
  container.querySelectorAll('[data-skill-idx]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.skillIdx, 10);
      const removed = selectedSkills.splice(idx, 1)[0];
      customSkills.delete(removed);
      render();
    });
  });

  // --- Create matrix ---
  container.querySelector('#onboarding-create')?.addEventListener('click', () => {
    if (memberNames.length === 0 || selectedSkills.length === 0) return;

    // Build members with empty skill entries
    const skillsObj = {};
    for (const skill of selectedSkills) {
      skillsObj[skill] = createSkillEntry(0, 0);
    }

    const members = memberNames.map(name => createMember({
      name,
      skills: { ...skillsObj },
    }));

    // Build categories from active templates
    const categories = {};
    for (const tplName of activeTemplates) {
      const tplSkills = SKILL_TEMPLATES[tplName] || [];
      categories[tplName] = tplSkills.filter(s => selectedSkills.includes(s));
    }
    // Uncategorized custom skills
    const categorized = new Set(Object.values(categories).flat());
    const uncategorized = selectedSkills.filter(s => !categorized.has(s));
    if (uncategorized.length > 0) {
      categories['Autres'] = uncategorized;
    }

    replaceMembers(members);
    updateCategories(categories);
    updateState({ activeDemo: null });
    toastSuccess(`Matrice créée : ${members.length} membre(s) × ${selectedSkills.length} compétence(s)`);
    navigateTo('matrix');
  });
}
