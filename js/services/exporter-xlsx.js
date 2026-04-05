/**
 * XLSX Export - Rich Excel with colors, formulas, legends, totals.
 * Requires xlsx-js-style (drop-in SheetJS with cell style support).
 */

import { getSkillStats, isSkillCritical } from '../models/data.js';
import { getOrderedSkills, computeTrainingPrioritiesForExport } from './exporter.js';

// ═══════════════════════════════════════════════
// Palette & styles
// ═══════════════════════════════════════════════

const LVL = [
  { bg: 'E2E8F0', fg: '64748B', name: 'Aucun' },
  { bg: 'FCA5A5', fg: '991B1B', name: 'Débutant' },
  { bg: 'FDE68A', fg: '92400E', name: 'Intermédiaire' },
  { bg: '93C5FD', fg: '1E40AF', name: 'Confirmé' },
  { bg: '86EFAC', fg: '065F46', name: 'Expert' },
];

const APT = [
  { bg: 'F1F5F9', fg: '94A3B8', name: 'Aucune' },
  { bg: 'FEF3C7', fg: '92400E', name: 'Faible' },
  { bg: 'FDBA74', fg: '7C2D12', name: 'Moyenne' },
  { bg: 'EA580C', fg: 'FFFFFF', name: 'Forte' },
];

const thin = { style: 'thin', color: { rgb: 'CBD5E1' } };
const border = { top: thin, bottom: thin, left: thin, right: thin };

const sHead = {
  fill: { fgColor: { rgb: '1E40AF' } },
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border,
};
const sHeadLeft = { ...sHead, alignment: { horizontal: 'left', vertical: 'center' } };
const sSum = {
  fill: { fgColor: { rgb: 'EFF6FF' } },
  font: { bold: true, color: { rgb: '1E3A5F' }, sz: 10 },
  alignment: { horizontal: 'left' },
  border,
};
const sSumC = { ...sSum, alignment: { horizontal: 'center' } };
const sLegTitle = {
  font: { bold: true, color: { rgb: '475569' }, sz: 10 },
  fill: { fgColor: { rgb: 'F8FAFC' } },
};
const sBold = { font: { bold: true }, border };
const sCenter = { alignment: { horizontal: 'center' }, border };
const sCrit = {
  fill: { fgColor: { rgb: 'FEE2E2' } },
  font: { bold: true, color: { rgb: '991B1B' } },
  alignment: { horizontal: 'center' }, border,
};
const sOk = {
  fill: { fgColor: { rgb: 'DCFCE7' } },
  font: { bold: true, color: { rgb: '065F46' } },
  alignment: { horizontal: 'center' }, border,
};
const sWarn = {
  fill: { fgColor: { rgb: 'FEF3C7' } },
  font: { bold: true, color: { rgb: '92400E' } },
  alignment: { horizontal: 'center' }, border,
};

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

/** 0-based column index → Excel letter (0=A, 25=Z, 26=AA) */
function cl(c) {
  let s = '', n = c + 1;
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
}

/** Set cell value + style + optional formula */
function sc(ws, r, c, v, s, f) {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (f) {
    ws[addr] = { t: 'n', f };
  } else if (typeof v === 'number') {
    ws[addr] = { t: 'n', v };
  } else {
    ws[addr] = { t: 's', v: v ?? '' };
  }
  if (s) ws[addr].s = s;
}

/** Style header row */
function headRow(ws, headers, row = 0) {
  for (let c = 0; c < headers.length; c++) {
    sc(ws, row, c, headers[c], c === 0 ? sHeadLeft : sHead);
  }
}

/** Auto-width columns from data array */
function autoW(ws, data, extra = []) {
  ws['!cols'] = data[0].map((_, ci) => {
    let max = extra[ci] || 8;
    for (const row of data) {
      const len = row[ci] != null ? String(row[ci]).length : 0;
      if (len > max) max = len;
    }
    return { wch: Math.min(max + 2, 42) };
  });
}

