import { createServerSupabaseClient } from '@/lib';
import { PostCard, PorchForm } from '@/components';
import type { PorchFeedPost } from '@/types/database';

export async function PorchFeed() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { data: posts } = await supabase
		.from('porch_posts')
		.select(
			`
      id, user_id, what_learned, challenges, tomorrow, mood, is_public, post_date, created_at, updated_at,
      author:profiles ( full_name, avatar_url, role ),
      comments:porch_comments ( id, post_id, author_id, content, created_at, author:profiles ( full_name ) ),
      likes:porch_likes ( id, post_id, user_id, reaction_type )
    `,
		)
		.eq('is_public', true)
		.order('created_at', { ascending: false });

	const feedPosts = (posts ?? []) as unknown as PorchFeedPost[];

	return (
		<div className='space-y-4'>
			<PorchForm />

			{feedPosts.map((post) => (
				<PostCard
					key={post.id}
					post={post}
					currentUserId={user?.id ?? ''}
				/>
			))}

			{feedPosts.length === 0 && (
				<p className='py-6 text-center text-sm text-gray-500'>
					No public porch updates yet — be the first to share
					something.
				</p>
			)}
		</div>
	);
}
