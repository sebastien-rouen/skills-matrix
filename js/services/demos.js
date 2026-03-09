/**
 * Demo datasets service.
 * Provides pre-built scenarios to showcase different team situations.
 */

import { createMember, createSkillEntry } from '../models/data.js';

/**
 * All available demo scenarios.
 * @returns {Object[]} Array of demo scenario descriptors
 */
export function getDemoScenarios() {
  return [
    {
      id: 'startup',
      title: '🚀 Startup Tech - Équipe fullstack',
      description: 'Petite équipe polyvalente de 6 personnes avec de fortes appétences mais des lacunes critiques en DevOps et Sécurité.',
      advice: [
        'Deux compétences sont à risque immédiat : <strong>Kubernetes</strong> et <strong>Cybersécurité</strong> - une seule personne maîtrise chaque sujet.',
        'L\'appétence forte en IA/ML de 3 membres est un levier : envisagez une formation interne pour capitaliser sur cette motivation.',
        'Le bus factor est très élevé sur le DevOps - si Karim est absent, personne ne peut déployer.',
      ],
      load: loadStartupDemo,
    },
    {
      id: 'transformation',
      title: '☁️ Transformation Cloud - DSI Grand Compte',
      description: 'Équipe de 10 personnes en pleine migration legacy vers le cloud. Beaucoup de compétences legacy (Java/Oracle) mais peu de cloud natif.',
      advice: [
        'Le déséquilibre est net : <strong>70% de l\'expertise est sur les technos legacy</strong> (Java EE, Oracle, WebSphere) tandis que les compétences cloud sont quasi absentes.',
        'Bonne nouvelle : 5 personnes ont une appétence forte pour les technos cloud - <strong>priorisez les certifications AWS/Azure</strong> pour ces profils.',
        'Créez un <strong>binôme mentor/apprenti</strong> entre les experts legacy et les profils motivés par le cloud pour assurer le transfert de connaissances métier.',
      ],
      load: loadTransformationDemo,
    },
    {
      id: 'balanced',
      title: '⚖️ Équipe mature - Feature Team e-commerce',
      description: 'Équipe de 8 personnes bien rodée avec une bonne couverture globale. Idéale pour montrer les subtilités (appétences vs compétences, redondance).',
      advice: [
        'Couverture solide : chaque compétence clé a au moins 2 experts. Le <strong>bus factor est maîtrisé</strong>.',
        'Attention cependant : <strong>les appétences sont faibles sur React et CSS</strong> - risque de désengagement à moyen terme malgré le bon niveau technique.',
        'Opportunité : <strong>3 personnes montrent une appétence forte pour le Product Management</strong> - envisagez des formations pour renforcer l\'autonomie de l\'équipe.',
      ],
      load: loadBalancedDemo,
    },
    {
      id: 'junior',
      title: '🌱 Équipe junior - Promotion sortie d\'école',
      description: 'Équipe de 7 juniors avec beaucoup d\'appétences mais peu d\'expertise. Montre l\'importance de l\'accompagnement et du mentoring.',
      advice: [
        '<strong>Aucun expert</strong> dans l\'équipe - il est impératif d\'ajouter un Tech Lead ou un architecte senior pour encadrer.',
        'Le potentiel est énorme : <strong>toutes les appétences sont au maximum</strong> sur les technos modernes (React, TypeScript, Docker).',
        'Stratégie recommandée : <strong>formations courtes intensives</strong> (bootcamp 2 semaines) sur les 3 skills les plus critiques, puis montée en autonomie progressive.',
        'Mettez en place du <strong>pair programming systématique</strong> pour accélérer la montée en compétences croisées.',
      ],
      load: loadJuniorDemo,
    },
    {
      id: 'data',
      title: '🧠 Pôle Data & IA - Centre d\'excellence',
      description: 'Équipe de 8 data scientists/engineers avec des profils très spécialisés. Illustre les silos de compétences et les dépendances critiques.',
      advice: [
        'L\'équipe a des <strong>profils en silo</strong> : les Data Scientists ne font pas d\'engineering, et vice versa. Cela crée des goulots d\'étranglement.',
        '<strong>MLOps est le point critique n°1</strong> : seule 1 personne maîtrise le déploiement de modèles en production.',
        'Recommandation : organisez des <strong>« rotation days »</strong> mensuels où chacun travaille sur le domaine de l\'autre pour décloisonner les compétences.',
        'Les appétences montrent que <strong>les Data Engineers veulent monter sur le ML</strong> - créez un parcours de formation interne animé par les Data Scientists.',
      ],
      load: loadDataDemo,
    },
  ];
}

