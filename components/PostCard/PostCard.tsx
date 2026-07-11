'use client';

import { useState, useTransition } from 'react';
import {
	createComment,
	deletePost,
	getPost,
	toggleLike,
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
		startTransition(async () => {
			const result = await toggleLike(post.id, reaction);
			if (result?.error) {
				setError(result.error);
				return;
			}
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
					<span className='text-xs text-gray-400'>
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
					{post.comments?.map((c) => (
						<div
							key={c.id}
							className='rounded-md bg-gray-50 px-3 py-2 text-sm'>
							<span className='font-medium text-gray-900'>
								{c.author?.full_name ||
									c.author?.username ||
									'Learner'}
								:{' '}
							</span>
							<span className='text-gray-700'>{c.content}</span>
						</div>
					))}

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