/** Style a block of summary rows */
function sumBlock(ws, startRow, labels, colStart, colEnd, formulaFn) {
  const merges = [];
  for (let i = 0; i < labels.length; i++) {
    const r = startRow + i;
    sc(ws, r, 0, labels[i], sSum);
    // Merge label across columns 0..colStart-1
    if (colStart > 1) {
      for (let c = 1; c < colStart; c++) sc(ws, r, c, '', sSum);
      merges.push({ s: { r, c: 0 }, e: { r, c: colStart - 1 } });
    }
    for (let c = colStart; c <= colEnd; c++) {
      sc(ws, r, c, null, sSumC, formulaFn[i](c));
    }
  }
  return merges;
}

/** Add legend block for levels or appetences */
function legendBlock(ws, startRow, items) {
  sc(ws, startRow, 0, 'LÉGENDE', sLegTitle);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    sc(ws, startRow + 1 + i, 0, i, {
      fill: { fgColor: { rgb: it.bg } },
      font: { color: { rgb: it.fg }, bold: i >= 3 },
      alignment: { horizontal: 'center' }, border,
    });
    sc(ws, startRow + 1 + i, 1, it.name, {
      font: { color: { rgb: it.fg } }, border,
    });
  }
}

/** Excel data range string for a column */
function dr(colIdx, startExcel, endExcel) {
  return `${cl(colIdx)}${startExcel}:${cl(colIdx)}${endExcel}`;
}

// ═══════════════════════════════════════════════
// Export XLSX
// ═══════════════════════════════════════════════

/**
 * Génère un fichier Excel riche avec couleurs, formules, légendes et totaux.
 * 5 onglets : Matrice, Appétences, Analyse, Formations, Objectifs.
 * @param {Object[]} members
 * @param {Object} [categories={}]
 * @param {number} [threshold=2]
 * @param {Object} [objectives={}]
 * @returns {Blob}
 */
