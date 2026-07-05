'use client';

import { useRef, useState, useTransition } from 'react';
import { createPost } from '@/app/dashboard/porch-actions';

const MOODS = [
	{ value: 1, emoji: '😓', label: 'Rough' },
	{ value: 2, emoji: '😐', label: 'Okay' },
	{ value: 3, emoji: '🙂', label: 'Good' },
	{ value: 4, emoji: '🔥', label: 'Great' },
];

export function PorchForm({ onSuccess }: { onSuccess?: () => void }) {
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const formRef = useRef<HTMLFormElement>(null);

	function handleSubmit(formData: FormData) {
		setError(null);
		startTransition(async () => {
			const result = await createPost(formData);
			if (result?.error) {
				setError(result.error);
				return;
			}
			formRef.current?.reset();
			onSuccess?.();
		});
	}

	return (
		<form
			ref={formRef}
			action={handleSubmit}
			className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
			<div className='mb-4 border-b border-gray-100 pb-4'>
				<p className='text-xs font-medium uppercase tracking-wide text-gray-400'>
					Today&apos;s Entry
				</p>
				<h2 className='mt-0.5 text-base font-semibold text-gray-900'>
					What did you work on today?
				</h2>
			</div>

			<div className='space-y-4'>
				<div>
					<label className='mb-1.5 block text-sm font-medium text-gray-700'>
						What you learned
					</label>
					<textarea
						name='what_learned'
						rows={2}
						required
						placeholder='e.g. Finally understood how Next.js server actions handle form submissions...'
						className='w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10'
					/>
				</div>

				<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
					<div>
						<label className='mb-1.5 block text-sm font-medium text-gray-700'>
							Challenges
						</label>
						<textarea
							name='challenges'
							rows={2}
							placeholder='What tripped you up? (optional)'
							className='w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10'
						/>
					</div>
					<div>
						<label className='mb-1.5 block text-sm font-medium text-gray-700'>
							Plan for tomorrow
						</label>
						<textarea
							name='tomorrow'
							rows={2}
							placeholder="What's next? (optional)"
							className='w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10'
						/>
					</div>
				</div>
			</div>

			<div className='mt-5 flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<p className='mb-1.5 text-xs font-medium text-gray-500'>
						How did today feel?
					</p>
					<div className='flex gap-2'>
						{MOODS.map((m) => (
							<label
								key={m.value}
								className='flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 transition-colors has-checked:border-[#1a6fca] has-checked:bg-[#1a6fca]/5 has-checked:text-[#1a6fca]'>
								<input
									type='radio'
									name='mood'
									value={m.value}
									defaultChecked={m.value === 3}
									className='sr-only'
								/>
								<span className='text-lg leading-none'>
									{m.emoji}
								</span>
								<span className='font-medium'>{m.label}</span>
							</label>
						))}
					</div>
				</div>

				<div className='flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start sm:gap-2'>
					<label className='flex items-center gap-1.5 text-xs text-gray-500'>
						<input
							type='checkbox'
							name='is_public'
							defaultChecked
							className='h-3.5 w-3.5 rounded border-gray-300 text-[#1a6fca] focus:ring-[#1a6fca]'
						/>
						Share publicly
					</label>
					<button
						type='submit'
						disabled={isPending}
						className='rounded-lg bg-[#1a6fca] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1558a3] disabled:opacity-50'>
						{isPending ? 'Posting...' : 'Post update'}
					</button>
				</div>
			</div>

			{error && <p className='mt-3 text-xs text-red-600'>{error}</p>}
		</form>
	);
}
