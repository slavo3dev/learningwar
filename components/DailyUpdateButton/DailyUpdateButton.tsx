'use client';

import { useState } from 'react';
import { PorchForm } from '@/components/PorchForm/PorchForm';

export function DailyUpdateButton() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				onClick={() => setOpen(true)}
				className='fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#1a6fca] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#1558a3]'>
				<span className='text-lg leading-none'>+</span>
				Daily Update
			</button>

			{open && (
				<div
					className='fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16'
					onClick={() => setOpen(false)}>
					<div
						className='w-full max-w-xl'
						onClick={(e) => e.stopPropagation()}>
						<PorchForm onSuccess={() => setOpen(false)} />
					</div>
				</div>
			)}
		</>
	);
}
