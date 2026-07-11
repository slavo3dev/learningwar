export const SIGN_IN_TAGLINES = [
	"Every Legend started as a Paides. You've already come further than that.",
	'180 days of showing up. That is the entire secret.',
	'The agoge does not care how you feel today. Show up anyway.',
	'Discipline is a streak you protect, not a mood you wait for.',
] as const;

export const SIGN_UP_TAGLINES = [
	'Every Legend starts as a Paides.',
	'You do not need to be a Hoplite yet. You just need to start.',
	'The agoge begins with a single day. This is that day.',
	'No one is born a Spartan. They are built, one day at a time.',
] as const;

export function pickTagline(pool: readonly string[]): string {
	return pool[Math.floor(Math.random() * pool.length)];
}
