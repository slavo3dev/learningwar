import { createServerSupabaseClient, calculatePorchStreak } from '@/lib';
import { HeatmapGrid } from '@/components/HeatmapGrid';

function getRangeStart(days: number) {
	const start = new Date();
	start.setDate(start.getDate() - days + 1);
	start.setHours(0, 0, 0, 0);
	return start;
}

export async function LearningCalendar({ userId }: { userId: string }) {
	const supabase = await createServerSupabaseClient();
	const start = getRangeStart(365);

	const { data: posts } = await supabase
		.from('porch_posts')
		.select('post_date')
		.eq('user_id', userId)
		.gte('post_date', start.toISOString().slice(0, 10));

	const countsByDay = new Map<string, number>();
	posts?.forEach((post) => {
		countsByDay.set(
			post.post_date,
			(countsByDay.get(post.post_date) ?? 0) + 1,
		);
	});

	const activityData = Array.from(countsByDay.entries()).map(
		([date, count]) => ({
			date,
			count,
		}),
	);

	const { current, longest } = calculatePorchStreak(
		new Set(countsByDay.keys()),
	);

	return (
		<div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
			<div className='mb-3 flex items-center justify-between border-b border-gray-100 pb-3'>
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