// ============================================================
// Demo loaders
// ============================================================

/**
 * Startup tech team demo.
 * @returns {Object} { members, categories }
 */
function loadStartupDemo() {
  const skills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Cybersécurité', 'UX Design', 'IA / ML'];

  const members = [
    m('Léa Fontaine', 'Lead Dev Frontend', {
      'JavaScript': [4, 2], 'TypeScript': [4, 3], 'React': [4, 3], 'Node.js': [2, 1],
      'PostgreSQL': [1, 0], 'Docker': [2, 1], 'Kubernetes': [0, 1], 'CI/CD': [2, 2],
      'AWS': [1, 2], 'Cybersécurité': [1, 1], 'UX Design': [3, 3], 'IA / ML': [0, 3],
    }, 'UX, IA/ML', ['Squad Produit']),
    m('Karim Benzara', 'DevOps / SRE', {
      'JavaScript': [1, 0], 'TypeScript': [1, 0], 'React': [0, 0], 'Node.js': [2, 1],
      'PostgreSQL': [3, 2], 'Docker': [4, 3], 'Kubernetes': [4, 3], 'CI/CD': [4, 3],
      'AWS': [4, 3], 'Cybersécurité': [2, 2], 'UX Design': [0, 0], 'IA / ML': [0, 1],
    }, 'Cloud, Sécurité', ['Plateforme']),
    m('Sophie Leclerc', 'Développeuse Fullstack', {
      'JavaScript': [3, 2], 'TypeScript': [3, 3], 'React': [3, 2], 'Node.js': [3, 3],
      'PostgreSQL': [2, 1], 'Docker': [1, 2], 'Kubernetes': [0, 2], 'CI/CD': [1, 1],
      'AWS': [1, 2], 'Cybersécurité': [0, 1], 'UX Design': [2, 2], 'IA / ML': [1, 3],
    }, 'IA/ML, Fullstack', ['Squad Produit']),
    m('Antoine Moreau', 'Développeur Backend', {
      'JavaScript': [2, 1], 'TypeScript': [3, 2], 'React': [1, 0], 'Node.js': [4, 3],
      'PostgreSQL': [4, 2], 'Docker': [2, 2], 'Kubernetes': [1, 2], 'CI/CD': [2, 2],
      'AWS': [2, 3], 'Cybersécurité': [1, 1], 'UX Design': [0, 0], 'IA / ML': [2, 3],
    }, 'Cloud, IA/ML', ['Squad Growth']),
    m('Inès Dufour', 'Product Designer', {
      'JavaScript': [1, 1], 'TypeScript': [0, 1], 'React': [1, 2], 'Node.js': [0, 0],
      'PostgreSQL': [0, 0], 'Docker': [0, 0], 'Kubernetes': [0, 0], 'CI/CD': [0, 0],
      'AWS': [0, 0], 'Cybersécurité': [0, 0], 'UX Design': [4, 3], 'IA / ML': [1, 2],
    }, 'Design System, IA', ['Squad Produit', 'Squad Growth']),
    m('Rémi Gauthier', 'Développeur Frontend', {
      'JavaScript': [3, 3], 'TypeScript': [2, 3], 'React': [3, 3], 'Node.js': [1, 1],
      'PostgreSQL': [0, 0], 'Docker': [1, 1], 'Kubernetes': [0, 1], 'CI/CD': [1, 1],
      'AWS': [0, 1], 'Cybersécurité': [0, 0], 'UX Design': [2, 2], 'IA / ML': [0, 2],
    }, 'TypeScript, React', ['Squad Growth']),
  ];

  const categories = {
    'Frontend': ['JavaScript', 'TypeScript', 'React', 'UX Design'],
    'Backend': ['Node.js', 'PostgreSQL'],
    'DevOps & Cloud': ['Docker', 'Kubernetes', 'CI/CD', 'AWS'],
    'Transverse': ['Cybersécurité', 'IA / ML'],
  };

  return { members, categories };
}

