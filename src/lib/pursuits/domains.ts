import type { PursuitDomain, DomainScores, OnboardingItem } from '@/types/pursuit'

export interface DomainDefinition {
  key: PursuitDomain
  name: string
  greekName: string
  description: string
}

export const DOMAINS: DomainDefinition[] = [
  { key: 'sophia', name: 'Intellectual Excellence', greekName: 'Sophia', description: 'Learning, knowledge, understanding, wisdom' },
  { key: 'phronesis', name: 'Practical Wisdom', greekName: 'Phronesis', description: 'Career, finances, decision-making, judgment' },
  { key: 'arete', name: 'Character & Virtue', greekName: 'Arete', description: 'Personal development, habits, discipline, integrity' },
  { key: 'koinonia', name: 'Community & Justice', greekName: 'Koinonia', description: 'Relationships, service, belonging, civic life' },
  { key: 'soma', name: 'Physical Flourishing', greekName: 'Soma', description: 'Health, body, vitality, movement' },
  { key: 'techne', name: 'Creative Expression', greekName: 'Techne', description: 'Craft, art, making, creation, skill' },
  { key: 'theoria', name: 'Contemplation', greekName: 'Theoria', description: 'Reflection, mindfulness, inner life, presence' },
]

// Helper to create a sparse score vector (unspecified domains default to 0)
function scores(partial: Partial<DomainScores>): DomainScores {
  return {
    sophia: 0,
    phronesis: 0,
    arete: 0,
    koinonia: 0,
    soma: 0,
    techne: 0,
    theoria: 0,
    ...partial,
  }
}

// Predefined onboarding items with score vectors
// Each item scores 0-5 across domains. Primary domain scores highest, with secondary contributions.
export const PREDEFINED_ITEMS: OnboardingItem[] = [
  // Sophia - Intellectual Excellence
  { label: 'Read more deeply', domainScores: scores({ sophia: 5, theoria: 2, phronesis: 1 }) },
  { label: 'Learn a new language', domainScores: scores({ sophia: 4, koinonia: 2, arete: 2 }) },
  { label: 'Study philosophy', domainScores: scores({ sophia: 5, theoria: 3, arete: 1 }) },
  { label: 'Take a course or pursue formal education', domainScores: scores({ sophia: 5, phronesis: 2, arete: 1 }) },
  { label: 'Develop critical thinking', domainScores: scores({ sophia: 4, phronesis: 3, arete: 1 }) },
  { label: 'Explore science or mathematics', domainScores: scores({ sophia: 5, techne: 1, theoria: 2 }) },

  // Phronesis - Practical Wisdom
  { label: 'Advance in my career', domainScores: scores({ phronesis: 5, arete: 2, koinonia: 1 }) },
  { label: 'Improve financial literacy', domainScores: scores({ phronesis: 5, sophia: 2, arete: 1 }) },
  { label: 'Make better decisions under pressure', domainScores: scores({ phronesis: 5, arete: 3, theoria: 1 }) },
  { label: 'Develop leadership skills', domainScores: scores({ phronesis: 4, koinonia: 3, arete: 2 }) },
  { label: 'Start or grow a business', domainScores: scores({ phronesis: 5, techne: 2, arete: 2 }) },
  { label: 'Plan for long-term security', domainScores: scores({ phronesis: 5, sophia: 1, arete: 1 }) },

  // Arete - Character & Virtue
  { label: 'Build consistent daily habits', domainScores: scores({ arete: 5, phronesis: 2, soma: 1 }) },
  { label: 'Practice honesty and integrity', domainScores: scores({ arete: 5, koinonia: 3, theoria: 1 }) },
  { label: 'Cultivate patience', domainScores: scores({ arete: 5, theoria: 3, koinonia: 1 }) },
  { label: 'Overcome procrastination', domainScores: scores({ arete: 5, phronesis: 2, techne: 1 }) },
  { label: 'Develop self-discipline', domainScores: scores({ arete: 5, soma: 2, phronesis: 1 }) },
  { label: 'Practice gratitude', domainScores: scores({ arete: 4, theoria: 3, koinonia: 2 }) },

  // Koinonia - Community & Justice
  { label: 'Deepen close friendships', domainScores: scores({ koinonia: 5, arete: 2, phronesis: 1 }) },
  { label: 'Be more present with family', domainScores: scores({ koinonia: 5, theoria: 2, arete: 2 }) },
  { label: 'Volunteer or serve my community', domainScores: scores({ koinonia: 5, arete: 3, phronesis: 1 }) },
  { label: 'Improve communication skills', domainScores: scores({ koinonia: 4, phronesis: 3, sophia: 1 }) },
  { label: 'Build professional relationships', domainScores: scores({ koinonia: 4, phronesis: 3, arete: 1 }) },
  { label: 'Mentor or teach others', domainScores: scores({ koinonia: 5, sophia: 3, arete: 2 }) },

  // Soma - Physical Flourishing
  { label: 'Exercise regularly', domainScores: scores({ soma: 5, arete: 2, theoria: 1 }) },
  { label: 'Improve nutrition', domainScores: scores({ soma: 5, sophia: 1, arete: 2 }) },
  { label: 'Sleep better', domainScores: scores({ soma: 5, arete: 1, theoria: 1 }) },
  { label: 'Manage stress', domainScores: scores({ soma: 4, theoria: 3, arete: 2 }) },
  { label: 'Train for a physical challenge', domainScores: scores({ soma: 5, arete: 3, phronesis: 1 }) },
  { label: 'Develop a movement practice', domainScores: scores({ soma: 5, theoria: 2, techne: 1 }) },

  // Techne - Creative Expression
  { label: 'Write regularly', domainScores: scores({ techne: 5, sophia: 2, theoria: 3 }) },
  { label: 'Learn a musical instrument', domainScores: scores({ techne: 5, sophia: 2, arete: 2 }) },
  { label: 'Practice visual art or design', domainScores: scores({ techne: 5, sophia: 1, theoria: 2 }) },
  { label: 'Build something with my hands', domainScores: scores({ techne: 5, soma: 2, phronesis: 1 }) },
  { label: 'Develop my craft or trade', domainScores: scores({ techne: 5, phronesis: 2, arete: 2 }) },
  { label: 'Create a personal project', domainScores: scores({ techne: 5, phronesis: 2, sophia: 1 }) },

  // Theoria - Contemplation
  { label: 'Establish a meditation practice', domainScores: scores({ theoria: 5, arete: 2, soma: 1 }) },
  { label: 'Journal regularly', domainScores: scores({ theoria: 5, sophia: 2, techne: 2 }) },
  { label: 'Spend more time in nature', domainScores: scores({ theoria: 5, soma: 3, koinonia: 1 }) },
  { label: 'Practice mindfulness', domainScores: scores({ theoria: 5, arete: 2, soma: 1 }) },
  { label: 'Explore spiritual traditions', domainScores: scores({ theoria: 5, sophia: 3, koinonia: 1 }) },
  { label: 'Cultivate solitude and silence', domainScores: scores({ theoria: 5, arete: 2, soma: 1 }) },
]

// Sum domain scores across multiple items
export function sumDomainScores(items: { domainScores: DomainScores }[]): DomainScores {
  const totals: DomainScores = {
    sophia: 0,
    phronesis: 0,
    arete: 0,
    koinonia: 0,
    soma: 0,
    techne: 0,
    theoria: 0,
  }
  for (const item of items) {
    for (const key of Object.keys(totals) as PursuitDomain[]) {
      totals[key] += item.domainScores[key]
    }
  }
  return totals
}
