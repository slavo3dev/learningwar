import { createServerSupabaseClient } from '@/lib';
import { PorchFeedList, DailyUpdateButton } from '@/components';
import type { PorchFeedPost } from '@/types/database';

const PAGE_SIZE = 20;

const PORCH_FEED_SELECT = `
  id, user_id, what_learned, challenges, tomorrow, mood, is_public, post_date, created_at, updated_at,
  author:profiles ( username, full_name, avatar_url, role, email, show_email, streaks ( current_streak ) ),
  comments:porch_comments ( id, post_id, author_id, content, created_at, author:profiles ( username, full_name ) ),
  likes:porch_likes ( id, post_id, user_id, reaction_type )
`;

export async function PorchFeed() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { data: posts } = await supabase
		.from('porch_posts')
		.select(PORCH_FEED_SELECT)
		.eq('is_public', true)
		.order('created_at', { ascending: false })
		.range(0, PAGE_SIZE - 1);

	const feedPosts = (posts ?? []) as unknown as PorchFeedPost[];

	return (
		<>
			<PorchFeedList
				initialPosts={feedPosts}
				currentUserId={user?.id ?? ''}
				hasMore={feedPosts.length === PAGE_SIZE}
			/>
			<DailyUpdateButton />
		</>
	);
}
