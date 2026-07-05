'use client';

import { useState, useTransition } from 'react';
import { createComment, toggleLike } from '@/app/dashboard/porch-actions';
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
	post,
	currentUserId,
}: {
	post: PorchFeedPost;
	currentUserId: string;
}) {
	const [isPending, startTransition] = useTransition();
	const [showComments, setShowComments] = useState(false);

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

	function handleReact(reaction: ReactionType) {
		if (isOwnPost) return;
		startTransition(() => {
			toggleLike(post.id, reaction);
		});
	}

	function handleComment(formData: FormData) {
		if (isOwnPost) return;
		startTransition(() => {
			createComment(post.id, formData);
		});
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
				<span className='text-xs text-gray-400'>
					{new Date(post.created_at).toLocaleString()}
				</span>
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
					className='ml-auto text-xs font-medium text-gray-500 hover:text-gray-700'>
					{post.comments?.length ?? 0} comments
				</button>
			</div>

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
