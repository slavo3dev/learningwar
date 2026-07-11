export type SessionDifficulty =
	| 'basic'
	| 'medium'
	| 'advanced'
	| 'expert'
	| 'legend';

export const DIFFICULTY_META: Record<
	SessionDifficulty,
	{ label: string; description: string }
> = {
	basic: {
		label: 'Basic',
		description: 'Fundamentals and core definitions',
	},
	medium: {
		label: 'Medium',
		description: 'Applying concepts to realistic scenarios',
	},
	advanced: {
		label: 'Advanced',
		description: 'Deeper mechanics, edge cases, tradeoffs',
	},
	expert: {
		label: 'Expert',
		description: 'Nuanced judgment calls, subtle distinctions',
	},
	legend: {
		label: 'Legend',
		description: 'Extremely rigorous — the hardest questions',
	},
};

export type QuizQuestion =
	| {
			id: string;
			type: 'multiple_choice';
			question: string;
			options: string[];
			correctIndex: number;
	  }
	| {
			id: string;
			type: 'open_ended';
			question: string;
			rubric: string;
	  };
