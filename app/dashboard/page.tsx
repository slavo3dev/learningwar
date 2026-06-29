import { createServerSupabaseClient } from '@/lib';
import { PorchFeed } from '@/components';

export default async function DashboardPage() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	return (
		<div>
			<h1 className='mb-1 text-2xl font-bold text-gray-900'>
				Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
			</h1>
			<p className='mb-6 text-sm text-gray-500'>
				Here is what your porch looks like today.
			</p>
			<PorchFeed />
		</div>
	);
}
