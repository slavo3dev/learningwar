import { createServerSupabaseClient } from '@/lib';

export default async function DashboardPage() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	return (
		<div>
			<h1 className='text-2xl font-bold text-gray-900'>
				Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
			</h1>
			<p className='mt-2 text-gray-600'>
				This is your Daily Porch. Streaks, todays session, and ARI
				check-ins will live here.
			</p>
		</div>
	);
}