export function exportXLSX(members, categories = {}, threshold = 2, objectives = {}) {
  if (typeof XLSX === 'undefined') throw new Error('Bibliothèque XLSX non chargée.');
  if (members.length === 0) throw new Error('Aucun membre à exporter.');

  const skills = getOrderedSkills(members, categories);
  const wb = XLSX.utils.book_new();
  const N = members.length;
  const S = skills.length;

  const catOf = {};
  for (const [cat, ss] of Object.entries(categories)) for (const s of ss) catOf[s] = cat;

  // Excel row references (1-based) for data
  const dStart = 2;       // first data row
  const dEnd = N + 1;     // last data row

  // ─────────────────────────────────────────────
  // Sheet 1 : Matrice (niveaux + formules + légende)
  // ─────────────────────────────────────────────
  {
    const matData = [['Nom', 'Rôle', 'Groupes', ...skills, 'Moy. membre']];
    for (const m of members) {
      matData.push([
        m.name, m.role || '', (m.groups || []).join(', '),
        ...skills.map(s => m.skills[s]?.level ?? 0), 0,
      ]);
    }
    matData.push([]); // N+1 : blank
    matData.push(['MOYENNE', '', '', ...skills.map(() => 0), '']);
    matData.push(['NB EXPERT (=4)', '', '', ...skills.map(() => 0), '']);
    matData.push(['NB CONFIRMÉ+ (≥3)', '', '', ...skills.map(() => 0), '']);
    matData.push(['COUVERTURE (>0)', '', '', ...skills.map(() => 0), '']);
    matData.push([]); // blank
    matData.push(['LÉGENDE']);
    for (let l = 0; l <= 4; l++) matData.push([l, LVL[l].name]);

    const ws = XLSX.utils.aoa_to_sheet(matData);
    const sC = 3, eC = sC + S - 1, avgC = eC + 1;

    // Header style
    headRow(ws, matData[0]);

    // Data cells
    for (let i = 0; i < N; i++) {
      const r = i + 1;
      sc(ws, r, 0, members[i].name, sBold);
      sc(ws, r, 1, members[i].role || '', { border });
      sc(ws, r, 2, (members[i].groups || []).join(', '), { border });
      for (let j = 0; j < S; j++) {
        const lvl = members[i].skills[skills[j]]?.level ?? 0;
        sc(ws, r, sC + j, lvl, {
          fill: { fgColor: { rgb: LVL[lvl].bg } },
          font: { bold: lvl >= 3, color: { rgb: LVL[lvl].fg } },
          alignment: { horizontal: 'center' }, border,
        });
      }
      // Per-member average
      sc(ws, r, avgC, null, sSumC, `ROUND(AVERAGE(${cl(sC)}${r + 1}:${cl(eC)}${r + 1}),2)`);
    }

    // Summary formulas
    const sumR = N + 2;
    const formulas = [
      c => `ROUND(AVERAGE(${dr(c, dStart, dEnd)}),2)`,
      c => `COUNTIF(${dr(c, dStart, dEnd)},4)`,
      c => `COUNTIF(${dr(c, dStart, dEnd)},">=3")`,
      c => `COUNTIF(${dr(c, dStart, dEnd)},">0")`,
    ];
    const labels = ['MOYENNE', 'NB EXPERT (=4)', 'NB CONFIRMÉ+ (≥3)', 'COUVERTURE (>0)'];
    const merges = sumBlock(ws, sumR, labels, sC, eC, formulas);
    ws['!merges'] = merges;

    // Legend
    const legR = sumR + labels.length + 1;
    legendBlock(ws, legR, LVL);

    // Row height for header
    ws['!rows'] = [{ hpt: 24 }];

    autoW(ws, matData, [20, 15, 20]);
    XLSX.utils.book_append_sheet(wb, ws, 'Matrice');
  }

  // ─────────────────────────────────────────────
  // Sheet 2 : Appétences
  // ─────────────────────────────────────────────
  {
    const appData = [['Nom', ...skills, 'Moy.']];
    for (const m of members) {
      appData.push([m.name, ...skills.map(s => m.skills[s]?.appetence ?? 0), 0]);
    }
    appData.push([]);
    appData.push(['MOYENNE', ...skills.map(() => 0), '']);
    appData.push(['NB FORTE (=3)', ...skills.map(() => 0), '']);
    appData.push([]);
    appData.push(['LÉGENDE']);
    for (let a = 0; a <= 3; a++) appData.push([a, APT[a].name]);

    const ws = XLSX.utils.aoa_to_sheet(appData);
    headRow(ws, appData[0]);

    for (let i = 0; i < N; i++) {
      const r = i + 1;
      sc(ws, r, 0, members[i].name, sBold);
      for (let j = 0; j < S; j++) {
        const app = members[i].skills[skills[j]]?.appetence ?? 0;
        sc(ws, r, 1 + j, app, {
          fill: { fgColor: { rgb: APT[app].bg } },
          font: { bold: app >= 3, color: { rgb: APT[app].fg } },
          alignment: { horizontal: 'center' }, border,
        });
      }
      sc(ws, r, S + 1, null, sSumC, `ROUND(AVERAGE(${cl(1)}${r + 1}:${cl(S)}${r + 1}),2)`);
    }

    const sumR = N + 2;
    const merges = [];
    // MOYENNE
    sc(ws, sumR, 0, 'MOYENNE', sSum);
    for (let j = 0; j < S; j++) {
      sc(ws, sumR, 1 + j, null, sSumC, `ROUND(AVERAGE(${dr(1 + j, dStart, dEnd)}),2)`);
    }
    // NB FORTE
    sc(ws, sumR + 1, 0, 'NB FORTE (=3)', sSum);
    for (let j = 0; j < S; j++) {
      sc(ws, sumR + 1, 1 + j, null, sSumC, `COUNTIF(${dr(1 + j, dStart, dEnd)},3)`);
    }

    legendBlock(ws, sumR + 3, APT);
    ws['!rows'] = [{ hpt: 24 }];
    autoW(ws, appData, [20]);
    XLSX.utils.book_append_sheet(wb, ws, 'Appétences');
  }

  // ─────────────────────────────────────────────
  // Sheet 3 : Analyse par compétence
  // ─────────────────────────────────────────────
  {
    const H = ['Compétence', 'Catégorie', 'Criticité', 'Niv. moyen', 'Couverture %',
      'Expert (4)', 'Confirmé (3)', 'Inter. (2)', 'Déb. (1)', 'Aucun (0)', 'Appét. forte'];
    const aData = [H];

    for (const s of skills) {
      const st = getSkillStats(members, s);
      const crit = isSkillCritical(members, s, threshold);
      aData.push([
        s, catOf[s] || 'Autres', crit ? 'CRITIQUE' : 'OK',
        Math.round(st.avgLevel * 100) / 100, Math.round(st.coverage),
        st.levels[4], st.levels[3], st.levels[2], st.levels[1], st.levels[0],
        st.highAppetenceCount,
      ]);
    }
    // Totals row
    aData.push([]);
    aData.push(['TOTAUX / MOYENNES', '', '', 0, 0, 0, 0, 0, 0, 0, 0]);

    const ws = XLSX.utils.aoa_to_sheet(aData);
    headRow(ws, H);

    // Style data rows
    for (let i = 0; i < S; i++) {
      const r = i + 1;
      const crit = aData[r][2] === 'CRITIQUE';
      sc(ws, r, 0, aData[r][0], crit ? { font: { bold: true, color: { rgb: '991B1B' } }, border } : sBold);
      sc(ws, r, 1, aData[r][1], { border });
      sc(ws, r, 2, aData[r][2], crit ? sCrit : sOk);
      sc(ws, r, 3, aData[r][3], sCenter);
      sc(ws, r, 4, aData[r][4], sCenter);
      for (let c = 5; c <= 10; c++) sc(ws, r, c, aData[r][c], sCenter);
    }

    // Totals with formulas
    const tR = S + 2;
    const aStart = 2, aEnd = S + 1;
    sc(ws, tR, 0, 'TOTAUX / MOYENNES', sSum);
    sc(ws, tR, 1, '', sSum);
    sc(ws, tR, 2, null, sSumC, `COUNTIF(${dr(2, aStart, aEnd)},"CRITIQUE")`);
    sc(ws, tR, 3, null, sSumC, `ROUND(AVERAGE(${dr(3, aStart, aEnd)}),2)`);
    sc(ws, tR, 4, null, sSumC, `ROUND(AVERAGE(${dr(4, aStart, aEnd)}),2)`);
    for (let c = 5; c <= 10; c++) {
      sc(ws, tR, c, null, sSumC, `SUM(${dr(c, aStart, aEnd)})`);
    }
    ws['!merges'] = [{ s: { r: tR, c: 0 }, e: { r: tR, c: 1 } }];

    ws['!rows'] = [{ hpt: 24 }];
    autoW(ws, aData, [25, 15, 12, 10, 12]);
    XLSX.utils.book_append_sheet(wb, ws, 'Analyse');
  }

  // ─────────────────────────────────────────────
  // Sheet 4 : Priorités de formation
  // ─────────────────────────────────────────────
  {
    const priorities = computeTrainingPrioritiesForExport(members, skills, threshold);
    const H = ['#', 'Compétence', 'Urgence', 'Confirmé+', 'Cible', 'Formateurs internes', 'Candidats motivés', 'Niv. moyen'];
    const fData = [H];

    for (let i = 0; i < priorities.length; i++) {
      const p = priorities[i];
      fData.push([
        i + 1, p.skill, p.urgency === 'high' ? 'HAUTE' : 'MOYENNE',
        p.confirmedOrExpert, threshold,
        p.trainers.join(', ') || 'Aucun (ext.)',
        p.learners.join(', ') || 'Aucun identifié',
        Math.round(p.avgLevel * 100) / 100,
      ]);
    }
    // Bilan
    fData.push([]);
    const highCount = priorities.filter(p => p.urgency === 'high').length;
    fData.push(['BILAN', `${priorities.length} formations prioritaires`, `${highCount} urgentes`, '', '', '', '', '']);

    const ws = XLSX.utils.aoa_to_sheet(fData);
    headRow(ws, H);

    for (let i = 0; i < priorities.length; i++) {
      const r = i + 1;
      const isHigh = priorities[i].urgency === 'high';
      sc(ws, r, 0, i + 1, sCenter);
      sc(ws, r, 1, fData[r][1], sBold);
      sc(ws, r, 2, fData[r][2], isHigh ? sCrit : sWarn);
      sc(ws, r, 3, fData[r][3], sCenter);
      sc(ws, r, 4, fData[r][4], sCenter);
      sc(ws, r, 5, fData[r][5], { border });
      sc(ws, r, 6, fData[r][6], { border });
      sc(ws, r, 7, fData[r][7], sCenter);
    }

    // Bilan row
    const bR = priorities.length + 2;
    sc(ws, bR, 0, 'BILAN', sSum);
    sc(ws, bR, 1, fData[bR][1], sSum);
    sc(ws, bR, 2, fData[bR][2], sSumC);
    for (let c = 3; c <= 7; c++) sc(ws, bR, c, '', sSum);
    ws['!merges'] = [{ s: { r: bR, c: 3 }, e: { r: bR, c: 7 } }];

    // Légende
    const legR = bR + 2;
    sc(ws, legR, 0, 'LÉGENDE', sLegTitle);
    sc(ws, legR + 1, 0, 'HAUTE', sCrit);
    sc(ws, legR + 1, 1, `Aucun confirmé+ (0/${threshold})`, { border });
    sc(ws, legR + 2, 0, 'MOYENNE', sWarn);
    sc(ws, legR + 2, 1, `Insuffisant (<${threshold} confirmé+)`, { border });
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: legR + 2, c: 7 } });

    ws['!rows'] = [{ hpt: 24 }];
    autoW(ws, fData, [5, 25, 12, 10, 8, 30, 30, 10]);
    XLSX.utils.book_append_sheet(wb, ws, 'Formations');
  }

  // ─────────────────────────────────────────────
  // Sheet 5 : Objectifs d'équipe
  // ─────────────────────────────────────────────
  {
    const objEntries = Object.entries(objectives).filter(([s]) => skills.includes(s));
    if (objEntries.length > 0) {
      const H = ['Compétence', 'Cible (Confirmé+)', 'Actuel', 'Progression', 'Statut', 'Personnes qualifiées'];
      const oData = [H];

      for (const [skill, obj] of objEntries) {
        const target = obj.minExperts || 2;
        const st = getSkillStats(members, skill);
        const current = st.levels[3] + st.levels[4];
        const pct = Math.min(Math.round((current / target) * 100), 100);
        const met = current >= target;
        const qualified = members.filter(m => (m.skills[skill]?.level ?? 0) >= 3).map(m => m.name);
        oData.push([skill, target, current, pct, met ? 'ATTEINT' : 'EN COURS', qualified.join(', ') || '-']);
      }
      // Bilan
      oData.push([]);
      const metCount = objEntries.filter(([s, o]) => {
        const st = getSkillStats(members, s);
        return (st.levels[3] + st.levels[4]) >= (o.minExperts || 2);
      }).length;
      oData.push(['BILAN', `${metCount}/${objEntries.length} atteints`, '', '', '', '']);

      const ws = XLSX.utils.aoa_to_sheet(oData);
      headRow(ws, H);

      for (let i = 0; i < objEntries.length; i++) {
        const r = i + 1;
        const met = oData[r][4] === 'ATTEINT';
        sc(ws, r, 0, oData[r][0], sBold);
        sc(ws, r, 1, oData[r][1], sCenter);
        sc(ws, r, 2, oData[r][2], sCenter);
        // Progression with formula
        sc(ws, r, 3, null, sSumC, `ROUND(${cl(2)}${r + 1}/${cl(1)}${r + 1}*100,0)`);
        sc(ws, r, 4, oData[r][4], met ? sOk : sWarn);
        sc(ws, r, 5, oData[r][5], { border });
      }

      // Bilan
      const bR = objEntries.length + 2;
      sc(ws, bR, 0, 'BILAN', sSum);
      sc(ws, bR, 1, oData[bR][1], sSumC);
      for (let c = 2; c <= 5; c++) sc(ws, bR, c, '', sSum);
      ws['!merges'] = [{ s: { r: bR, c: 2 }, e: { r: bR, c: 5 } }];

      ws['!rows'] = [{ hpt: 24 }];
      autoW(ws, oData, [25, 15, 10, 12, 12, 40]);
      XLSX.utils.book_append_sheet(wb, ws, 'Objectifs');
    }
  }

  // ─────────────────────────────────────────────
  // Génération du fichier
  // ─────────────────────────────────────────────
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
