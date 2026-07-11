export interface PorchLevel {
	level: number;
	name: string;
	minStreak: number;
}

export const PORCH_LEVELS: PorchLevel[] = [
	{ level: 0, name: 'Paides', minStreak: 0 },
	{ level: 1, name: 'Paidiskoi', minStreak: 21 },
	{ level: 2, name: 'Hebon', minStreak: 41 },
	{ level: 3, name: 'Eiren', minStreak: 61 },
	{ level: 4, name: 'Hoplite', minStreak: 81 },
	{ level: 5, name: 'Hippeis', minStreak: 101 },
	{ level: 6, name: 'Lochagos', minStreak: 121 },
	{ level: 7, name: 'Polemarch', minStreak: 141 },
	{ level: 8, name: 'Ephor', minStreak: 161 },
	{ level: 9, name: 'Spartan Legend', minStreak: 180 },
];

export function getPorchLevel(streak: number): PorchLevel {
	let current = PORCH_LEVELS[0];
	for (const lvl of PORCH_LEVELS) {
		if (streak >= lvl.minStreak) current = lvl;
	}
	return current;
}