/**
 * Cloud transformation team demo.
 * @returns {Object} { members, categories }
 */
function loadTransformationDemo() {
  const members = [
    m('Philippe Durand', 'Architecte SI', {
      'Java EE': [4, 1], 'Spring Boot': [3, 2], 'Oracle DB': [4, 1], 'PL/SQL': [4, 0],
      'WebSphere': [4, 0], 'AWS': [1, 3], 'Azure': [0, 2], 'Docker': [1, 3],
      'Kubernetes': [0, 2], 'Terraform': [0, 3], 'Microservices': [2, 3], 'API REST': [3, 2],
    }, 'Cloud, Microservices', ['Équipe Migration']),
    m('Nathalie Rousseau', 'Développeuse Senior', {
      'Java EE': [4, 1], 'Spring Boot': [4, 2], 'Oracle DB': [3, 1], 'PL/SQL': [3, 0],
      'WebSphere': [3, 0], 'AWS': [1, 2], 'Azure': [0, 1], 'Docker': [2, 3],
      'Kubernetes': [0, 2], 'Terraform': [0, 2], 'Microservices': [2, 3], 'API REST': [4, 2],
    }, 'Docker, Microservices', ['Équipe Migration']),
    m('Marc Lefebvre', 'DBA / Admin Système', {
      'Java EE': [1, 0], 'Spring Boot': [0, 0], 'Oracle DB': [4, 2], 'PL/SQL': [4, 1],
      'WebSphere': [3, 0], 'AWS': [0, 3], 'Azure': [0, 2], 'Docker': [1, 2],
      'Kubernetes': [0, 1], 'Terraform': [0, 2], 'Microservices': [0, 1], 'API REST': [1, 1],
    }, 'AWS, Cloud DBA', ['Équipe Run']),
    m('Claire Petit', 'Chef de projet technique', {
      'Java EE': [2, 0], 'Spring Boot': [1, 1], 'Oracle DB': [2, 0], 'PL/SQL': [1, 0],
      'WebSphere': [2, 0], 'AWS': [1, 3], 'Azure': [1, 3], 'Docker': [1, 2],
      'Kubernetes': [0, 2], 'Terraform': [0, 2], 'Microservices': [2, 3], 'API REST': [2, 2],
    }, 'Cloud, Agilité', ['Équipe Migration', 'Équipe Run']),
    m('Youssef Amrani', 'Développeur Junior', {
      'Java EE': [1, 0], 'Spring Boot': [2, 2], 'Oracle DB': [1, 0], 'PL/SQL': [0, 0],
      'WebSphere': [0, 0], 'AWS': [2, 3], 'Azure': [1, 3], 'Docker': [3, 3],
      'Kubernetes': [2, 3], 'Terraform': [1, 3], 'Microservices': [2, 3], 'API REST': [3, 3],
    }, 'DevOps, Cloud Native', ['Équipe Migration']),
    m('Isabelle Martin', 'Développeuse', {
      'Java EE': [3, 1], 'Spring Boot': [3, 2], 'Oracle DB': [2, 0], 'PL/SQL': [2, 0],
      'WebSphere': [2, 0], 'AWS': [0, 2], 'Azure': [0, 1], 'Docker': [1, 2],
      'Kubernetes': [0, 1], 'Terraform': [0, 1], 'Microservices': [1, 2], 'API REST': [3, 2],
    }, 'Spring Boot, API', ['Équipe Run']),
    m('Thomas Girard', 'Ops / Intégration', {
      'Java EE': [1, 0], 'Spring Boot': [0, 0], 'Oracle DB': [2, 1], 'PL/SQL': [1, 0],
      'WebSphere': [4, 0], 'AWS': [1, 3], 'Azure': [1, 3], 'Docker': [2, 3],
      'Kubernetes': [1, 3], 'Terraform': [1, 3], 'Microservices': [1, 2], 'API REST': [1, 1],
    }, 'Cloud, Infra as Code', ['Équipe Run']),
    m('Émilie Faure', 'QA / Testeuse', {
      'Java EE': [1, 0], 'Spring Boot': [1, 1], 'Oracle DB': [1, 0], 'PL/SQL': [1, 0],
      'WebSphere': [1, 0], 'AWS': [0, 1], 'Azure': [0, 1], 'Docker': [1, 1],
      'Kubernetes': [0, 0], 'Terraform': [0, 0], 'Microservices': [1, 1], 'API REST': [2, 2],
    }, 'Tests automatisés', ['Équipe Migration', 'Équipe Run']),
    m('Laurent Dupont', 'Développeur Senior', {
      'Java EE': [4, 1], 'Spring Boot': [3, 2], 'Oracle DB': [3, 1], 'PL/SQL': [3, 0],
      'WebSphere': [3, 0], 'AWS': [0, 1], 'Azure': [0, 0], 'Docker': [1, 1],
      'Kubernetes': [0, 0], 'Terraform': [0, 0], 'Microservices': [1, 1], 'API REST': [3, 1],
    }, 'Java, Architecture', ['Équipe Run']),
    m('Sandra Blanc', 'Scrum Master', {
      'Java EE': [0, 0], 'Spring Boot': [0, 0], 'Oracle DB': [0, 0], 'PL/SQL': [0, 0],
      'WebSphere': [0, 0], 'AWS': [1, 2], 'Azure': [1, 2], 'Docker': [0, 1],
      'Kubernetes': [0, 1], 'Terraform': [0, 1], 'Microservices': [2, 2], 'API REST': [1, 1],
    }, 'Cloud, Agilité à l\'échelle', ['Équipe Migration', 'Équipe Run']),
  ];

  const categories = {
    'Legacy': ['Java EE', 'Oracle DB', 'PL/SQL', 'WebSphere'],
    'Moderne': ['Spring Boot', 'Microservices', 'API REST'],
    'Cloud & Infra': ['AWS', 'Azure', 'Docker', 'Kubernetes', 'Terraform'],
  };

  return { members, categories };
}

