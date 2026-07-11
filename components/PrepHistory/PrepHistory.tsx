'use client';

import { useState, useTransition } from 'react';
import {
	TRACK_META,
	type PrepTrack,
	type PrepAnswerResult,
} from '@/lib/prepConstants';
import type { PrepSession } from '@/types/database';
import { deletePrepSession } from '@/app/dashboard/prep/prep-actions';

export function PrepHistory({
	sessions: initialSessions,
}: {
	sessions: PrepSession[];
}) {
	const [sessions, setSessions] = useState(initialSessions);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleDelete(id: string) {
		setDeleteError(null);
		startTransition(async () => {
			const result = await deletePrepSession(id);
			if (result?.error) {
				setDeleteError(result.error);
				return;
			}
			setSessions((prev) => prev.filter((s) => s.id !== id));
			setConfirmDeleteId(null);
			if (expandedId === id) setExpandedId(null);
		});
	}

	if (sessions.length === 0) {
		return (
			<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
				<p className='text-sm text-gray-500'>No prep sessions yet.</p>
			</div>
		);
	}

	return (
		<div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
			<div className='mb-3 flex items-center justify-between'>
				<p className='text-xs font-medium uppercase tracking-wide text-gray-400'>
					Past sessions
				</p>
				{deleteError && (
					<p className='text-xs font-medium text-red-600'>
						{deleteError}
					</p>
				)}
			</div>
			<div className='space-y-2'>
				{sessions.map((s) => {
					const isOpen = expandedId === s.id;
					const isConfirming = confirmDeleteId === s.id;
					const details = s.details as {
						guide?: string;
						results?: PrepAnswerResult[];
					} | null;

					return (
						<div key={s.id} className='rounded-lg bg-gray-50'>
							<div className='flex w-full items-center justify-between px-3 py-2'>
								<button
									onClick={() =>
										setExpandedId(isOpen ? null : s.id)
									}
									className='flex flex-1 items-center justify-between text-left'>
									<div>
										<p className='text-sm font-medium text-gray-900'>
											{s.topic}
										</p>
										<p className='text-xs text-gray-400'>
											{TRACK_META[s.track as PrepTrack]
												?.label ?? s.track}{' '}
											·{' '}
											{new Date(
												s.created_at,
											).toLocaleDateString()}
										</p>
									</div>
									<div className='flex items-center gap-2'>
										{s.mode === 'qa' ? (
											<span
												className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
													(s.overall_score ?? 0) >= 70
														? 'bg-green-100 text-green-700'
														: 'bg-amber-100 text-amber-700'
												}`}>
												{s.overall_score}%
											</span>
										) : (
											<span className='rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600'>
												Guide
											</span>
										)}
										<span className='text-gray-400'>
											{isOpen ? '▲' : '▼'}
										</span>
									</div>
								</button>

								{isConfirming ? (
									<div className='ml-3 flex shrink-0 items-center gap-1.5'>
										<span className='text-xs text-gray-500'>
											Delete?
										</span>
										<button
											onClick={() => handleDelete(s.id)}
											disabled={isPending}
											className='rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50'>
											{isPending ? '…' : 'Yes'}
										</button>
										<button
											onClick={() =>
												setConfirmDeleteId(null)
											}
											disabled={isPending}
											className='rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600'>
											Cancel
										</button>
									</div>
								) : (
									<button
										onClick={() => setConfirmDeleteId(s.id)}
										aria-label='Delete session'
										className='ml-3 shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600'>
										<svg
											xmlns='http://www.w3.org/2000/svg'
											width='16'
											height='16'
											viewBox='0 0 24 24'
											fill='none'
											stroke='currentColor'
											strokeWidth='2'
											strokeLinecap='round'
											strokeLinejoin='round'>
											<path d='M3 6h18' />
											<path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
											<path d='M10 11v6' />
											<path d='M14 11v6' />
											<path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' />
										</svg>
									</button>
								)}
							</div>

							{isOpen && details?.guide && (
								<div className='whitespace-pre-wrap border-t border-gray-200 p-3 text-xs text-gray-700'>
									{details.guide}
								</div>
							)}

							{isOpen && details?.results && (
								<div className='space-y-2 border-t border-gray-200 p-3'>
									{details.results.map((r, i) => (
										<div
											key={r.id}
											className='rounded-md border border-gray-200 bg-white p-2 text-xs'>
											<p className='font-medium text-gray-900'>
												{i + 1}. {r.question}
											</p>
											<p className='mt-1 text-gray-500'>
												{r.answer || '(no answer)'}
											</p>
											<p className='mt-1 text-[#1a6fca]'>
												Overall {r.overallScore}/10 —{' '}
												{r.suggestion}
											</p>
										</div>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
