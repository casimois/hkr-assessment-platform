import type { Section, Question } from './supabase'

/** Question types eligible for randomization */
const POOL_TYPES: Question['type'][] = ['multiple_choice', 'fill_blank']

function isPoolable(q: Question): boolean {
  return POOL_TYPES.includes(q.type)
}

/**
 * Select random questions from each section based on pool settings.
 *
 * Rules:
 * - Only multiple_choice and fill_blank questions are randomized.
 * - Written and ranking questions are ALWAYS included.
 * - section.randomize must be true for the section to use pooling.
 * - section.pool_size controls how many MC/fill_blank questions are picked.
 * - If pool_size >= poolable question count, all are included (no randomization).
 *
 * Uses Fisher-Yates shuffle for unbiased random selection.
 */
export function selectQuestionsForSubmission(sections: Section[]): Section[] {
  return sections.map(section => {
    // If randomization is not enabled for this section, keep all questions
    if (!section.randomize) return section

    const poolable = section.questions.filter(isPoolable)
    const fixed = section.questions.filter(q => !isPoolable(q))

    const poolSize = section.pool_size
    if (!poolSize || poolSize >= poolable.length) {
      return section // Pool size covers all poolable questions — no randomization
    }

    // Fisher-Yates shuffle on the poolable questions
    const shuffled = [...poolable]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const selected = shuffled.slice(0, poolSize)

    // Reconstruct questions in original order: keep fixed questions in place,
    // replace poolable slots with the selected subset (preserving relative order)
    const selectedIds = new Set(selected.map(q => q.id))
    const result: Question[] = []

    for (const q of section.questions) {
      if (!isPoolable(q)) {
        // Written/ranking — always included
        result.push(q)
      } else if (selectedIds.has(q.id)) {
        // This poolable question was selected
        result.push(q)
      }
      // else: poolable but not selected — skip
    }

    return {
      ...section,
      questions: result,
    }
  })
}

/**
 * Check if any section in the assessment has question pooling enabled.
 */
export function hasPooling(sections: Section[]): boolean {
  return sections.some(s => {
    if (!s.randomize) return false
    const poolable = s.questions.filter(isPoolable)
    return s.pool_size !== undefined && s.pool_size < poolable.length
  })
}

/**
 * Count poolable (MC + fill_blank) questions in a section.
 */
export function countPoolable(section: Section): number {
  return section.questions.filter(isPoolable).length
}
