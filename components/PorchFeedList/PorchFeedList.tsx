'use client';

import { useEffect, useState, useTransition } from 'react';
import { PostCard } from '@/components/PostCard/PostCard';
import { getFilteredPosts } from '@/app/dashboard/porch-actions';
import type { PorchFeedPost } from '@/types/database';

export function PorchFeedList({
	initialPosts,
	currentUserId,
	hasMore: initialHasMore,
}: {
	initialPosts: PorchFeedPost[];
	currentUserId: string;
	hasMore: boolean;
}) {
	const [posts, setPosts] = useState(initialPosts);
	const [hasMore, setHasMore] = useState(initialHasMore);
	const [filter, setFilter] = useState<'all' | 'mine'>('all');
	const [search, setSearch] = useState('');
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		const timeout = setTimeout(() => {
			startTransition(async () => {
				const result = await getFilteredPosts({
					offset: 0,
					filter,
					search,
				});
				setPosts(result.posts);
				setHasMore(result.hasMore);
			});
		}, 300);

		return () => clearTimeout(timeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filter, search]);

	function loadMore() {
		startTransition(async () => {
			const result = await getFilteredPosts({
				offset: posts.length,
				filter,
				search,
			});
			setPosts((prev) => [...prev, ...result.posts]);
			setHasMore(result.hasMore);
		});
	}

	return (
		<div className='space-y-4'>
			<div className='flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
				<div className='flex items-center gap-1'>
					<button
						onClick={() => setFilter('all')}
						className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
							filter === 'all'
								? 'bg-[#1a6fca]/10 text-[#1a6fca]'
								: 'text-gray-500 hover:bg-gray-50'
						}`}>
						All updates
					</button>
					<button
						onClick={() => setFilter('mine')}
						className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
							filter === 'mine'
								? 'bg-[#1a6fca]/10 text-[#1a6fca]'
								: 'text-gray-500 hover:bg-gray-50'
						}`}>
						My updates
					</button>
				</div>

				<div className='relative'>
					<svg
						className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400'
						fill='none'
						viewBox='0 0 24 24'
						stroke='currentColor'
						strokeWidth={2}>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							d='M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z'
						/>
					</svg>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder='Search by name or username...'
						className='w-full rounded-lg border border-gray-200 py-2 pl-9 pr-9 text-sm outline-none focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10'
					/>
					{search && (
						<button
							onClick={() => setSearch('')}
							className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
							aria-label='Clear search'>
							✕
						</button>
					)}
				</div>
			</div>

			{posts.map((post, i) => (
				<div
					key={post.id}
					className='animate-fade-in-up'
					style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
					<PostCard post={post} currentUserId={currentUserId} />
				</div>
			))}

			{!isPending && posts.length === 0 && (
				<p className='py-6 text-center text-sm text-gray-500'>
					{search
						? `No updates found for "${search}"`
						: filter === 'mine'
							? "You haven't posted yet."
							: 'No public porch updates yet — be the first to share something.'}
				</p>
			)}

			{hasMore && (
				<div className='flex justify-center pt-2'>
					<button
						onClick={loadMore}
						disabled={isPending}
						className='rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50'>
						{isPending ? 'Loading...' : 'Load more'}
					</button>
				</div>
			)}
		</div>
	);
}
