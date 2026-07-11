import { redirect } from 'next/navigation';
import { createServerSupabaseClient, calculatePorchStreak } from '@/lib';
import {
	ProfileHeader,
	ProfileForm,
	LearningCalendar,
	MentorCard,
	RankLadder,
} from '@/components';
import { getMyMentor } from '@/app/dashboard/inbox-actions';

export default async function ProfilePage() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect('/auth/sign-in');

	const { data: profile } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', user.id)
		.single();

	if (!profile) {
		return <p className='p-8 text-sm text-gray-500'>Profile not found.</p>;
	}

	const { data: posts } = await supabase
		.from('porch_posts')
		.select('post_date')
		.eq('user_id', user.id);

	const days = new Set((posts ?? []).map((p) => p.post_date));
	const { current } = calculatePorchStreak(days);

	const isStudent = profile.role === 'student';
	const mentor = isStudent ? await getMyMentor() : null;

	return (
		<div className='max-w-6xl p-8'>
			<div className='mb-6'>
				<h1 className='mb-1 text-2xl font-bold text-gray-900'>
					Your profile
				</h1>
				<p className='text-sm text-gray-500'>
					This is how you&apos;ll appear on your porch updates.
				</p>
			</div>

			<div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
				<div className='space-y-4 lg:col-span-2'>
					<ProfileHeader userId={user.id} />
					<ProfileForm profile={profile} />
				</div>

				<div className='space-y-4 lg:col-span-1'>
					{isStudent && <MentorCard mentor={mentor} />}
					<LearningCalendar userId={user.id} />
					<RankLadder currentStreak={current} />
				</div>
			</div>
		</div>
	);
}
