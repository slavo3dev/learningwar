import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LearningCalendar } from '@/components/LearningCalendar/LearningCalendar';

export default async function CalendarPage() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/auth/sign-in');
	}

	return (
		<div className='p-6'>
			<h1 className='mb-6 text-xl font-semibold text-gray-900'>
				Learning Calendar
			</h1>
			<LearningCalendar userId={user.id} />
		</div>
	);
}
