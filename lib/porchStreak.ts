export function calculatePorchStreak(daysWithActivity: Set<string>) {
	let current = 0;
	const cursor = new Date();
	cursor.setHours(0, 0, 0, 0);

	while (true) {
		const key = cursor.toISOString().slice(0, 10);
		if (daysWithActivity.has(key)) {
			current++;
			cursor.setDate(cursor.getDate() - 1);
		} else {
			if (
				current === 0 &&
				key === new Date().toISOString().slice(0, 10)
			) {
				cursor.setDate(cursor.getDate() - 1);
				continue;
			}
			break;
		}
	}

	const sortedDays = Array.from(daysWithActivity).sort();
	let longest = 0;
	let run = 0;
	let prev: Date | null = null;

	for (const dayStr of sortedDays) {
		const day = new Date(dayStr);
		if (prev) {
			const diff =
				(day.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
			run = diff === 1 ? run + 1 : 1;
		} else {
			run = 1;
		}
		longest = Math.max(longest, run);
		prev = day;
	}

	return { current, longest };
}
