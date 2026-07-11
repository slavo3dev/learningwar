'use client';

import { useState } from 'react';
import { DIFFICULTY_META, type SessionDifficulty } from '@/lib/quizConstants';

type SessionResult = {
	id: string;
	question: string;
	userAnswer: string | number;
	correct: boolean;
	feedback?: string;
	correctAnswer?: string;
};

type SessionRow = {
	id: string;
	topic: string;
	score: number | null;
	difficulty: string | null;
	details: unknown;
	completed_at: string | null;
	created_at: string;
};

export function SessionHistory({ sessions }: { sessions: SessionRow[] }) {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	if (sessions.length === 0) {
		return (
			<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
				<p className='text-sm text-gray-500'>
					No sessions yet — your history will show up here.
				</p>
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
					const results = (
						s.details as { results?: SessionResult[] } | null
					)?.results;
					const difficultyLabel = s.difficulty
						? DIFFICULTY_META[s.difficulty as SessionDifficulty]
								?.label
						: null;

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
										{new Date(
											s.created_at,
										).toLocaleDateString()}
										{difficultyLabel &&
											` · ${difficultyLabel}`}
									</p>
								</div>
								<div className='flex items-center gap-2'>
									<span
										className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
											(s.score ?? 0) >= 70
												? 'bg-green-100 text-green-700'
												: 'bg-amber-100 text-amber-700'
										}`}>
										{s.score}%
									</span>
									<span className='text-gray-400'>
										{isOpen ? '▲' : '▼'}
									</span>
								</div>
							</button>

							{isOpen && results && (
								<div className='space-y-2 border-t border-gray-200 p-3'>
									{results.map((r, i) => (
										<div
											key={r.id}
											className={`rounded-md border p-2 text-xs ${
												r.correct
													? 'border-green-200 bg-green-50'
													: 'border-red-200 bg-red-50'
											}`}>
											<p className='font-medium text-gray-900'>
												{i + 1}. {r.question}
											</p>
											<p className='mt-1 text-gray-600'>
												Your answer:{' '}
												{r.userAnswer || '(none)'}
											</p>
											{r.correctAnswer && !r.correct && (
												<p className='text-gray-600'>
													Correct answer:{' '}
													{r.correctAnswer}
												</p>
											)}
											{r.feedback && (
												<p className='mt-1 italic text-gray-500'>
													{r.feedback}
												</p>
											)}
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
