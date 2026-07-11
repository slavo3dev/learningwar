export interface PorchLevel {
	level: number;
	name: string;
	minStreak: number;
	description: string;
}

export const PORCH_LEVELS: PorchLevel[] = [
	{
		level: 0,
		name: 'Paides',
		minStreak: 0,
		description:
			'Every Spartan started here — a young trainee learning discipline and the basics.',
	},
	{
		level: 1,
		name: 'Paidiskoi',
		minStreak: 21,
		description:
			'An advanced trainee, tested with harder drills and greater responsibility.',
	},
	{
		level: 2,
		name: 'Hebon',
		minStreak: 41,
		description:
			'A young adult who has entered serious training, preparing for real service.',
	},
	{
		level: 3,
		name: 'Eiren',
		minStreak: 61,
		description:
			'A junior leader trusted to guide and train those just starting out.',
	},
	{
		level: 4,
		name: 'Hoplite',
		minStreak: 81,
		description:
			'A full citizen-soldier, trained and equipped to fight shoulder-to-shoulder in the phalanx.',
	},
	{
		level: 5,
		name: 'Hippeis',
		minStreak: 101,
		description:
			"Handpicked as one of the elite 300 — the king's personal guard, the best of the best.",
	},
	{
		level: 6,
		name: 'Lochagos',
		minStreak: 121,
		description:
			'A commander trusted to lead an entire company of soldiers in battle.',
	},
	{
		level: 7,
		name: 'Polemarch',
		minStreak: 141,
		description:
			'A senior general overseeing multiple companies and major military strategy.',
	},
	{
		level: 8,
		name: 'Ephor',
		minStreak: 161,
		description:
			'One of five supreme overseers of the entire state — extraordinary trust and authority.',
	},
	{
		level: 9,
		name: 'Spartan Legend',
		minStreak: 180,
		description:
			'The pinnacle — consistency sustained so long it becomes legendary.',
	},
];

export function getPorchLevel(streak: number): PorchLevel {
	let current = PORCH_LEVELS[0];
	for (const lvl of PORCH_LEVELS) {
		if (streak >= lvl.minStreak) current = lvl;
	}
	return current;
}
