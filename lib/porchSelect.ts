export const PORCH_FEED_SELECT = `
  id, user_id, what_learned, challenges, tomorrow, mood, is_public, post_date, created_at, updated_at,
  author:profiles ( full_name, avatar_url, role, streaks ( current_streak ) ),
  comments:porch_comments ( id, post_id, author_id, content, created_at, author:profiles ( full_name ) ),
  likes:porch_likes ( id, post_id, user_id, reaction_type )
`;
