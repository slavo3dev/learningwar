import { createServerSupabaseClient } from '@/lib';
import { ProfileForm } from '@/components';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect('/sign-in');

	const { data: profile } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', user.id)
		.single();

	if (!profile)
		return <p className='text-sm text-gray-500'>Profile not found.</p>;

	return (
		<div>
			<h1 className='mb-1 text-2xl font-bold text-gray-900'>
				Your profile
			</h1>
			<p className='mb-6 text-sm text-gray-500'>
				This is how you will appear on your porch updates.
			</p>
			<ProfileForm profile={profile} />
		</div>
	);
}
