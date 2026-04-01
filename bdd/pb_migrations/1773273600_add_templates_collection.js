/// <reference path="../pb_data/types.d.ts" />

// Migration : crée la collection skills_templates et seed les 3 templates built-in
migrate(
    (app) => {
        const col = new Collection({
            name: 'skills_templates',
            type: 'base',
            listRule: '',
            viewRule: '',
            createRule: '',
            updateRule: '',
            deleteRule: null,
            indexes: [
                'CREATE UNIQUE INDEX idx_skills_tpl_slug ON skills_templates (slug)',
                'CREATE INDEX idx_skills_tpl_ordre ON skills_templates (ordre)',
            ],
            fields: [
                { name: 'slug',        type: 'text',   required: true,  presentable: false, min: 2, max: 80, pattern: '^[a-z0-9-]+$' },
                { name: 'title',       type: 'text',   required: true,  presentable: true,  min: 2, max: 120 },
                { name: 'description', type: 'text',   required: false, max: 500 },
                { name: 'built_in',    type: 'bool',   required: false },
                { name: 'ordre',       type: 'number', required: false, min: 0, onlyInt: true },
                { name: 'data',        type: 'json',   required: true },
            ],
        });
        app.save(col);

        const tplCol = app.findCollectionByNameOrId('skills_templates');

        function seedTemplate(slug, title, description, ordre, data) {
            const r = new Record(tplCol);
            r.set('slug',        slug);
            r.set('title',       title);
            r.set('description', description || '');
            r.set('built_in',    true);
            r.set('ordre',       ordre);
            r.set('data',        data);
            app.save(r);
        }

        seedTemplate(
            'equipe-gabbiano',
            'Equipe GABBIANO',
            'Feature team',
            1,
            {
              "members": [
                {
                  "name": "Elsa",
                  "role": "Product Owner",
                  "appetences": "",
                  "groups": [
                    "CoP DEV",
                    "GDEM"
                  ],
                  "skills": {
                    "JavaScript": {
                      "level": 0,
                      "appetence": 0
                    },
                    "TypeScript": {
                      "level": 0,
                      "appetence": 0
                    },
                    "React": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CSS/HTML": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Accessibilité": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Java": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostgreSQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "API REST": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Entretiens": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Onboarding": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (Gitlab)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Jenkins": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Scrum": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tests de charge": {
                      "level": 0,
                      "appetence": 0
                    },
                    "NFR": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Olivia",
                  "role": "Tech Lead, Accessibilité",
                  "appetences": "",
                  "groups": [
                    "CoP DEV",
                    "GDEM"
                  ],
                  "skills": {
                    "JavaScript": {
                      "level": 3,
                      "appetence": 0
                    },
                    "TypeScript": {
                      "level": 3,
                      "appetence": 0
                    },
                    "React": {
                      "level": 3,
                      "appetence": 0
                    },
                    "CSS/HTML": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Accessibilité": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Java": {
                      "level": 3,
                      "appetence": 0
                    },
                    "PostgreSQL": {
                      "level": 3,
                      "appetence": 0
                    },
                    "API REST": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Communication": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Entretiens": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Onboarding": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (Gitlab)": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Scrum": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Tests de charge": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ecoconception": {
                      "level": 3,
                      "appetence": 0
                    },
                    "DSFR": {
                      "level": 4,
                      "appetence": 0
                    },
                    "UX": {
                      "level": 4,
                      "appetence": 0
                    },
                    "SpringBoot": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Architecture hexagonale": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Craft": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Facilitation/Animation": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Terraform/Terragrunt": {
                      "level": 1,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Docker": {
                      "level": 2,
                      "appetence": 0
                    },
                    "SSH": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Support": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Deploy": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Cypress": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Sécurité": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Keycloak": {
                      "level": 2,
                      "appetence": 0
                    },
                    "MinIO": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Mockoon": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 3,
                      "appetence": 0
                    },
                    "GitHub Actions": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tirs de perf": {
                      "level": 2,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Tanisha",
                  "role": "Tech Lead",
                  "appetences": "",
                  "groups": [
                    "CoP DEV",
                    "GDEM"
                  ],
                  "skills": {
                    "JavaScript": {
                      "level": 0,
                      "appetence": 0
                    },
                    "TypeScript": {
                      "level": 0,
                      "appetence": 0
                    },
                    "React": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CSS/HTML": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Accessibilité": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Java": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostgreSQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "API REST": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Entretiens": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Onboarding": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (Gitlab)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Jenkins": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Scrum": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tests de charge": {
                      "level": 0,
                      "appetence": 0
                    },
                    "NFR": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Mattéo",
                  "role": "Accessibilité",
                  "appetences": "",
                  "groups": [
                    "CoP DEV",
                    "GDEM"
                  ],
                  "skills": {
                    "JavaScript": {
                      "level": 3,
                      "appetence": 0
                    },
                    "TypeScript": {
                      "level": 3,
                      "appetence": 3
                    },
                    "React": {
                      "level": 3,
                      "appetence": 0
                    },
                    "CSS/HTML": {
                      "level": 3,
                      "appetence": 2
                    },
                    "Accessibilité": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Node.js": {
                      "level": 2,
                      "appetence": 3
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Java": {
                      "level": 1,
                      "appetence": 2
                    },
                    "PostgreSQL": {
                      "level": 1,
                      "appetence": 0
                    },
                    "API REST": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MongoDB": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Entretiens": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Onboarding": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (Gitlab)": {
                      "level": 1,
                      "appetence": 0
                    },
                    "GitHub Actions": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Jenkins": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 1,
                      "appetence": 2
                    },
                    "Prometheus": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Scrum": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tests de charge": {
                      "level": 0,
                      "appetence": 0
                    },
                    "NFR": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Architecture hexagonale": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Craft": {
                      "level": 2,
                      "appetence": 3
                    },
                    "Cypress": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Deploy": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Docker": {
                      "level": 1,
                      "appetence": 0
                    },
                    "DSFR": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Ecoconception": {
                      "level": 3,
                      "appetence": 0
                    },
                    "MinIO": {
                      "level": 2,
                      "appetence": 0
                    },
                    "SSH": {
                      "level": 1,
                      "appetence": 0
                    },
                    "UX": {
                      "level": 1,
                      "appetence": 0
                    },
                    "SpringBoot": {
                      "level": 1,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Guillaume",
                  "role": "",
                  "appetences": "",
                  "groups": [
                    "CoP DEV",
                    "GDEM"
                  ],
                  "skills": {
                    "JavaScript": {
                      "level": 2,
                      "appetence": 3
                    },
                    "TypeScript": {
                      "level": 2,
                      "appetence": 2
                    },
                    "React": {
                      "level": 2,
                      "appetence": 3
                    },
                    "CSS/HTML": {
                      "level": 2,
                      "appetence": 2
                    },
                    "Accessibilité": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Java": {
                      "level": 3,
                      "appetence": 3
                    },
                    "PostgreSQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "API REST": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 2,
                      "appetence": 2
                    },
                    "Entretiens": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Onboarding": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (Gitlab)": {
                      "level": 2,
                      "appetence": 3
                    },
                    "Jenkins": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 1,
                      "appetence": 2
                    },
                    "Prometheus": {
                      "level": 1,
                      "appetence": 2
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Scrum": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tests de charge": {
                      "level": 0,
                      "appetence": 0
                    },
                    "NFR": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 2,
                      "appetence": 2
                    },
                    "AWS": {
                      "level": 2,
                      "appetence": 2
                    },
                    "Craft": {
                      "level": 2,
                      "appetence": 3
                    },
                    "Cypress": {
                      "level": 1,
                      "appetence": 2
                    },
                    "Docker": {
                      "level": 2,
                      "appetence": 3
                    },
                    "DSFR": {
                      "level": 1,
                      "appetence": 2
                    },
                    "Ecoconception": {
                      "level": 2,
                      "appetence": 3
                    },
                    "SpringBoot": {
                      "level": 3,
                      "appetence": 2
                    },
                    "SSH": {
                      "level": 2,
                      "appetence": 2
                    },
                    "Terraform/Terragrunt": {
                      "level": 1,
                      "appetence": 2
                    },
                    "UX": {
                      "level": 2,
                      "appetence": 3
                    },
                    "Deploy": {
                      "level": 1,
                      "appetence": 2
                    },
                    "Loki": {
                      "level": 2,
                      "appetence": 2
                    },
                    "Keycloak": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Mockoon": {
                      "level": 1,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "David",
                  "role": "",
                  "appetences": "",
                  "groups": [
                    "CoP DEV",
                    "GDEM"
                  ],
                  "skills": {
                    "JavaScript": {
                      "level": 3,
                      "appetence": 3
                    },
                    "TypeScript": {
                      "level": 3,
                      "appetence": 3
                    },
                    "React": {
                      "level": 2,
                      "appetence": 3
                    },
                    "CSS/HTML": {
                      "level": 2,
                      "appetence": 3
                    },
                    "Accessibilité": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Java": {
                      "level": 1,
                      "appetence": 3
                    },
                    "PostgreSQL": {
                      "level": 2,
                      "appetence": 2
                    },
                    "API REST": {
                      "level": 2,
                      "appetence": 3
                    },
                    "Communication": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Entretiens": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Onboarding": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (Gitlab)": {
                      "level": 2,
                      "appetence": 2
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Scrum": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tests de charge": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ecoconception": {
                      "level": 0,
                      "appetence": 0
                    },
                    "DSFR": {
                      "level": 1,
                      "appetence": 3
                    },
                    "UX": {
                      "level": 2,
                      "appetence": 3
                    },
                    "SpringBoot": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Architecture hexagonale": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Craft": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Facilitation/Animation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Docker": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SSH": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Support": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Deploy": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Cypress": {
                      "level": 2,
                      "appetence": 3
                    },
                    "Sécurité": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Keycloak": {
                      "level": 1,
                      "appetence": 2
                    },
                    "MinIO": {
                      "level": 1,
                      "appetence": 2
                    },
                    "Mockoon": {
                      "level": 1,
                      "appetence": 2
                    },
                    "Tirs de perf": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                }
              ],
              "categories": {
                "Frontend": [
                  "CSS/HTML",
                  "JavaScript",
                  "React",
                  "TypeScript",
                  "Cypress",
                  "UX"
                ],
                "Backend": [
                  "Java",
                  "Keycloak",
                  "MinIO",
                  "Mockoon",
                  "SpringBoot"
                ],
                "Data & IA": [
                  "PostgreSQL",
                  "Ansible"
                ],
                "DevOps & CI/CD": [
                  "CI/CD (Gitlab)",
                  "Jenkins",
                  "AWS",
                  "Terraform/Terragrunt",
                  "Docker",
                  "Deploy",
                  "SSH"
                ],
                "Observabilite": [
                  "Grafana",
                  "Prometheus",
                  "Alertmanager",
                  "Tempo",
                  "Loki"
                ],
                "Methodo & Soft Skills": [
                  "Agile",
                  "Communication",
                  "Leadership",
                  "Mentoring",
                  "Scrum",
                  "Facilitation/Animation",
                  "Craft"
                ],
                "Autres": [
                  "Accessibilité",
                  "API REST",
                  "Documentation",
                  "Entretiens",
                  "Onboarding",
                  "Tests de charge",
                  "NFR",
                  "Architecture hexagonale",
                  "Support"
                ],
                "NFR": [
                  "Tirs de perf",
                  "Ecoconception",
                  "DSFR",
                  "Sécurité"
                ]
              }
            }
        );

        seedTemplate(
            'tribu-value',
            'Tribu Value - Coaching & Transformation',
            '17 coachs agiles et consultants, 22 compétences. Groupes : Tribu Value + Atelier Product & Design.',
            2,
            {
              "members": [
                {
                  "name": "Anthony Coulon",
                  "role": "OKR",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 4,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Audrey Malvoisin",
                  "role": "OKR, Leader de tribu",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 4,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 4,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Thomas Aubry",
                  "role": "",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Délia Le Gac",
                  "role": "Scrum Master",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 2,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 2,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Jérémie Bohbot",
                  "role": "Innovation",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 1,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Delphine Igla",
                  "role": "",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 1,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 1,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Gabrielle Le Bihan",
                  "role": "",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 2,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Hao Lay",
                  "role": "Scrum Master",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 2,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 2,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 2,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Mathilde Curien",
                  "role": "Produit",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 3,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Marina Wiesel",
                  "role": "Design",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 4,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Laetitia Ribette",
                  "role": "",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 2,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Samy Amirou",
                  "role": "LPM",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 2,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Sébastien Rouen",
                  "role": "Scrum Master, IA",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 2,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 2,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 2,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Valérie Capriata",
                  "role": "",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 3,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 2,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Yves Convert",
                  "role": "",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Aline Naval",
                  "role": "Scrum Master",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Caroline Lecavelier",
                  "role": "Scrum Master",
                  "appetences": "",
                  "groups": [
                    "Tribu Value",
                    "Atelier Product & Design"
                  ],
                  "skills": {
                    "Coaching Agile : framework / mindset": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Facilitation": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Conseil Stratégique": {
                      "level": 2,
                      "appetence": 0
                    },
                    "OKR Produit": {
                      "level": 2,
                      "appetence": 0
                    },
                    "OKR Orga": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Lean Portfolio Management": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Value Management Office": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur l'engagement": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Accompagnement Équipes sur la valeur": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Process d'innovations": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Donner des formations": {
                      "level": 4,
                      "appetence": 0
                    },
                    "Mentoring": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Coaching pro et indiv": {
                      "level": 3,
                      "appetence": 0
                    },
                    "Change Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Leadership": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication (interne et externe)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Analyse Organisationnelle": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Data / IA": {
                      "level": 1,
                      "appetence": 0
                    },
                    "Vision Produit": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Management => valoriser la zone de génie des autres": {
                      "level": 2,
                      "appetence": 0
                    },
                    "Outcome Based Roadmap": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Engagement Produit": {
                      "level": 2,
                      "appetence": 0
                    }
                  }
                }
              ],
              "categories": {
                "Coaching & Accompagnement": [
                  "Coaching Agile : framework / mindset",
                  "Facilitation",
                  "Mentoring",
                  "Coaching pro et indiv",
                  "Accompagnement Équipes sur l'engagement",
                  "Accompagnement Équipes sur la valeur"
                ],
                "Stratégie & Valeur": [
                  "Conseil Stratégique",
                  "OKR Produit",
                  "OKR Orga",
                  "Lean Portfolio Management",
                  "Value Management Office",
                  "Outcome Based Roadmap"
                ],
                "Produit & Innovation": [
                  "Vision Produit",
                  "Engagement Produit",
                  "Process d'innovations",
                  "Data / IA"
                ],
                "Leadership & Organisation": [
                  "Leadership",
                  "Communication (interne et externe)",
                  "Change Management",
                  "Analyse Organisationnelle",
                  "Management => valoriser la zone de génie des autres",
                  "Donner des formations"
                ]
              }
            }
        );

        seedTemplate(
            'equipe-fuego-v2',
            'Equipe FUEGO v2',
            '11 OPS, PO',
            3,
            {
              "members": [
                {
                  "name": "Florian",
                  "role": "Product Owner OPS",
                  "appetences": "",
                  "groups": [
                    "CoP Ops",
                    "Fuego"
                  ],
                  "skills": {
                    "SSH & VPN": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 3
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 3
                    },
                    "OpenStack": {
                      "level": 1,
                      "appetence": 3
                    },
                    "AWS": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Docker/K8s": {
                      "level": 1,
                      "appetence": 3
                    },
                    "SRE / DevEx": {
                      "level": 2,
                      "appetence": 3
                    },
                    "DevOps Processus": {
                      "level": 1,
                      "appetence": 3
                    },
                    "SRE Practices": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 3
                    },
                    "Agile": {
                      "level": 3,
                      "appetence": 3
                    },
                    "Nexus/Artifactory": {
                      "level": 0,
                      "appetence": 3
                    },
                    "Vault (HashiCorp)": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Kubernetes (EKS/GKE/AKS)": {
                      "level": 0,
                      "appetence": 3
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 3
                    },
                    "OpenTelemetry": {
                      "level": 0,
                      "appetence": 3
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 3
                    },
                    "Load Balancing (HAProxy/Nginx)": {
                      "level": 1,
                      "appetence": 3
                    },
                    "IAM": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Secrets Management (Passbolt)": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Zero Trust": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Incident Management": {
                      "level": 2,
                      "appetence": 3
                    },
                    "Chaos Engineering": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Documentation": {
                      "level": 3,
                      "appetence": 3
                    },
                    "Kanban": {
                      "level": 3,
                      "appetence": 3
                    },
                    "Communication transverse": {
                      "level": 3,
                      "appetence": 3
                    },
                    "Bash/Shell": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 3
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 3
                    },
                    "Grafana": {
                      "level": 1,
                      "appetence": 3
                    },
                    "Consul": {
                      "level": 1,
                      "appetence": 3
                    },
                    "OpenShift": {
                      "level": 0,
                      "appetence": 3
                    },
                    "PostGresql": {
                      "level": 2,
                      "appetence": 3
                    },
                    "MySQL": {
                      "level": 2,
                      "appetence": 3
                    },
                    "MariaDB": {
                      "level": 0,
                      "appetence": 3
                    },
                    "CI/CD (GitLab)": {
                      "level": 1,
                      "appetence": 3
                    }
                  }
                },
                {
                  "name": "Mohamed",
                  "role": "Tech Lead OPS",
                  "appetences": "",
                  "groups": [
                    "CoP Ops",
                    "Fuego"
                  ],
                  "skills": {
                    "SSH & VPN": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenStack": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Docker/K8s": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE / DevEx": {
                      "level": 0,
                      "appetence": 0
                    },
                    "DevOps Processus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE Practices": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Nexus/Artifactory": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vault (HashiCorp)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kubernetes (EKS/GKE/AKS)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenTelemetry": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Load Balancing (HAProxy/Nginx)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "IAM": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Secrets Management (Passbolt)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Zero Trust": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Incident Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Chaos Engineering": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kanban": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication transverse": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Bash/Shell": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Consul": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenShift": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostGresql": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MySQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MariaDB": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (GitLab)": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Lucas",
                  "role": "OPS",
                  "appetences": "",
                  "groups": [
                    "CoP Ops",
                    "Fuego"
                  ],
                  "skills": {
                    "SSH & VPN": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenStack": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Docker/K8s": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE / DevEx": {
                      "level": 0,
                      "appetence": 0
                    },
                    "DevOps Processus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE Practices": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Nexus/Artifactory": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vault (HashiCorp)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kubernetes (EKS/GKE/AKS)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenTelemetry": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Load Balancing (HAProxy/Nginx)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "IAM": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Secrets Management (Passbolt)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Zero Trust": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Incident Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Chaos Engineering": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kanban": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication transverse": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Bash/Shell": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Consul": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenShift": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostGresql": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MySQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MariaDB": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (GitLab)": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Jacques",
                  "role": "OPS",
                  "appetences": "",
                  "groups": [
                    "CoP Ops",
                    "Fuego"
                  ],
                  "skills": {
                    "SSH & VPN": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenStack": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Docker/K8s": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE / DevEx": {
                      "level": 0,
                      "appetence": 0
                    },
                    "DevOps Processus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE Practices": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Nexus/Artifactory": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vault (HashiCorp)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kubernetes (EKS/GKE/AKS)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenTelemetry": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Load Balancing (HAProxy/Nginx)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "IAM": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Secrets Management (Passbolt)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Zero Trust": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Incident Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Chaos Engineering": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kanban": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication transverse": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Bash/Shell": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Consul": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenShift": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostGresql": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MySQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MariaDB": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (GitLab)": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Abderrahim",
                  "role": "OPS",
                  "appetences": "",
                  "groups": [
                    "CoP Ops",
                    "Fuego"
                  ],
                  "skills": {
                    "SSH & VPN": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenStack": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Docker/K8s": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE / DevEx": {
                      "level": 0,
                      "appetence": 0
                    },
                    "DevOps Processus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE Practices": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Nexus/Artifactory": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vault (HashiCorp)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kubernetes (EKS/GKE/AKS)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenTelemetry": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Load Balancing (HAProxy/Nginx)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "IAM": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Secrets Management (Passbolt)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Zero Trust": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Incident Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Chaos Engineering": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kanban": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication transverse": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Bash/Shell": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Consul": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenShift": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostGresql": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MySQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MariaDB": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (GitLab)": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Roberto",
                  "role": "OPS",
                  "appetences": "",
                  "groups": [
                    "CoP Ops",
                    "Fuego"
                  ],
                  "skills": {
                    "SSH & VPN": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenStack": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Docker/K8s": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE / DevEx": {
                      "level": 0,
                      "appetence": 0
                    },
                    "DevOps Processus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE Practices": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Nexus/Artifactory": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vault (HashiCorp)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kubernetes (EKS/GKE/AKS)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenTelemetry": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Load Balancing (HAProxy/Nginx)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "IAM": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Secrets Management (Passbolt)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Zero Trust": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Incident Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Chaos Engineering": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kanban": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication transverse": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Bash/Shell": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Consul": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenShift": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostGresql": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MySQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MariaDB": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (GitLab)": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Kévin",
                  "role": "OPS",
                  "appetences": "",
                  "groups": [
                    "CoP Ops",
                    "Fuego"
                  ],
                  "skills": {
                    "SSH & VPN": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenStack": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Docker/K8s": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE / DevEx": {
                      "level": 0,
                      "appetence": 0
                    },
                    "DevOps Processus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE Practices": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Nexus/Artifactory": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vault (HashiCorp)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kubernetes (EKS/GKE/AKS)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenTelemetry": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Load Balancing (HAProxy/Nginx)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "IAM": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Secrets Management (Passbolt)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Zero Trust": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Incident Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Chaos Engineering": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kanban": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication transverse": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Bash/Shell": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Consul": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenShift": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostGresql": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MySQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MariaDB": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (GitLab)": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Arnaud",
                  "role": "OPS",
                  "appetences": "",
                  "groups": [
                    "CoP Ops",
                    "Fuego"
                  ],
                  "skills": {
                    "SSH & VPN": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenStack": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Docker/K8s": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE / DevEx": {
                      "level": 0,
                      "appetence": 0
                    },
                    "DevOps Processus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE Practices": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Nexus/Artifactory": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vault (HashiCorp)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kubernetes (EKS/GKE/AKS)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenTelemetry": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Load Balancing (HAProxy/Nginx)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "IAM": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Secrets Management (Passbolt)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Zero Trust": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Incident Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Chaos Engineering": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kanban": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication transverse": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Bash/Shell": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Consul": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenShift": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostGresql": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MySQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MariaDB": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (GitLab)": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Sohayb",
                  "role": "OPS",
                  "appetences": "",
                  "groups": [
                    "CoP Ops",
                    "Fuego"
                  ],
                  "skills": {
                    "SSH & VPN": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenStack": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Docker/K8s": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE / DevEx": {
                      "level": 0,
                      "appetence": 0
                    },
                    "DevOps Processus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE Practices": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Nexus/Artifactory": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vault (HashiCorp)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kubernetes (EKS/GKE/AKS)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenTelemetry": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Load Balancing (HAProxy/Nginx)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "IAM": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Secrets Management (Passbolt)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Zero Trust": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Incident Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Chaos Engineering": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kanban": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication transverse": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Bash/Shell": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Consul": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenShift": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostGresql": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MySQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MariaDB": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (GitLab)": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Yassine",
                  "role": "OPS",
                  "appetences": "",
                  "groups": [
                    "CoP Ops",
                    "Fuego"
                  ],
                  "skills": {
                    "SSH & VPN": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenStack": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Docker/K8s": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE / DevEx": {
                      "level": 0,
                      "appetence": 0
                    },
                    "DevOps Processus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE Practices": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Nexus/Artifactory": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vault (HashiCorp)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kubernetes (EKS/GKE/AKS)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenTelemetry": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Load Balancing (HAProxy/Nginx)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "IAM": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Secrets Management (Passbolt)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Zero Trust": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Incident Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Chaos Engineering": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kanban": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication transverse": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Bash/Shell": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Consul": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenShift": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostGresql": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MySQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MariaDB": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (GitLab)": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                },
                {
                  "name": "Sélim",
                  "role": "OPS",
                  "appetences": "",
                  "groups": [
                    "CoP Ops",
                    "Fuego"
                  ],
                  "skills": {
                    "SSH & VPN": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Ansible": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Terraform/Terragrunt": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenStack": {
                      "level": 0,
                      "appetence": 0
                    },
                    "AWS": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Docker/K8s": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE / DevEx": {
                      "level": 0,
                      "appetence": 0
                    },
                    "DevOps Processus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "SRE Practices": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Python": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Agile": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Nexus/Artifactory": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Vault (HashiCorp)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kubernetes (EKS/GKE/AKS)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Prometheus": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenTelemetry": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Alertmanager": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Load Balancing (HAProxy/Nginx)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "IAM": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Secrets Management (Passbolt)": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Zero Trust": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Incident Management": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Chaos Engineering": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Documentation": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Kanban": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Communication transverse": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Bash/Shell": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Loki": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Tempo": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Grafana": {
                      "level": 0,
                      "appetence": 0
                    },
                    "Consul": {
                      "level": 0,
                      "appetence": 0
                    },
                    "OpenShift": {
                      "level": 0,
                      "appetence": 0
                    },
                    "PostGresql": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MySQL": {
                      "level": 0,
                      "appetence": 0
                    },
                    "MariaDB": {
                      "level": 0,
                      "appetence": 0
                    },
                    "CI/CD (GitLab)": {
                      "level": 0,
                      "appetence": 0
                    }
                  }
                }
              ],
              "categories": {
                "DevOps & CI/CD": [
                  "CI/CD (GitLab)",
                  "DevOps Processus",
                  "Docker/K8s",
                  "Nexus/Artifactory"
                ],
                "Cloud & Infra": [
                  "AWS",
                  "OpenStack"
                ],
                "Observabilite": [
                  "Prometheus",
                  "OpenTelemetry",
                  "Alertmanager",
                  "Loki",
                  "Tempo",
                  "Grafana"
                ],
                "Reseau & Securite": [
                  "SSH & VPN",
                  "Load Balancing (HAProxy/Nginx)",
                  "IAM",
                  "Secrets Management (Passbolt)",
                  "Zero Trust",
                  "Vault (HashiCorp)",
                  "Consul"
                ],
                "SRE & Pratiques": [
                  "SRE / DevEx",
                  "SRE Practices",
                  "Incident Management",
                  "Chaos Engineering"
                ],
                "Methodo & Soft Skills": [
                  "Agile",
                  "Documentation",
                  "Kanban",
                  "Communication transverse"
                ],
                "Infra As Code": [
                  "Ansible",
                  "Terraform/Terragrunt"
                ],
                "Scripting": [
                  "Bash/Shell",
                  "Python"
                ],
                "Orchestrateur de container": [
                  "Kubernetes (EKS/GKE/AKS)",
                  "OpenShift"
                ],
                "BDD": [
                  "PostGresql",
                  "MySQL",
                  "MariaDB"
                ]
              }
            }
        );
    },
    (app) => {
        try {
            const col = app.findCollectionByNameOrId('skills_templates');
            app.delete(col);
        } catch (_) {}
    }
);
