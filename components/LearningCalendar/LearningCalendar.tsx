import { createServerSupabaseClient } from '@/lib';
import { HeatmapGrid } from '@/components/HeatmapGrid';

function getRangeStart(days: number) {
	const start = new Date();
	start.setDate(start.getDate() - days + 1);
	start.setHours(0, 0, 0, 0);
	return start;
}

function calculateStreaks(daysWithActivity: Set<string>) {
	// Walk backward from today to find current streak
	let current = 0;
	const cursor = new Date();
	cursor.setHours(0, 0, 0, 0);

	while (true) {
		const key = cursor.toISOString().slice(0, 10);
		if (daysWithActivity.has(key)) {
			current++;
			cursor.setDate(cursor.getDate() - 1);
		} else {
			// Allow "today" to be empty without breaking the streak (day isn't over yet)
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

	// Longest streak across the whole fetched range
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

export async function LearningCalendar({ userId }: { userId: string }) {
	const supabase = await createServerSupabaseClient();
	const start = getRangeStart(365);

	const { data: posts } = await supabase
		.from('porch_posts')
		.select('created_at')
		.eq('user_id', userId)
		.gte('created_at', start.toISOString());

	const countsByDay = new Map<string, number>();
	posts?.forEach((post) => {
		const day = post.created_at.slice(0, 10); // YYYY-MM-DD
		countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
	});

	const activityData = Array.from(countsByDay.entries()).map(
		([date, count]) => ({
			date,
			count,
		}),
	);

	const { current, longest } = calculateStreaks(new Set(countsByDay.keys()));

	return (
		<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
			<div className='mb-4 flex items-center justify-between border-b border-gray-100 pb-4'>
				<div>
					<p className='text-xs font-medium uppercase tracking-wide text-gray-400'>
						Learning Calendar
					</p>
					<p className='mt-0.5 text-sm text-gray-500'>
						Last 365 days of porch activity
					</p>
				</div>
				<div className='flex gap-6 text-right'>
					<div>
						<p className='text-lg font-bold text-[#1a6fca]'>
							{current}
						</p>
						<p className='text-xs text-gray-500'>day streak</p>
					</div>
					<div>
						<p className='text-lg font-bold text-gray-900'>
							{longest}
						</p>
						<p className='text-xs text-gray-500'>longest</p>
					</div>
				</div>
			</div>
			<HeatmapGrid data={activityData} />
		</div>
	);
}
