import { createServerSupabaseClient } from '@/lib';
import { PorchFeed, LearningCalendar } from '@/components';

export default async function DashboardPage() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-bold text-gray-900'>
					Welcome back
					{user?.email ? `, ${user.email.split('@')[0]}` : ''}
				</h1>
				<p className='mt-1 text-sm text-gray-500'>
					Here is what your porch looks like today.
				</p>
			</div>

			{user && <LearningCalendar userId={user.id} />}

			<PorchFeed />
		</div>
	);
}
