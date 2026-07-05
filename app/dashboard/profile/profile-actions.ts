'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib';
import type { Database } from '@/types/database';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function updateProfile(formData: FormData) {
	const full_name = (formData.get('full_name') as string)?.trim();
	const username = (formData.get('username') as string)?.trim();
	const bio = (formData.get('bio') as string)?.trim() || null;
	const show_email = formData.get('show_email') === 'on';

	if (!username) return { error: 'Username cannot be empty' };

	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const payload: ProfileUpdate = {
		full_name: full_name || null,
		username,
		bio,
		show_email,
		updated_at: new Date().toISOString(),
	};

	const { error } = await supabase
		.from('profiles')
		.update(payload)
		.eq('id', user.id);

	if (error) {
		if (error.code === '23505') {
			return { error: 'That username is already taken' };
		}
		return { error: error.message };
	}

	revalidatePath('/dashboard');
	revalidatePath('/dashboard/profile');
	return { success: true };
}
