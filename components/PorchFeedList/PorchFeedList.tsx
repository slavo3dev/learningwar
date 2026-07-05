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

	// Re-fetch from scratch whenever filter or search changes
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
		}, 300); // small debounce so typing doesn't fire a query per keystroke

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
			<div className='flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex gap-1'>
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

				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder='Search by name or username...'
					className='w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10 sm:w-64'
				/>
			</div>

			{posts.map((post) => (
				<PostCard
					key={post.id}
					post={post}
					currentUserId={currentUserId}
				/>
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
