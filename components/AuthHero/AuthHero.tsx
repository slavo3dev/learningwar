import Image from 'next/image';
import {
	SIGN_IN_TAGLINES,
	SIGN_UP_TAGLINES,
	pickTagline,
} from '@/lib/authTaglines';

export function AuthHero({ variant }: { variant: 'sign-in' | 'sign-up' }) {
	const tagline =
		variant === 'sign-in'
			? pickTagline(SIGN_IN_TAGLINES)
			: pickTagline(SIGN_UP_TAGLINES);

	const headline =
		variant === 'sign-in' ? 'The agoge continues' : 'From Paides to Legend';

	return (
		<div className='mb-8 flex flex-col items-center text-center'>
			<div className='mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a6fca] shadow-sm'>
				<Image
					src='/icons/icon-192.png'
					alt='LearningWar'
					width={40}
					height={40}
					className='rounded-md'
				/>
			</div>

			<h1 className='text-2xl font-bold tracking-tight text-gray-900'>
				{headline}
			</h1>
			<p className='mt-2 max-w-sm text-sm text-gray-500'>{tagline}</p>
		</div>
	);
}