/**
 * Balanced e-commerce feature team demo.
 * @returns {Object} { members, categories }
 */
function loadBalancedDemo() {
  const members = [
    m('Julien Renard', 'Tech Lead', {
      'React': [4, 2], 'TypeScript': [4, 2], 'Node.js': [4, 2], 'PostgreSQL': [3, 1],
      'Redis': [3, 2], 'Docker': [3, 2], 'CSS / Tailwind': [3, 1], 'Tests E2E': [3, 2],
      'Elasticsearch': [2, 2], 'Product Management': [2, 3],
    }, 'Product Management, Architecture', ['Squad Checkout', 'Squad Catalogue']),
    m('Camille Dubois', 'Développeuse Frontend', {
      'React': [4, 3], 'TypeScript': [3, 3], 'Node.js': [1, 1], 'PostgreSQL': [0, 0],
      'Redis': [0, 0], 'Docker': [1, 1], 'CSS / Tailwind': [4, 3], 'Tests E2E': [3, 2],
      'Elasticsearch': [0, 0], 'Product Management': [1, 3],
    }, 'Product Management, Design System', ['Squad Checkout']),
    m('Nicolas Bernard', 'Développeur Backend', {
      'React': [1, 0], 'TypeScript': [3, 2], 'Node.js': [4, 3], 'PostgreSQL': [4, 2],
      'Redis': [3, 2], 'Docker': [3, 2], 'CSS / Tailwind': [0, 0], 'Tests E2E': [2, 1],
      'Elasticsearch': [4, 3], 'Product Management': [1, 2],
    }, 'Elasticsearch, Perf', ['Squad Catalogue']),
    m('Laura Mercier', 'Développeuse Fullstack', {
      'React': [3, 2], 'TypeScript': [3, 2], 'Node.js': [3, 2], 'PostgreSQL': [2, 2],
      'Redis': [2, 2], 'Docker': [2, 2], 'CSS / Tailwind': [3, 1], 'Tests E2E': [2, 2],
      'Elasticsearch': [1, 2], 'Product Management': [2, 3],
    }, 'Product Management, Fullstack', ['Squad Checkout']),
    m('Maxime Leroy', 'DevOps', {
      'React': [0, 0], 'TypeScript': [1, 1], 'Node.js': [2, 1], 'PostgreSQL': [2, 1],
      'Redis': [3, 2], 'Docker': [4, 3], 'CSS / Tailwind': [0, 0], 'Tests E2E': [2, 1],
      'Elasticsearch': [3, 2], 'Product Management': [0, 0],
    }, 'Kubernetes, Monitoring', ['Plateforme']),
    m('Chloé Vasseur', 'QA Engineer', {
      'React': [2, 1], 'TypeScript': [2, 1], 'Node.js': [1, 1], 'PostgreSQL': [1, 0],
      'Redis': [0, 0], 'Docker': [1, 1], 'CSS / Tailwind': [1, 0], 'Tests E2E': [4, 3],
      'Elasticsearch': [0, 0], 'Product Management': [2, 2],
    }, 'Automatisation, Qualité', ['Squad Checkout', 'Squad Catalogue']),
    m('Alexandre Morel', 'Développeur Frontend', {
      'React': [3, 2], 'TypeScript': [3, 3], 'Node.js': [1, 2], 'PostgreSQL': [0, 0],
      'Redis': [0, 0], 'Docker': [1, 1], 'CSS / Tailwind': [3, 1], 'Tests E2E': [2, 1],
      'Elasticsearch': [0, 0], 'Product Management': [1, 2],
    }, 'TypeScript, Node.js', ['Squad Catalogue']),
    m('Marine Caron', 'Product Owner', {
      'React': [1, 1], 'TypeScript': [0, 0], 'Node.js': [0, 0], 'PostgreSQL': [0, 0],
      'Redis': [0, 0], 'Docker': [0, 0], 'CSS / Tailwind': [1, 1], 'Tests E2E': [1, 1],
      'Elasticsearch': [0, 0], 'Product Management': [4, 3],
    }, 'Stratégie Produit', ['Squad Checkout', 'Squad Catalogue']),
  ];

  const categories = {
    'Frontend': ['React', 'TypeScript', 'CSS / Tailwind'],
    'Backend': ['Node.js', 'PostgreSQL', 'Redis', 'Elasticsearch'],
    'Ops & Qualité': ['Docker', 'Tests E2E'],
    'Produit': ['Product Management'],
  };

  return { members, categories };
}

