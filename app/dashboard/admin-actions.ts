'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/types/database';

export async function getAllProfiles() {
	const supabase = await createServerSupabaseClient();
	const { data, error } = await supabase
		.from('profiles')
		.select('id, username, full_name, role')
		.order('created_at');

	if (error) throw error;
	return data;
}

export async function getMentorAssignmentsMap() {
	const supabase = await createServerSupabaseClient();
	const { data, error } = await supabase
		.from('mentor_assignments')
		.select('student_id, mentor_id')
		.eq('status', 'active');

	if (error) throw error;

	const map: Record<string, string> = {};
	for (const row of data ?? []) {
		map[row.student_id] = row.mentor_id;
	}
	return map;
}

export async function updateUserRole(userId: string, newRole: UserRole) {
	const supabase = await createServerSupabaseClient();
	const { error } = await supabase.rpc('admin_set_role', {
		target_user_id: userId,
		new_role: newRole,
	});

	if (error) throw error;
	revalidatePath('/dashboard/admin');
}

export async function assignMentorAdmin(studentId: string, mentorId: string) {
	const supabase = await createServerSupabaseClient();
	const { error } = await supabase.rpc('assign_mentor', {
		student_id: studentId,
		mentor_id: mentorId,
	});

	if (error) throw error;
	revalidatePath('/dashboard/admin');
	revalidatePath('/dashboard/inbox');
}
