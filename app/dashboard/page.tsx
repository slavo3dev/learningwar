import { createServerSupabaseClient } from '@/lib';
import { PorchFeed, LearningCalendar } from '@/components';

export default async function DashboardPage() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	return (
		<div>
			<div className='sticky top-0 z-10 -mx-8 -mt-8 space-y-4 bg-gray-50 px-8 pb-4 pt-8'>
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
			</div>

			<div className='mt-4'>
				<PorchFeed />
			</div>
		</div>
	);
}
