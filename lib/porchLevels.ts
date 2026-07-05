export interface PorchLevel {
	level: number;
	name: string;
	minStreak: number;
}

export const PORCH_LEVELS: PorchLevel[] = [
	{ level: 0, name: 'Student', minStreak: 0 },
	{ level: 1, name: 'Initiate', minStreak: 21 },
	{ level: 2, name: 'Apprentice', minStreak: 41 },
	{ level: 3, name: 'Warrior', minStreak: 61 },
	{ level: 4, name: 'Hunter', minStreak: 81 },
	{ level: 5, name: 'Wolf', minStreak: 101 },
	{ level: 6, name: 'Lion', minStreak: 121 },
	{ level: 7, name: 'Spartan', minStreak: 141 },
	{ level: 8, name: 'Samurai', minStreak: 161 },
	{ level: 9, name: 'Legend', minStreak: 180 },
];

export function getPorchLevel(streak: number): PorchLevel {
	let current = PORCH_LEVELS[0];
	for (const lvl of PORCH_LEVELS) {
		if (streak >= lvl.minStreak) current = lvl;
	}
	return current;
}
