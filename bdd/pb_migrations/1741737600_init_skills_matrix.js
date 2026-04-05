/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration : Initialisation Skills Matrix
 *
 * Collections créées (ordre important pour les relations) :
 * 1. skills_categories     - référentiel global (catégories de compétences)
 * 2. skills_competences    - référentiel global (compétences liées à une catégorie)
 * 3. skills_equipes        - équipes (chaque équipe = une instance de la matrice)
 * 4. skills_membres        - membres d'une équipe
 * 5. skills_equipe_competences - pivot : quelles compétences chaque équipe évalue
 * 6. skills_evaluations    - évaluations atomiques (1 ligne = 1 membre × 1 compétence)
 *
 * Règles d'accès : toutes ouvertes ("") → le code équipe dans l'URL fait office de clé
 */

migrate((app) => {

    // ─────────────────────────────────────────────────────────────────────────
    // 1. skills_categories - référentiel global
    // ─────────────────────────────────────────────────────────────────────────

    const categories = new Collection({
        name: 'skills_categories',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        indexes: [
            'CREATE UNIQUE INDEX idx_skills_cat_name ON skills_categories (name)',
            'CREATE INDEX idx_skills_cat_ordre ON skills_categories (ordre)',
        ],
        fields: [
            { name: 'name',   type: 'text',   required: true,  presentable: true, min: 1, max: 100 },
            { name: 'color',  type: 'text',   required: false, max: 20 },
            { name: 'icon',   type: 'text',   required: false, max: 50 },
            { name: 'ordre',  type: 'number', required: false, min: 0, onlyInt: true },
        ],
    });

    app.save(categories);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. skills_competences - référentiel global
    // ─────────────────────────────────────────────────────────────────────────

    const competences = new Collection({
        name: 'skills_competences',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        indexes: [
            'CREATE UNIQUE INDEX idx_skills_comp_name ON skills_competences (name)',
            'CREATE INDEX idx_skills_comp_category ON skills_competences (category)',
        ],
        fields: [
            { name: 'name',        type: 'text',     required: true,  presentable: true, min: 1, max: 100 },
            { name: 'category',    type: 'relation',  required: false, collectionId: categories.id, cascadeDelete: false, maxSelect: 1 },
            { name: 'description', type: 'text',     required: false, max: 500 },
            { name: 'tags',        type: 'json',     required: false },
        ],
    });

    app.save(competences);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. skills_equipes - équipes
    // ─────────────────────────────────────────────────────────────────────────

    const equipes = new Collection({
        name: 'skills_equipes',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null,
        indexes: [
            'CREATE UNIQUE INDEX idx_skills_equipes_code ON skills_equipes (code)',
        ],
        fields: [
            { name: 'name',        type: 'text', required: true,  presentable: true, min: 2, max: 100 },
            { name: 'code',        type: 'text', required: true,  min: 3, max: 60, pattern: '^[a-z0-9-]+$' },
            { name: 'description', type: 'text', required: false, max: 500 },
        ],
    });

    app.save(equipes);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. skills_membres - membres d'une équipe
    // ─────────────────────────────────────────────────────────────────────────

    const membres = new Collection({
        name: 'skills_membres',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        indexes: [
            'CREATE INDEX idx_skills_membres_equipe ON skills_membres (equipe)',
        ],
        fields: [
            { name: 'equipe',       type: 'relation', required: true,  collectionId: equipes.id, cascadeDelete: true, maxSelect: 1 },
            { name: 'name',         type: 'text',     required: true,  presentable: true, min: 2, max: 100 },
            { name: 'role',         type: 'text',     required: false, max: 100 },
            { name: 'appetences',   type: 'text',     required: false, max: 500 },
            { name: 'groups',       type: 'json',     required: false },
            { name: 'avatar_color', type: 'text',     required: false, max: 20 },
        ],
    });

    app.save(membres);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. skills_equipe_competences - pivot équipe × compétence
    // ─────────────────────────────────────────────────────────────────────────

    const equipeComps = new Collection({
        name: 'skills_equipe_competences',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        indexes: [
            'CREATE UNIQUE INDEX idx_skills_ec_pair ON skills_equipe_competences (equipe, competence)',
            'CREATE INDEX idx_skills_ec_equipe ON skills_equipe_competences (equipe)',
        ],
        fields: [
            { name: 'equipe',     type: 'relation', required: true, collectionId: equipes.id,     cascadeDelete: true, maxSelect: 1 },
            { name: 'competence', type: 'relation', required: true, collectionId: competences.id, cascadeDelete: true, maxSelect: 1 },
        ],
    });

    app.save(equipeComps);

    // ─────────────────────────────────────────────────────────────────────────
    // 6. skills_evaluations - évaluations atomiques
    // 1 ligne = 1 membre × 1 compétence → pas de race condition possible
    // ─────────────────────────────────────────────────────────────────────────

    const evaluations = new Collection({
        name: 'skills_evaluations',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        indexes: [
            'CREATE UNIQUE INDEX idx_skills_eval_pair ON skills_evaluations (membre, competence)',
            'CREATE INDEX idx_skills_eval_membre ON skills_evaluations (membre)',
            'CREATE INDEX idx_skills_eval_competence ON skills_evaluations (competence)',
        ],
        fields: [
            { name: 'membre',     type: 'relation', required: true,  collectionId: membres.id,     cascadeDelete: true, maxSelect: 1 },
            { name: 'competence', type: 'relation', required: true,  collectionId: competences.id, cascadeDelete: true, maxSelect: 1 },
            // Niveau : 0=Aucun 1=Débutant 2=Intermédiaire 3=Confirmé 4=Expert
            { name: 'level',      type: 'number',   required: true,  min: 0, max: 4, onlyInt: true },
            // Appétence : 0=Aucune 1=Faible 2=Moyen 3=Fort
            { name: 'appetence',  type: 'number',   required: false, min: 0, max: 3, onlyInt: true },
        ],
    });

    app.save(evaluations);

}, (app) => {
    // Down : supprimer dans l'ordre inverse (contraintes de FK)
    for (const name of [
        'skills_evaluations',
        'skills_equipe_competences',
        'skills_membres',
        'skills_equipes',
        'skills_competences',
        'skills_categories',
    ]) {
        try {
            const col = app.findCollectionByNameOrId(name);
            app.delete(col);
        } catch (e) {}
    }
});
