import type { Project } from '../types/content'

/**
 * A project's caption meta: its year and its first two technologies,
 * lowercase. The corridor captions join it with ` · `; More work hands it to
 * WorkRow as meta items. One function, so the two never drift.
 */
export function captionMeta(project: Project): string[] {
  return [String(project.year), ...project.techStack.slice(0, 2).map((s) => s.toLowerCase())]
}