/**
 * Junior team demo (fresh graduates).
 * @returns {Object} { members, categories }
 */
function loadJuniorDemo() {
  const members = [
    m('Emma Lefèvre', 'Développeuse Junior', {
      'JavaScript': [2, 3], 'TypeScript': [1, 3], 'React': [2, 3], 'Python': [2, 2],
      'SQL': [1, 2], 'Git': [2, 2], 'Docker': [0, 3], 'Tests unitaires': [1, 2],
      'Agilité / Scrum': [1, 2], 'Architecture logicielle': [0, 3],
    }, 'React, Docker', ['Promo 2025']),
    m('Hugo Perrin', 'Développeur Junior', {
      'JavaScript': [2, 3], 'TypeScript': [1, 3], 'React': [1, 3], 'Python': [3, 3],
      'SQL': [2, 2], 'Git': [2, 2], 'Docker': [1, 3], 'Tests unitaires': [1, 2],
      'Agilité / Scrum': [1, 1], 'Architecture logicielle': [0, 3],
    }, 'Python, Data Science', ['Promo 2025']),
    m('Manon Chevalier', 'Développeuse Junior', {
      'JavaScript': [2, 2], 'TypeScript': [2, 3], 'React': [2, 3], 'Python': [1, 1],
      'SQL': [1, 1], 'Git': [2, 2], 'Docker': [0, 2], 'Tests unitaires': [2, 3],
      'Agilité / Scrum': [2, 3], 'Architecture logicielle': [1, 3],
    }, 'Agilité, Architecture', ['Promo 2025']),
    m('Lucas Roche', 'Développeur Junior', {
      'JavaScript': [1, 2], 'TypeScript': [1, 2], 'React': [0, 3], 'Python': [2, 3],
      'SQL': [2, 3], 'Git': [1, 1], 'Docker': [1, 3], 'Tests unitaires': [1, 2],
      'Agilité / Scrum': [1, 2], 'Architecture logicielle': [0, 2],
    }, 'Python, Backend', ['Promo 2025']),
    m('Jade Fournier', 'Développeuse Junior', {
      'JavaScript': [2, 3], 'TypeScript': [2, 3], 'React': [2, 3], 'Python': [1, 1],
      'SQL': [1, 2], 'Git': [2, 2], 'Docker': [1, 3], 'Tests unitaires': [1, 2],
      'Agilité / Scrum': [1, 2], 'Architecture logicielle': [0, 3],
    }, 'React, TypeScript', ['Promo 2025']),
    m('Nathan Giraud', 'Développeur Junior', {
      'JavaScript': [1, 2], 'TypeScript': [0, 2], 'React': [1, 2], 'Python': [2, 3],
      'SQL': [2, 2], 'Git': [1, 1], 'Docker': [0, 2], 'Tests unitaires': [1, 1],
      'Agilité / Scrum': [0, 1], 'Architecture logicielle': [0, 2],
    }, 'Python, SQL', ['Promo 2025']),
    m('Zoé Lambert', 'Développeuse Junior', {
      'JavaScript': [2, 3], 'TypeScript': [1, 3], 'React': [1, 3], 'Python': [1, 2],
      'SQL': [1, 1], 'Git': [2, 2], 'Docker': [0, 3], 'Tests unitaires': [2, 3],
      'Agilité / Scrum': [2, 3], 'Architecture logicielle': [1, 3],
    }, 'Agilité, Qualité', ['Promo 2025']),
  ];

  const categories = {
    'Langages': ['JavaScript', 'TypeScript', 'Python'],
    'Frameworks & Outils': ['React', 'SQL', 'Git', 'Docker'],
    'Pratiques': ['Tests unitaires', 'Agilité / Scrum', 'Architecture logicielle'],
  };

  return { members, categories };
}

