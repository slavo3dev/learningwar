'use client';

import { useState, useTransition } from 'react';
import {
	createComment,
	deleteComment,
	deletePost,
	getPost,
	toggleLike,
	updateComment,
	updatePost,
} from '@/app/dashboard/porch-actions';
import {
	SpartanIcon,
	LionIcon,
	WolfIcon,
} from '@/components/ReactionIcons/ReactionIcons';
import { getPorchLevel } from '@/lib/porchLevels';
import type { PorchFeedPost, ReactionType } from '@/types/database';

const reactionMeta: Record<
	ReactionType,
	{ label: string; Icon: typeof SpartanIcon }
> = {
	spartan: { label: 'Spartan', Icon: SpartanIcon },
	lion: { label: 'Lion', Icon: LionIcon },
	wolf: { label: 'Wolf', Icon: WolfIcon },
};

export function PostCard({
	post: initialPost,
	currentUserId,
	onDeleted,
}: {
	post: PorchFeedPost;
	currentUserId: string;
	onDeleted?: (postId: string) => void;
}) {
	const [post, setPost] = useState(initialPost);
	const [isPending, startTransition] = useTransition();
	const [showComments, setShowComments] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
	const [editingCommentContent, setEditingCommentContent] = useState('');
	const [error, setError] = useState<string | null>(null);

	const isOwnPost = post.user_id === currentUserId;

	const myReaction = post.likes?.find(
		(l) => l.user_id === currentUserId,
	)?.reaction_type;
	const counts: Record<ReactionType, number> = {
		spartan: 0,
		lion: 0,
		wolf: 0,
	};
	post.likes?.forEach((l) => counts[l.reaction_type]++);

	const streak = post.author?.streaks?.current_streak ?? 0;
	const level = getPorchLevel(streak);
	const displayName =
		post.author?.full_name || post.author?.username || 'Learner';
	const showEmail = post.author?.show_email && post.author?.email;
	const commentCount = post.comments?.length ?? 0;

	async function refreshPost() {
		const fresh = await getPost(post.id);
		if (fresh) setPost(fresh);
	}

	function handleReact(reaction: ReactionType) {
		if (isOwnPost) return;

		// Snapshot current post for rollback if the server action fails.
		const prevPost = post;

		// Mirror the server-side toggle logic to compute the optimistic new likes list.
		const existingLike = post.likes?.find((l) => l.user_id === currentUserId);
		let newLikes: NonNullable<typeof post.likes>;

		if (existingLike?.reaction_type === reaction) {
			// Same reaction → toggle off (remove)
			newLikes = (post.likes ?? []).filter((l) => l.user_id !== currentUserId);
		} else if (existingLike) {
			// Different reaction → switch
			newLikes = (post.likes ?? []).map((l) =>
				l.user_id === currentUserId ? { ...l, reaction_type: reaction } : l,
			);
		} else {
			// No prior reaction → add (temp ID replaced by refreshPost on success)
			newLikes = [
				...(post.likes ?? []),
				{
					id: crypto.randomUUID(),
					post_id: post.id,
					user_id: currentUserId,
					reaction_type: reaction,
					created_at: new Date().toISOString(),
				},
			];
		}

		// Apply immediately — user sees the change with zero perceived delay.
		setPost((prev) => ({ ...prev, likes: newLikes }));

		startTransition(async () => {
			const result = await toggleLike(post.id, reaction);
			if (result?.error) {
				// Revert the optimistic update so the UI stays truthful.
				setPost(prevPost);
				setError(result.error);
				return;
			}
			// Sync authoritative data (replaces the temp ID with the real DB id).
			await refreshPost();
		});
	}

	function handleComment(formData: FormData) {
		if (isOwnPost) return;
		startTransition(async () => {
			const result = await createComment(post.id, formData);
			if (result?.error) {
				setError(result.error);
				return;
			}
			await refreshPost();
		});
	}

	function handleSaveEdit(formData: FormData) {
		startTransition(async () => {
			const result = await updatePost(post.id, formData);
			if (result?.error) {
				setError(result.error);
				return;
			}
			setIsEditing(false);
			await refreshPost();
		});
	}

	function handleEditComment(commentId: string, currentContent: string) {
		setEditingCommentId(commentId);
		setEditingCommentContent(currentContent);
		setError(null);
	}

	function handleCancelEditComment() {
		setEditingCommentId(null);
		setEditingCommentContent('');
		setError(null);
	}

	function handleSaveCommentEdit(commentId: string) {
		startTransition(async () => {
			const result = await updateComment(commentId, editingCommentContent);
			if (result?.error) {
				setError(result.error);
				return;
			}
			setEditingCommentId(null);
			setEditingCommentContent('');
			await refreshPost();
		});
	}

	function handleDeleteComment(commentId: string) {
		if (!window.confirm('Delete this comment? This cannot be undone.')) return;
		startTransition(async () => {
			const result = await deleteComment(commentId);
			if (result?.error) {
				setError(result.error);
				return;
			}
			await refreshPost();
		});
	}

	function handleDelete() {
		if (
			!window.confirm('Delete this porch update? This cannot be undone.')
		) {
			return;
		}
		startTransition(async () => {
			const result = await deletePost(post.id);
			if (result?.error) {
				setError(result.error);
				return;
			}
			onDeleted?.(post.id);
		});
	}

	if (isEditing) {
		return (
			<div className='rounded-lg border border-[#1a6fca]/30 bg-white p-4 shadow-sm'>
				<form action={handleSaveEdit} className='space-y-3'>
					<div>
						<label className='mb-1 block text-xs font-medium text-gray-600'>
							What you learned
						</label>
						<textarea
							name='what_learned'
							rows={2}
							required
							defaultValue={post.what_learned}
							className='w-full resize-none rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-[#1a6fca]'
						/>
					</div>
					<div>
						<label className='mb-1 block text-xs font-medium text-gray-600'>
							Challenges
						</label>
						<textarea
							name='challenges'
							rows={2}
							defaultValue={post.challenges ?? ''}
							className='w-full resize-none rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-[#1a6fca]'
						/>
					</div>
					<div>
						<label className='mb-1 block text-xs font-medium text-gray-600'>
							Plan for tomorrow
						</label>
						<textarea
							name='tomorrow'
							rows={2}
							defaultValue={post.tomorrow ?? ''}
							className='w-full resize-none rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-[#1a6fca]'
						/>
					</div>

					{error && <p className='text-xs text-red-600'>{error}</p>}

					<div className='flex justify-end gap-2'>
						<button
							type='button'
							onClick={() => {
								setIsEditing(false);
								setError(null);
							}}
							className='rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100'>
							Cancel
						</button>
						<button
							type='submit'
							disabled={isPending}
							className='rounded-md bg-[#1a6fca] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1558a3] disabled:opacity-50'>
							{isPending ? 'Saving...' : 'Save'}
						</button>
					</div>
				</form>
			</div>
		);
	}

	return (
		<div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
			<div className='flex items-center justify-between'>
				<div>
					<p className='text-sm font-semibold text-gray-900'>
						{displayName}
					</p>
					{showEmail && (
						<p className='text-xs text-gray-400'>
							{post.author?.email}
						</p>
					)}
					<div className='mt-0.5 flex items-center gap-1.5'>
						<span className='text-xs font-medium text-[#1a6fca]'>
							{level.name}
						</span>
						{level.level > 0 && (
							<span className='rounded-full bg-[#1a6fca]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#1a6fca]'>
								Lv.{level.level}
							</span>
						)}
						{streak > 0 && (
							<span className='text-[10px] text-gray-400'>
								🔥 {streak}d
							</span>
						)}
					</div>
				</div>

				<div className='flex items-center gap-2'>
					{isOwnPost && (
						<>
							<button
								onClick={() => {
									setError(null);
									setIsEditing(true);
								}}
								className='text-xs font-medium text-gray-400 hover:text-[#1a6fca]'>
								Edit
							</button>
							<button
								onClick={handleDelete}
								disabled={isPending}
								className='text-xs font-medium text-gray-400 hover:text-red-600'>
								Delete
							</button>
						</>
					)}
					{/* suppressHydrationWarning: toLocaleString() is timezone-dependent.
					    Server (UTC) and client (local tz) produce different text — this is
					    intentional. React replaces the UTC value with local time on hydration. */}
				<span suppressHydrationWarning className='text-xs text-gray-400'>
						{new Date(post.created_at).toLocaleString()}
					</span>
				</div>
			</div>

			<p className='mt-3 whitespace-pre-wrap text-sm text-gray-800'>
				{post.what_learned}
			</p>

			{(post.challenges || post.tomorrow) && (
				<div className='mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2'>
					{post.challenges && (
						<div className='rounded-lg bg-amber-50 p-2.5'>
							<p className='text-xs font-semibold text-amber-700'>
								Challenge
							</p>
							<p className='mt-0.5 text-sm text-amber-900'>
								{post.challenges}
							</p>
						</div>
					)}
					{post.tomorrow && (
						<div className='rounded-lg bg-blue-50 p-2.5'>
							<p className='text-xs font-semibold text-[#1a6fca]'>
								Tomorrow
							</p>
							<p className='mt-0.5 text-sm text-gray-800'>
								{post.tomorrow}
							</p>
						</div>
					)}
				</div>
			)}

			<div className='mt-4 flex items-center gap-4 border-t border-gray-100 pt-3'>
				{(Object.keys(reactionMeta) as ReactionType[]).map((key) => {
					const { label, Icon } = reactionMeta[key];
					const active = myReaction === key;
					return (
						<button
							key={key}
							disabled={isPending || isOwnPost}
							onClick={() => handleReact(key)}
							title={
								isOwnPost
									? 'You cannot react to your own post'
									: label
							}
							className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
								isOwnPost
									? 'cursor-not-allowed text-gray-300'
									: active
										? 'bg-[#1a6fca]/10 text-[#1a6fca]'
										: 'text-gray-500 hover:bg-gray-100'
							}`}>
							<Icon className='h-4 w-4' />
							{counts[key] > 0 && <span>{counts[key]}</span>}
						</button>
					);
				})}

				<button
					onClick={() => setShowComments((s) => !s)}
					className={`ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
						showComments
							? 'bg-[#1a6fca]/10 text-[#1a6fca]'
							: 'text-gray-500 hover:bg-gray-100'
					}`}>
					<svg
						className='h-4 w-4'
						fill='none'
						viewBox='0 0 24 24'
						stroke='currentColor'
						strokeWidth={2}>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
						/>
					</svg>
					{commentCount > 0 ? (
						<span>
							{commentCount}{' '}
							{commentCount === 1 ? 'comment' : 'comments'}
						</span>
					) : (
						<span>Comment</span>
					)}
				</button>
			</div>

			{error && <p className='mt-2 text-xs text-red-600'>{error}</p>}

			{showComments && (
				<div className='mt-3 space-y-2 border-t border-gray-100 pt-3'>
					{post.comments?.map((c) => {
						const isOwnComment = c.author_id === currentUserId;
						const isBeingEdited = editingCommentId === c.id;
						const authorName =
							c.author?.full_name || c.author?.username || 'Learner';

						if (isBeingEdited) {
							return (
								<div key={c.id} className='rounded-md border border-[#1a6fca]/30 bg-white px-3 py-2'>
									<p className='mb-1.5 text-xs font-medium text-gray-500'>
										Editing comment
									</p>
									<textarea
										value={editingCommentContent}
										onChange={(e) =>
											setEditingCommentContent(e.target.value)
										}
										rows={2}
										maxLength={300}
										className='w-full resize-none rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-[#1a6fca]'
									/>
									<div className='mt-1.5 flex items-center justify-between'>
										<span className='text-[10px] text-gray-400'>
											{editingCommentContent.length}/300
										</span>
										<div className='flex gap-2'>
											<button
												onClick={handleCancelEditComment}
												className='rounded px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100'>
												Cancel
											</button>
											<button
												onClick={() => handleSaveCommentEdit(c.id)}
												disabled={
													isPending ||
													!editingCommentContent.trim()
												}
												className='rounded bg-[#1a6fca] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#1558a3] disabled:opacity-50'>
												{isPending ? 'Saving…' : 'Save'}
											</button>
										</div>
									</div>
								</div>
							);
						}

						return (
							<div
								key={c.id}
								className='rounded-md bg-gray-50 px-3 py-2 text-sm'>
								<div className='flex items-start justify-between gap-2'>
									<p className='text-gray-700'>
										<span className='font-medium text-gray-900'>
											{authorName}:{' '}
										</span>
										{c.content}
									</p>
									{isOwnComment && (
										<div className='flex shrink-0 gap-2 pt-0.5'>
											<button
												onClick={() =>
													handleEditComment(c.id, c.content)
												}
												className='text-[11px] font-medium text-gray-400 hover:text-[#1a6fca]'>
												Edit
											</button>
											<button
												onClick={() => handleDeleteComment(c.id)}
												disabled={isPending}
												className='text-[11px] font-medium text-gray-400 hover:text-red-600 disabled:opacity-40'>
												Delete
											</button>
										</div>
									)}
								</div>
							</div>
						);
					})}

					{isOwnPost ? (
						<p className='text-xs text-gray-400'>
							You cannot comment on your own post.
						</p>
					) : (
						<form action={handleComment} className='flex gap-2'>
							<input
								name='content'
								placeholder='Write a comment...'
								className='flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[#1a6fca]'
							/>
							<button
								type='submit'
								disabled={isPending}
								className='rounded-md bg-[#1a6fca] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1558a3]'>
								Send
							</button>
						</form>
					)}
				</div>
			)}
		</div>
	);
}
