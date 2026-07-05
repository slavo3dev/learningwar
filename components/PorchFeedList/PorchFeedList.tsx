'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib';
import type { Database, PorchFeedPost, ReactionType } from '@/types/database';

type PorchPostInsert = Database['public']['Tables']['porch_posts']['Insert'];
type PorchCommentInsert =
	Database['public']['Tables']['porch_comments']['Insert'];
type PorchLikeInsert = Database['public']['Tables']['porch_likes']['Insert'];
type PorchLikeUpdate = Database['public']['Tables']['porch_likes']['Update'];

const PAGE_SIZE = 20;

const PORCH_FEED_SELECT = `
  id, user_id, what_learned, challenges, tomorrow, mood, is_public, post_date, created_at, updated_at,
  author:profiles ( username, full_name, avatar_url, role, streaks ( current_streak ) ),
  comments:porch_comments ( id, post_id, author_id, content, created_at, author:profiles ( username, full_name ) ),
  likes:porch_likes ( id, post_id, user_id, reaction_type )
`;

export async function createPost(formData: FormData) {
	const what_learned = (formData.get('what_learned') as string)?.trim();
	if (!what_learned) return { error: 'What you learned cannot be empty' };

	const challenges = (formData.get('challenges') as string)?.trim() || null;
	const tomorrow = (formData.get('tomorrow') as string)?.trim() || null;
	const moodRaw = formData.get('mood') as string;
	const mood = moodRaw ? Number(moodRaw) : null;
	const is_public = formData.get('is_public') === 'on';

	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const payload: PorchPostInsert = {
		user_id: user.id,
		what_learned,
		challenges,
		tomorrow,
		mood,
		is_public,
		post_date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
	};

	const { error } = await supabase.from('porch_posts').insert(payload);

	if (error) return { error: error.message };

	revalidatePath('/dashboard');
	return { success: true };
}

export async function createComment(postId: string, formData: FormData) {
	const content = (formData.get('content') as string)?.trim();
	if (!content) return { error: 'Comment cannot be empty' };

	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const { data: post } = await supabase
		.from('porch_posts')
		.select('user_id')
		.eq('id', postId)
		.single();

	if (post?.user_id === user.id) {
		return { error: 'You cannot comment on your own post' };
	}

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

	const { data: post } = await supabase
		.from('porch_posts')
		.select('user_id')
		.eq('id', postId)
		.single();

	if (post?.user_id === user.id) {
		return { error: 'You cannot react to your own post' };
	}

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

export async function getMorePosts(offset: number) {
	const supabase = await createServerSupabaseClient();

	const { data, error } = await supabase
		.from('porch_posts')
		.select(PORCH_FEED_SELECT)
		.eq('is_public', true)
		.order('created_at', { ascending: false })
		.range(offset, offset + PAGE_SIZE - 1);

	if (error) return { posts: [] as PorchFeedPost[], hasMore: false };

	return {
		posts: (data ?? []) as unknown as PorchFeedPost[],
		hasMore: (data?.length ?? 0) === PAGE_SIZE,
	};
}
