'use client';

import { useState, useTransition } from 'react';
import { createComment, toggleLike } from '@/app/dashboard/porch-actions';
import { SpartanIcon, LionIcon, WolfIcon } from '@/components';
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

	const myReaction = post.likes?.find(
		(l) => l.user_id === currentUserId,
	)?.reaction_type;
	const counts: Record<ReactionType, number> = {
		spartan: 0,
		lion: 0,
		wolf: 0,
	};
	post.likes?.forEach((l) => counts[l.reaction_type]++);

	function handleReact(reaction: ReactionType) {
		startTransition(() => {
			toggleLike(post.id, reaction);
		});
	}

	function handleComment(formData: FormData) {
		startTransition(() => {
			createComment(post.id, formData);
		});
	}

	return (
		<div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
			<div className='flex items-center justify-between'>
				<div>
					<p className='text-sm font-semibold text-gray-900'>
						{post.author?.full_name ?? 'Learner'}
					</p>
					{post.author?.role && (
						<span className='text-xs text-[#1a6fca]'>
							{post.author.role}
						</span>
					)}
				</div>
				<span className='text-xs text-gray-400'>
					{new Date(post.created_at).toLocaleString()}
				</span>
			</div>

			<p className='mt-3 whitespace-pre-wrap text-sm text-gray-800'>
				{post.what_learned}
			</p>
			{post.challenges && (
				<p className='mt-2 text-sm text-gray-500'>
					<span className='font-medium'>Challenge:</span>{' '}
					{post.challenges}
				</p>
			)}
			{post.tomorrow && (
				<p className='mt-1 text-sm text-gray-500'>
					<span className='font-medium'>Tomorrow:</span>{' '}
					{post.tomorrow}
				</p>
			)}

			<div className='mt-4 flex items-center gap-4 border-t border-gray-100 pt-3'>
				{(Object.keys(reactionMeta) as ReactionType[]).map((key) => {
					const { label, Icon } = reactionMeta[key];
					const active = myReaction === key;
					return (
						<button
							key={key}
							disabled={isPending}
							onClick={() => handleReact(key)}
							className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
								active
									? 'bg-[#1a6fca]/10 text-[#1a6fca]'
									: 'text-gray-500 hover:bg-gray-100'
							}`}
							title={label}>
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
								{c.author?.full_name ?? 'Learner'}:{' '}
							</span>
							<span className='text-gray-700'>{c.content}</span>
						</div>
					))}

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
				</div>
			)}
		</div>
	);
}
