'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getWallMessages(studentId: string) {
	const supabase = await createServerSupabaseClient();
	const { data, error } = await supabase
		.from('mentor_messages')
		.select(
			'id, student_id, sender_id, parent_id, body, read_at, created_at, sender:profiles!mentor_messages_sender_id_fkey(id, full_name, username, role)',
		)
		.eq('student_id', studentId)
		.order('created_at', { ascending: true });

	if (error) throw error;
	return data;
}

export async function postWallMessage(
	studentId: string,
	body: string,
	parentId?: string,
) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error('Not authenticated');

	const { error } = await supabase.from('mentor_messages').insert({
		student_id: studentId,
		sender_id: user.id,
		parent_id: parentId ?? null,
		body,
	});

	if (error) throw error;
	revalidatePath('/dashboard/inbox');
}

export async function markWallRead(studentId: string) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error('Not authenticated');

	const { error } = await supabase
		.from('mentor_messages')
		.update({ read_at: new Date().toISOString() })
		.eq('student_id', studentId)
		.neq('sender_id', user.id)
		.is('read_at', null);

	if (error) throw error;
}

export async function getMentorStudentList() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error('Not authenticated');

	const { data: assignments, error } = await supabase
		.from('mentor_assignments')
		.select(
			'student_id, student:profiles!mentor_assignments_student_id_fkey(id, full_name, username)',
		)
		.eq('mentor_id', user.id)
		.eq('status', 'active');

	if (error) throw error;

	const results = await Promise.all(
		(assignments ?? []).map(async (a) => {
			const { count } = await supabase
				.from('mentor_messages')
				.select('id', { count: 'exact', head: true })
				.eq('student_id', a.student_id)
				.is('read_at', null)
				.neq('sender_id', user.id);

			return { ...a, unreadCount: count ?? 0 };
		}),
	);

	return results;
}

export async function getMyMentor() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error('Not authenticated');

	const { data, error } = await supabase
		.from('mentor_assignments')
		.select(
			'mentor:profiles!mentor_assignments_mentor_id_fkey(id, full_name, username)',
		)
		.eq('student_id', user.id)
		.eq('status', 'active')
		.maybeSingle();

	if (error) throw error;
	return data?.mentor ?? null;
}
