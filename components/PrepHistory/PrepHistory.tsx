'use client';

import { useState } from 'react';
import {
	TRACK_META,
	type PrepTrack,
	type PrepAnswerResult,
} from '@/lib/prepConstants';
import type { PrepSession } from '@/types/database';

export function PrepHistory({ sessions }: { sessions: PrepSession[] }) {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	if (sessions.length === 0) {
		return (
			<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
				<p className='text-sm text-gray-500'>No prep sessions yet.</p>
			</div>
		);
	}

	return (
		<div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
			<p className='mb-3 text-xs font-medium uppercase tracking-wide text-gray-400'>
				Past sessions
			</p>
			<div className='space-y-2'>
				{sessions.map((s) => {
					const isOpen = expandedId === s.id;
					const details = s.details as {
						guide?: string;
						results?: PrepAnswerResult[];
					} | null;

					return (
						<div key={s.id} className='rounded-lg bg-gray-50'>
							<button
								onClick={() =>
									setExpandedId(isOpen ? null : s.id)
								}
								className='flex w-full items-center justify-between px-3 py-2 text-left'>
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
