import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib';
import { ProfileHeader, ProfileForm, LearningCalendar } from '@/components';

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

	return (
		<div className='max-w-2xl space-y-4 p-8'>
			<div>
				<h1 className='mb-1 text-2xl font-bold text-gray-900'>
					Your profile
				</h1>
				<p className='text-sm text-gray-500'>
					This is how you&apos;ll appear on your porch updates.
				</p>
			</div>

			<ProfileHeader userId={user.id} />
			<LearningCalendar userId={user.id} />
			<ProfileForm profile={profile} />
		</div>
	);
}
