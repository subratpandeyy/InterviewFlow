import type { ParsedSkill } from './resume-parser.types';

const SKILL_DATABASE: Record<string, { category: string; aliases: string[] }> = {
  'javascript': { category: 'Programming Languages', aliases: ['js', 'es6', 'ecmascript', 'node js', 'nodejs'] },
  'typescript': { category: 'Programming Languages', aliases: ['ts'] },
  'python': { category: 'Programming Languages', aliases: ['py'] },
  'java': { category: 'Programming Languages', aliases: [] },
  'c#': { category: 'Programming Languages', aliases: ['csharp', 'c sharp'] },
  'c++': { category: 'Programming Languages', aliases: ['cpp', 'c plus plus'] },
  'go': { category: 'Programming Languages', aliases: ['golang'] },
  'rust': { category: 'Programming Languages', aliases: [] },
  'ruby': { category: 'Programming Languages', aliases: [] },
  'php': { category: 'Programming Languages', aliases: [] },
  'swift': { category: 'Programming Languages', aliases: [] },
  'kotlin': { category: 'Programming Languages', aliases: [] },
  'scala': { category: 'Programming Languages', aliases: [] },
  'dart': { category: 'Programming Languages', aliases: [] },
  'html': { category: 'Programming Languages', aliases: [] },
  'css': { category: 'Programming Languages', aliases: ['css3'] },
  'sql': { category: 'Programming Languages', aliases: ['mysql', 'postgresql', 'tsql', 'pl/sql'] },

  'react': { category: 'Frameworks', aliases: ['reactjs', 'react.js'] },
  'react native': { category: 'Mobile', aliases: ['reactnative'] },
  'next.js': { category: 'Frameworks', aliases: ['nextjs', 'next'] },
  'vue': { category: 'Frameworks', aliases: ['vuejs', 'vue.js', 'vue 3', 'vue2', 'vuex'] },
  'angular': { category: 'Frameworks', aliases: ['angularjs', 'angular 2+'] },
  'svelte': { category: 'Frameworks', aliases: [] },
  'node.js': { category: 'Frameworks', aliases: ['nodejs', 'node', 'express.js', 'expressjs', 'express'] },
  'django': { category: 'Frameworks', aliases: [] },
  'flask': { category: 'Frameworks', aliases: [] },
  'spring': { category: 'Frameworks', aliases: ['spring boot', 'spring framework'] },
  'rails': { category: 'Frameworks', aliases: ['ruby on rails'] },
  'laravel': { category: 'Frameworks', aliases: [] },
  'asp.net': { category: 'Frameworks', aliases: ['.net', 'dotnet', 'dot net'] },
  'fastapi': { category: 'Frameworks', aliases: [] },
  'tailwind': { category: 'Frameworks', aliases: ['tailwindcss', 'tailwind css'] },
  'bootstrap': { category: 'Frameworks', aliases: [] },
  'jquery': { category: 'Frameworks', aliases: [] },
  'redux': { category: 'Frameworks', aliases: [] },
  'graphql': { category: 'Frameworks', aliases: ['apollo'] },

  'postgresql': { category: 'Databases', aliases: ['postgres', 'pgsql'] },
  'mongodb': { category: 'Databases', aliases: ['mongo'] },
  'mysql': { category: 'Databases', aliases: [] },
  'redis': { category: 'Databases', aliases: [] },
  'elasticsearch': { category: 'Databases', aliases: ['es'] },
  'dynamodb': { category: 'Databases', aliases: ['dynamo db'] },
  'sqlite': { category: 'Databases', aliases: [] },
  'oracle': { category: 'Databases', aliases: [] },
  'sql server': { category: 'Databases', aliases: ['mssql'] },
  'cassandra': { category: 'Databases', aliases: [] },
  'firebase': { category: 'Databases', aliases: ['firestore'] },
  'supabase': { category: 'Databases', aliases: [] },

  'aws': { category: 'Cloud Platforms', aliases: ['amazon web services', 'ec2', 's3', 'lambda', 'cloudfront'] },
  'azure': { category: 'Cloud Platforms', aliases: ['microsoft azure'] },
  'gcp': { category: 'Cloud Platforms', aliases: ['google cloud', 'google cloud platform'] },
  'heroku': { category: 'Cloud Platforms', aliases: [] },
  'vercel': { category: 'Cloud Platforms', aliases: [] },
  'netlify': { category: 'Cloud Platforms', aliases: [] },
  'cloudflare': { category: 'Cloud Platforms', aliases: [] },
  'digitalocean': { category: 'Cloud Platforms', aliases: ['do'] },

  'docker': { category: 'DevOps', aliases: [] },
  'kubernetes': { category: 'DevOps', aliases: ['k8s'] },
  'jenkins': { category: 'DevOps', aliases: [] },
  'github actions': { category: 'DevOps', aliases: ['gh actions', 'github ci/cd'] },
  'gitlab ci': { category: 'DevOps', aliases: ['gitlab ci/cd'] },
  'terraform': { category: 'DevOps', aliases: [] },
  'ansible': { category: 'DevOps', aliases: [] },
  'nginx': { category: 'DevOps', aliases: [] },
  'prometheus': { category: 'DevOps', aliases: [] },
  'grafana': { category: 'DevOps', aliases: [] },

  'jest': { category: 'Testing', aliases: [] },
  'mocha': { category: 'Testing', aliases: [] },
  'cypress': { category: 'Testing', aliases: [] },
  'playwright': { category: 'Testing', aliases: [] },
  'selenium': { category: 'Testing', aliases: [] },
  'pytest': { category: 'Testing', aliases: [] },
  'junit': { category: 'Testing', aliases: [] },
  'vitest': { category: 'Testing', aliases: [] },

  'android': { category: 'Mobile', aliases: ['android development', 'android sdk'] },
  'ios': { category: 'Mobile', aliases: ['ios development'] },
  'flutter': { category: 'Mobile', aliases: [] },
  'swiftui': { category: 'Mobile', aliases: [] },

  'tensorflow': { category: 'AI/ML', aliases: ['tf'] },
  'pytorch': { category: 'AI/ML', aliases: [] },
  'scikit-learn': { category: 'AI/ML', aliases: ['sklearn'] },
  'pandas': { category: 'AI/ML', aliases: [] },
  'numpy': { category: 'AI/ML', aliases: [] },
  'opencv': { category: 'AI/ML', aliases: [] },
  'llm': { category: 'AI/ML', aliases: ['large language models', 'gpt', 'openai'] },
  'langchain': { category: 'AI/ML', aliases: [] },
  'hugging face': { category: 'AI/ML', aliases: ['huggingface', 'transformers'] },

  'git': { category: 'Tools', aliases: ['github', 'gitlab', 'bitbucket'] },
  'webpack': { category: 'Tools', aliases: [] },
  'vite': { category: 'Tools', aliases: [] },
  'babel': { category: 'Tools', aliases: [] },
  'eslint': { category: 'Tools', aliases: [] },
  'prettier': { category: 'Tools', aliases: [] },
  'npm': { category: 'Tools', aliases: ['yarn', 'pnpm'] },
  'figma': { category: 'Tools', aliases: [] },
  'postman': { category: 'Tools', aliases: [] },

  'leadership': { category: 'Soft Skills', aliases: ['team leadership', 'team lead'] },
  'communication': { category: 'Soft Skills', aliases: ['verbal communication', 'written communication'] },
  'problem solving': { category: 'Soft Skills', aliases: ['analytical skills', 'critical thinking'] },
  'teamwork': { category: 'Soft Skills', aliases: ['collaboration'] },
  'project management': { category: 'Soft Skills', aliases: ['agile', 'scrum', 'kanban'] },
  'agile': { category: 'Soft Skills', aliases: ['scrum'] },
};

const SKILL_PATTERNS = Object.entries(SKILL_DATABASE).flatMap(([canonical, def]) => {
  const names = [canonical, ...def.aliases];
  return names.map(n => ({
    pattern: new RegExp(`\\b${escapeRegex(n)}\\b`, 'gi'),
    canonical,
    category: def.category,
  }));
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractSkills(text: string): ParsedSkill[] {
  const seen = new Set<string>();
  const skills: ParsedSkill[] = [];

  for (const { pattern, canonical, category } of SKILL_PATTERNS) {
    if (pattern.test(text)) {
      const lower = canonical.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        skills.push({
          name: canonical,
          category,
          confidence: 94,
          original: canonical,
        });
      }
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}
