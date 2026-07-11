import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getWallMessages, markWallRead } from '@/app/dashboard/inbox-actions';
import { MessageThread } from '@/components/MessageThread/MessageThread';

export default async function StudentWallPage({
	params,
}: {
	params: Promise<{ studentId: string }>;
}) {
	const { studentId } = await params;
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect('/auth/sign-in');

	const { data: profile } = await supabase
		.from('profiles')
		.select('full_name, username')
		.eq('id', studentId)
		.maybeSingle();

	if (!profile) notFound();

	await markWallRead(studentId);
	const messages = await getWallMessages(studentId);

	return (
		<div className='p-6'>
			<h1 className='mb-6 text-xl font-semibold text-gray-900'>
				{profile.full_name ?? profile.username}&apos;s Wall
			</h1>
			<MessageThread
				studentId={studentId}
				currentUserId={user.id}
				initialMessages={messages}
			/>
		</div>
	);
}
