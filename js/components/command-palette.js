/**
 * Command palette component (Ctrl+K).
 * Recherche globale rapide parmi les membres, compétences et catégories.
 * Navigation clavier : flèches haut/bas, Entrée pour sélectionner, Échap pour fermer.
 */

import { getState } from '../state.js';
import { getCategorizedSkillNames } from '../models/data.js';
import { escapeHtml, getInitials, getSkillLabel } from '../utils/helpers.js';
import { navigateTo } from './sidebar.js';

/** @type {HTMLElement|null} Overlay actuellement affiché */
let overlay = null;

/** @type {number} Index du résultat sélectionné au clavier */
let selectedIndex = -1;

/**
 * Initialise le raccourci global Ctrl+K / Cmd+K.
 * À appeler une seule fois au démarrage de l'application.
 */
export function initCommandPalette() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (overlay) {
        closePalette();
      } else {
        openPalette();
      }
    }
  });
}

/**
 * Ouvre la palette de recherche.
 */
export function openPalette() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.className = 'command-palette-overlay';
  overlay.innerHTML = `
    <div class="command-palette" role="dialog" aria-label="Recherche rapide">
      <div class="command-palette__header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; color: var(--color-text-tertiary);">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input type="text" class="command-palette__input" placeholder="Rechercher un membre, une compétence, une catégorie..." autofocus />
        <kbd class="command-palette__kbd">Échap</kbd>
      </div>
      <div class="command-palette__results" id="palette-results"></div>
    </div>
  `;

  document.body.appendChild(overlay);
  selectedIndex = -1;

  const input = overlay.querySelector('.command-palette__input');
  const resultsContainer = overlay.querySelector('#palette-results');

  // Fermer au clic sur l'overlay (pas sur la palette)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePalette();
  });

  // Événements clavier
  input.addEventListener('input', () => {
    selectedIndex = -1;
    renderResults(input.value, resultsContainer);
  });

  input.addEventListener('keydown', (e) => {
    const items = resultsContainer.querySelectorAll('.command-palette__item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      updateSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        items[selectedIndex].click();
      }
    } else if (e.key === 'Escape') {
      closePalette();
    }
  });

  // Afficher les résultats par défaut (vues)
  renderResults('', resultsContainer);

  requestAnimationFrame(() => input.focus());
}

/**
 * Ferme la palette de recherche.
 */
function closePalette() {
  if (overlay) {
    overlay.remove();
    overlay = null;
    selectedIndex = -1;
  }
}

/**
 * Met à jour la sélection visuelle dans la liste de résultats.
 * @param {NodeList} items - Les éléments de résultat
 */
function updateSelection(items) {
  items.forEach((item, i) => {
    item.classList.toggle('command-palette__item--selected', i === selectedIndex);
  });
  if (items[selectedIndex]) {
    items[selectedIndex].scrollIntoView({ block: 'nearest' });
  }
}

/**
 * Construit et affiche les résultats de recherche.
 * @param {string} query - Texte de recherche
 * @param {HTMLElement} container - Conteneur des résultats
 */
function renderResults(query, container) {
  const state = getState();
  const results = [];
  const q = query.toLowerCase().trim();

  // Vues (toujours proposées si pas de recherche)
  const views = [
    { id: 'matrix', label: 'Matrice', icon: '📊', desc: 'Vue heatmap' },
    { id: 'dashboard', label: 'Tableau de bord', icon: '📈', desc: 'KPIs et alertes' },
    { id: 'radar', label: 'Profil Radar', icon: '🎯', desc: 'Graphiques radar' },
    { id: 'import', label: 'Données', icon: '📥', desc: 'Import / templates' },
    { id: 'settings', label: 'Paramètres', icon: '⚙️', desc: 'Configuration' },
  ];

  if (!q) {
    // Pas de recherche : afficher les vues
    for (const v of views) {
      results.push({
        type: 'view',
        icon: v.icon,
        label: v.label,
        desc: v.desc,
        action: () => { closePalette(); navigateTo(v.id); },
      });
    }
  } else {
    // Vues correspondantes
    for (const v of views) {
      if (v.label.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q)) {
        results.push({
          type: 'view',
          icon: v.icon,
          label: v.label,
          desc: v.desc,
          action: () => { closePalette(); navigateTo(v.id); },
        });
      }
    }

    // Membres correspondants
    for (const member of state.members) {
      if (member.name.toLowerCase().includes(q) || member.role.toLowerCase().includes(q)) {
        const avgLevel = Object.values(member.skills).length > 0
          ? (Object.values(member.skills).reduce((s, e) => s + e.level, 0) / Object.values(member.skills).length).toFixed(1)
          : '0.0';
        results.push({
          type: 'member',
          icon: getInitials(member.name),
          label: member.name,
          desc: `${member.role || 'Pas de rôle'} · Score moy. ${avgLevel}/4`,
          action: () => {
            closePalette();
            navigateTo('radar');
          },
        });
      }
    }

    // Compétences correspondantes
    const allSkills = getCategorizedSkillNames(state.members, state.categories);
    for (const skill of allSkills) {
      if (skill.toLowerCase().includes(q)) {
        // Calcul rapide du meilleur niveau
        let best = 0;
        let count = 0;
        for (const m of state.members) {
          const lvl = m.skills[skill]?.level ?? 0;
          if (lvl > best) best = lvl;
          if (lvl > 0) count++;
        }
        results.push({
          type: 'skill',
          icon: '🎯',
          label: skill,
          desc: `${count} membre(s) · Meilleur : ${getSkillLabel(best)}`,
          action: () => {
            closePalette();
            navigateTo('matrix');
          },
        });
      }
    }

    // Catégories correspondantes
    for (const [catName, skills] of Object.entries(state.categories)) {
      if (catName.toLowerCase().includes(q)) {
        results.push({
          type: 'category',
          icon: '📁',
          label: catName,
          desc: `${skills.length} compétence(s)`,
          action: () => {
            closePalette();
            navigateTo('settings');
          },
        });
      }
    }
  }

  // Limiter à 12 résultats
  const displayed = results.slice(0, 12);

  if (displayed.length === 0) {
    container.innerHTML = `
      <div class="command-palette__empty">
        Aucun résultat pour « ${escapeHtml(query)} »
      </div>
    `;
    return;
  }

  // Grouper par type
  const grouped = {};
  const typeLabels = { view: 'Vues', member: 'Membres', skill: 'Compétences', category: 'Catégories' };
  for (const r of displayed) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }

  let html = '';
  for (const [type, items] of Object.entries(grouped)) {
    html += `<div class="command-palette__group-label">${typeLabels[type] || type}</div>`;
    for (const item of items) {
      const isAvatar = item.type === 'member';
      html += `
        <div class="command-palette__item" data-idx="${displayed.indexOf(item)}">
          ${isAvatar
            ? `<div class="command-palette__avatar">${escapeHtml(item.icon)}</div>`
            : `<span class="command-palette__icon">${item.icon}</span>`
          }
          <div class="command-palette__item-text">
            <span class="command-palette__item-label">${escapeHtml(item.label)}</span>
            <span class="command-palette__item-desc">${escapeHtml(item.desc)}</span>
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = html;

  // Bind click events
  container.querySelectorAll('.command-palette__item').forEach((el) => {
    const idx = parseInt(el.dataset.idx, 10);
    el.addEventListener('click', () => displayed[idx]?.action());
    el.addEventListener('mouseenter', () => {
      selectedIndex = idx;
      updateSelection(container.querySelectorAll('.command-palette__item'));
    });
  });
}
