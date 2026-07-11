import { createServerSupabaseClient, calculatePorchStreak } from '@/lib';
import { getPorchLevel } from '@/lib/porchLevels';

export async function ProfileHeader({ userId }: { userId: string }) {
	const supabase = await createServerSupabaseClient();

	const { data: profile } = await supabase
		.from('profiles')
		.select('username, full_name, bio, role, created_at')
		.eq('id', userId)
		.single();

	const { data: posts } = await supabase
		.from('porch_posts')
		.select('post_date')
		.eq('user_id', userId);

	if (!profile) return null;

	const days = new Set((posts ?? []).map((p) => p.post_date));
	const { current, longest } = calculatePorchStreak(days);

	const displayName = profile.full_name || profile.username;
	const initials = displayName
		.split(' ')
		.map((w) => w[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();

	const level = getPorchLevel(current);
	const memberSince = new Date(profile.created_at).toLocaleDateString(
		'en-US',
		{
			month: 'long',
			year: 'numeric',
		},
	);

	return (
		<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
			<div className='flex items-start gap-4'>
				<div className='flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#1a6fca] text-xl font-semibold text-white'>
					{initials}
				</div>

				<div className='min-w-0 flex-1'>
					<div className='flex flex-wrap items-center gap-2'>
						<h2 className='text-lg font-semibold text-gray-900'>
							{displayName}
						</h2>
						<span className='rounded-full bg-[#1a6fca]/10 px-2 py-0.5 text-xs font-semibold text-[#1a6fca]'>
							{level.name}
							{level.level > 0 && ` · Lv.${level.level}`}
						</span>
					</div>
					<p className='text-sm text-gray-500'>@{profile.username}</p>
					{profile.bio && (
						<p className='mt-2 text-sm text-gray-700'>
							{profile.bio}
						</p>
					)}
					<p className='mt-2 text-xs text-gray-400'>
						Member since {memberSince}
					</p>
				</div>

				<div className='flex gap-4 text-right'>
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
		</div>
	);
}
