'use client';

import { useState, useTransition } from 'react';
import { updateProfile } from '@/app/dashboard/profile/profile-actions';
import type { Profile } from '@/types/database';

export function ProfileForm({ profile }: { profile: Profile }) {
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	function handleSubmit(formData: FormData) {
		setError(null);
		setSuccess(false);
		startTransition(async () => {
			const result = await updateProfile(formData);
			if (result?.error) {
				setError(result.error);
				return;
			}
			setSuccess(true);
		});
	}

	return (
		<form
			action={handleSubmit}
			className='divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm'>
			{/* Public profile section */}
			<div className='p-6'>
				<p className='text-xs font-medium uppercase tracking-wide text-gray-400'>
					Public Profile
				</p>
				<h3 className='mt-0.5 text-sm font-semibold text-gray-900'>
					How you appear to other learners
				</h3>

				<div className='mt-4 space-y-4'>
					<div>
						<label className='mb-1.5 block text-sm font-medium text-gray-700'>
							Display name
						</label>
						<input
							name='full_name'
							defaultValue={profile.full_name ?? ''}
							placeholder='e.g. Slavo Popovic'
							className='w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10'
						/>
						<p className='mt-1 text-xs text-gray-400'>
							Shown on your porch posts instead of your username.
							Leave blank to show your username.
						</p>
					</div>

					<div>
						<label className='mb-1.5 block text-sm font-medium text-gray-700'>
							Username
						</label>
						<input
							name='username'
							required
							defaultValue={profile.username}
							className='w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10'
						/>
					</div>

					<div>
						<label className='mb-1.5 block text-sm font-medium text-gray-700'>
							Bio
						</label>
						<textarea
							name='bio'
							rows={2}
							defaultValue={profile.bio ?? ''}
							placeholder="A short line about what you're learning"
							className='w-full resize-none rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10'
						/>
					</div>
				</div>
			</div>

			{/* Privacy section */}
			<div className='p-6'>
				<p className='text-xs font-medium uppercase tracking-wide text-gray-400'>
					Privacy
				</p>
				<h3 className='mt-0.5 text-sm font-semibold text-gray-900'>
					Control what others can see
				</h3>

				<label className='mt-4 flex items-start gap-2 text-sm text-gray-600'>
					<input
						type='checkbox'
						name='show_email'
						defaultChecked={profile.show_email}
						className='mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1a6fca] focus:ring-[#1a6fca]'
					/>
					<span>
						Share my email on my porch posts, so other learners can
						connect with me
					</span>
				</label>
			</div>

			{/* Save bar */}
			<div className='flex items-center gap-3 rounded-b-xl bg-gray-50/60 px-6 py-4'>
				<button
					type='submit'
					disabled={isPending}
					className='rounded-lg bg-[#1a6fca] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1558a3] disabled:opacity-50'>
					{isPending ? 'Saving...' : 'Save changes'}
				</button>
				{error && <p className='text-xs text-red-600'>{error}</p>}
				{success && (
					<p className='text-xs text-green-600'>Profile updated.</p>
				)}
			</div>
		</form>
	);
}
