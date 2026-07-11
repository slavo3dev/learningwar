import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getWallMessages } from '@/app/dashboard/inbox-actions';
import { MessageThread } from '@/components/MessageThread/MessageThread';
import { MentorStudentList } from '@/components/MentorStudentList/MentorStudentList';

export default async function InboxPage() {
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

	const isMentorOrAdmin =
		profile?.role === 'junior_mentor' ||
		profile?.role === 'mentor' ||
		profile?.role === 'admin';

	if (isMentorOrAdmin) {
		return (
			<div className='p-6'>
				<h1 className='mb-6 text-xl font-semibold text-gray-900'>
					Mentor Inbox
				</h1>
				<MentorStudentList />
			</div>
		);
	}

	const messages = await getWallMessages(user.id);

	return (
		<div className='p-6'>
			<h1 className='mb-6 text-xl font-semibold text-gray-900'>
				Your Mentor Wall
			</h1>
			<MessageThread
				studentId={user.id}
				currentUserId={user.id}
				initialMessages={messages}
			/>
		</div>
	);
}
