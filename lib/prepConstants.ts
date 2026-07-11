export type PrepTrack = 'interview' | 'sales' | 'pitch';
export type PrepMode = 'qa' | 'guide';

export const TRACK_META: Record<
	PrepTrack,
	{
		label: string;
		roleLabel: string;
		rolePlaceholder: string;
		topicPlaceholder: string;
	}
> = {
	interview: {
		label: 'Interview Prep',
		roleLabel: 'Target role',
		rolePlaceholder: 'e.g. Frontend Engineer',
		topicPlaceholder: 'e.g. React and system design',
	},
	sales: {
		label: 'Sales Prep',
		roleLabel: 'Deal / role context',
		rolePlaceholder: 'e.g. SaaS Account Executive',
		topicPlaceholder: 'e.g. Handling pricing objections',
	},
	pitch: {
		label: 'Pitch Prep',
		roleLabel: 'Audience',
		rolePlaceholder: 'e.g. Seed-stage VCs',
		topicPlaceholder: 'e.g. Pitching an AI SaaS product',
	},
};

export const MODE_META: Record<
	PrepMode,
	{ label: string; description: string }
> = {
	qa: {
		label: 'Practice Q&A',
		description: 'Answer questions live and get AI-scored feedback',
	},
	guide: {
		label: 'Prep Guide',
		description: 'Get a structured guide to study before practicing',
	},
};

export type PrepQuestion = { id: string; question: string };

export type PrepAnswerResult = {
	id: string;
	question: string;
	answer: string;
	overallScore: number;
	relevance: number;
	clarity: number;
	completeness: number;
	suggestion: string;
};