/**
 * Data & AI center of excellence demo.
 * @returns {Object} { members, categories }
 */
function loadDataDemo() {
  const members = [
    m('Dr. Amina Khelifi', 'Lead Data Scientist', {
      'Python': [4, 2], 'Machine Learning': [4, 3], 'Deep Learning': [4, 3], 'NLP': [3, 3],
      'SQL': [2, 0], 'Spark': [2, 2], 'MLOps': [1, 2], 'Airflow': [1, 1],
      'Power BI': [1, 0], 'Data Governance': [2, 1], 'Statistiques': [4, 2], 'Cloud (GCP)': [2, 2],
    }, 'Deep Learning, NLP', ['Cellule Data Science']),
    m('Pierre Blanc', 'Data Engineer Senior', {
      'Python': [3, 2], 'Machine Learning': [1, 3], 'Deep Learning': [0, 2], 'NLP': [0, 1],
      'SQL': [4, 2], 'Spark': [4, 3], 'MLOps': [3, 3], 'Airflow': [4, 3],
      'Power BI': [1, 0], 'Data Governance': [2, 1], 'Statistiques': [1, 1], 'Cloud (GCP)': [3, 2],
    }, 'ML, Spark', ['Cellule Data Engineering']),
    m('Fatima Hadj', 'Data Scientist', {
      'Python': [4, 3], 'Machine Learning': [3, 3], 'Deep Learning': [3, 3], 'NLP': [4, 3],
      'SQL': [2, 0], 'Spark': [1, 1], 'MLOps': [0, 2], 'Airflow': [0, 0],
      'Power BI': [0, 0], 'Data Governance': [1, 0], 'Statistiques': [3, 2], 'Cloud (GCP)': [1, 2],
    }, 'NLP, Deep Learning', ['Cellule Data Science']),
    m('Romain Guérin', 'Data Engineer', {
      'Python': [3, 2], 'Machine Learning': [1, 2], 'Deep Learning': [0, 1], 'NLP': [0, 0],
      'SQL': [4, 2], 'Spark': [3, 3], 'MLOps': [2, 3], 'Airflow': [3, 2],
      'Power BI': [1, 0], 'Data Governance': [2, 2], 'Statistiques': [1, 0], 'Cloud (GCP)': [3, 3],
    }, 'MLOps, Cloud', ['Cellule Data Engineering']),
    m('Julie Marchand', 'Data Analyst', {
      'Python': [2, 2], 'Machine Learning': [1, 2], 'Deep Learning': [0, 1], 'NLP': [0, 0],
      'SQL': [3, 2], 'Spark': [1, 1], 'MLOps': [0, 0], 'Airflow': [0, 0],
      'Power BI': [4, 3], 'Data Governance': [3, 2], 'Statistiques': [3, 2], 'Cloud (GCP)': [1, 1],
    }, 'Data Viz, Gouvernance', ['Cellule Analytics']),
    m('Olivier Tanguy', 'ML Engineer', {
      'Python': [4, 3], 'Machine Learning': [3, 3], 'Deep Learning': [2, 3], 'NLP': [1, 2],
      'SQL': [2, 0], 'Spark': [2, 2], 'MLOps': [4, 3], 'Airflow': [2, 2],
      'Power BI': [0, 0], 'Data Governance': [1, 1], 'Statistiques': [2, 1], 'Cloud (GCP)': [3, 3],
    }, 'Deep Learning, Cloud', ['Cellule Data Science', 'Cellule Data Engineering']),
    m('Salima Benali', 'Data Scientist Junior', {
      'Python': [2, 3], 'Machine Learning': [2, 3], 'Deep Learning': [1, 3], 'NLP': [1, 3],
      'SQL': [2, 1], 'Spark': [0, 2], 'MLOps': [0, 2], 'Airflow': [0, 1],
      'Power BI': [1, 1], 'Data Governance': [0, 1], 'Statistiques': [2, 2], 'Cloud (GCP)': [1, 3],
    }, 'ML, NLP, Cloud', ['Cellule Data Science']),
    m('Éric Vidal', 'Responsable Data', {
      'Python': [1, 0], 'Machine Learning': [2, 1], 'Deep Learning': [1, 0], 'NLP': [1, 0],
      'SQL': [2, 0], 'Spark': [1, 0], 'MLOps': [1, 1], 'Airflow': [1, 0],
      'Power BI': [3, 2], 'Data Governance': [4, 3], 'Statistiques': [2, 1], 'Cloud (GCP)': [2, 2],
    }, 'Gouvernance, Stratégie Data', ['Cellule Analytics', 'Cellule Data Engineering']),
  ];

  const categories = {
    'Data Science': ['Python', 'Machine Learning', 'Deep Learning', 'NLP', 'Statistiques'],
    'Data Engineering': ['SQL', 'Spark', 'Airflow', 'MLOps'],
    'Analytics & Gouvernance': ['Power BI', 'Data Governance'],
    'Infrastructure': ['Cloud (GCP)'],
  };

  return { members, categories };
}


// ============================================================
// Helper
// ============================================================

/**
 * Shorthand to create a member with compact skill notation.
 * @param {string} name - Member name
 * @param {string} role - Member ownership (comma-separated)
 * @param {Object} skills - { skillName: [level, appetence] }
 * @param {string} [appetences=''] - Member appetences (free text)
 * @param {string[]} [groups=[]] - Member groups (missions, tribus…)
 * @returns {Object} Member object
 */
function m(name, role, skills, appetences = '', groups = []) {
  const entries = {};
  for (const [skillName, [level, appetence]] of Object.entries(skills)) {
    entries[skillName] = createSkillEntry(level, appetence);
  }
  return createMember({ name, role, appetences, groups, skills: entries });
}
