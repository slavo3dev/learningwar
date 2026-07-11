import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
	getAllProfiles,
	getMentorAssignmentsMap,
} from '@/app/dashboard/admin-actions';
import { UserRoleManager } from '@/components/UserRoleManager/UserRoleManager';

export default async function AdminPage() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect('/auth/sign-in');

	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profile?.role !== 'admin') {
		redirect('/dashboard');
	}

	const [users, assignments] = await Promise.all([
		getAllProfiles(),
		getMentorAssignmentsMap(),
	]);

	return (
		<div className='p-6'>
			<h1 className='mb-2 text-xl font-semibold text-gray-900'>
				User Management
			</h1>
			<p className='mb-6 text-sm text-gray-500'>
				Change roles or assign mentors to students.
			</p>
			<UserRoleManager users={users} assignments={assignments} />
		</div>
	);
}
