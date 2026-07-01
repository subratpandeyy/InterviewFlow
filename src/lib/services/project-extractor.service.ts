import type { ParsedProject } from './resume-parser.types';

const PROJECT_HEADERS = /\b(projects|personal projects|academic projects|key projects|major projects|side projects)\b/i;
const GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)?\/?/gi;
const LIVE_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?[\w-]+\.[\w-]+[\w./-]*/gi;

export function extractProjects(text: string): ParsedProject[] {
  const projects: ParsedProject[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let inProjectsSection = false;
  let currentProject: Partial<ParsedProject> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (PROJECT_HEADERS.test(line)) {
      inProjectsSection = true;
      continue;
    }

    if (inProjectsSection && /\b(experience|education|skills|certifications|work|employment)\b/i.test(line) && projects.length > 0) {
      break;
    }

    if (!inProjectsSection) continue;

    if (line.length > 3 && line.length < 120 && /^[A-Z]/.test(line) && !line.startsWith('http')) {
      if (currentProject?.name) {
        const proj = finalizeProject(currentProject);
        if (proj) projects.push(proj);
      }
      currentProject = { name: line };
      continue;
    }

    if (currentProject) {
      const githubMatch = line.match(GITHUB_REGEX);
      if (githubMatch && !currentProject.url?.includes('github')) {
        currentProject.url = githubMatch[0];
      }

      const liveMatch = line.match(/live|demo|deployed|hosted|url/i);
      const urlMatch = line.match(LIVE_URL_REGEX);
      if (liveMatch && urlMatch && !currentProject.url) {
        currentProject.url = urlMatch[0];
      }

      const techMatch = line.match(/\b(React|Angular|Vue|Node|Python|JavaScript|TypeScript|HTML|CSS|SQL|MongoDB|Docker|AWS|GCP|Azure|Flutter|Swift|Kotlin)\b/i);
      if (techMatch) {
        if (!currentProject.technologies) currentProject.technologies = [];
        const techs = currentProject.technologies;
        techMatch.forEach(t => {
          if (!techs.includes(t)) techs.push(t);
        });
      }

      if (line.length > 20 && !line.startsWith('http') && !line.startsWith('www')) {
        currentProject.description = currentProject.description
          ? currentProject.description + '\n' + line
          : line;
      }
    }
  }

  if (currentProject?.name) {
    const proj = finalizeProject(currentProject);
    if (proj) projects.push(proj);
  }

  return projects;
}

function finalizeProject(proj: Partial<ParsedProject>): ParsedProject | undefined {
  if (!proj.name) return undefined;
  return {
    name: proj.name,
    description: proj.description || undefined,
    technologies: proj.technologies?.length ? proj.technologies : undefined,
    url: proj.url || undefined,
    start_date: proj.start_date,
    end_date: proj.end_date,
    confidence: 70,
  };
}
