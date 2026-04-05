/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration : Ajouter le champ `objectives` (JSON) sur skills_equipes.
 *
 * Stocke les objectifs d'equipe sous forme de map :
 *   { "JavaScript": { "minExperts": 3 }, "React": { "minExperts": 2 } }
 *
 * Permet la persistence cote serveur en mode equipe PocketBase,
 * au lieu du seul localStorage.
 */

migrate((app) => {
    const equipes = app.findCollectionByNameOrId('skills_equipes');

    equipes.fields.add(new JSONField({
        name: 'objectives',
        required: false,
        maxSize: 50000,
    }));

    app.save(equipes);

}, (app) => {
    const equipes = app.findCollectionByNameOrId('skills_equipes');

    equipes.fields.removeByName('objectives');

    app.save(equipes);
});
