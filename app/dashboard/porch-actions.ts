'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib';
import type { Database, ReactionType } from '@/types/database';

type PorchCommentInsert =
	Database['public']['Tables']['porch_comments']['Insert'];
type PorchLikeInsert = Database['public']['Tables']['porch_likes']['Insert'];
type PorchLikeUpdate = Database['public']['Tables']['porch_likes']['Update'];

export async function createComment(postId: string, formData: FormData) {
	const content = (formData.get('content') as string)?.trim();
	if (!content) return { error: 'Comment cannot be empty' };

	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const payload: PorchCommentInsert = {
		post_id: postId,
		author_id: user.id,
		content,
	};

	const { error } = await supabase.from('porch_comments').insert(payload);

	if (error) return { error: error.message };

	revalidatePath('/dashboard');
	return { success: true };
}

export async function toggleLike(postId: string, reaction: ReactionType) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const { data: existing } = await supabase
		.from('porch_likes')
		.select('id, reaction_type')
		.eq('post_id', postId)
		.eq('user_id', user.id)
		.maybeSingle();

	if (existing && existing.reaction_type === reaction) {
		await supabase.from('porch_likes').delete().eq('id', existing.id);
	} else if (existing) {
		const update: PorchLikeUpdate = { reaction_type: reaction };
		await supabase.from('porch_likes').update(update).eq('id', existing.id);
	} else {
		const payload: PorchLikeInsert = {
			post_id: postId,
			user_id: user.id,
			reaction_type: reaction,
		};
		await supabase.from('porch_likes').insert(payload);
	}

	revalidatePath('/dashboard');
	return { success: true };
}
