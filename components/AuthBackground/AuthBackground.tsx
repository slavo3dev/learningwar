export function AuthBackground({
	variant,
}: {
	variant: 'sign-in' | 'sign-up';
}) {
	const desktopSrc =
		variant === 'sign-in'
			? '/images/auth-signin-warrior.webp'
			: '/images/auth-signup-warrior.webp';

	const mobileSrc =
		variant === 'sign-in'
			? '/images/auth-signin-warrior-mobile.webp'
			: '/images/auth-signup-warrior-mobile.webp';

	const alt =
		variant === 'sign-in'
			? 'A warrior walking toward a sunrise city'
			: 'A warrior overlooking a sunrise city';

	return (
		<div className='fixed inset-0 -z-10'>
			{/*
			  Native <picture>/<source> does true art-direction: the browser
			  only downloads the one image that matches the viewport, unlike
			  toggling two <Image> components with CSS (which downloads both).
			*/}
			<picture>
				<source media='(max-width: 767px)' srcSet={mobileSrc} />
				<img
					src={desktopSrc}
					alt={alt}
					className='h-full w-full object-cover'
					fetchPriority='high'
					loading='eager'
				/>
			</picture>

			{/* Gradient scrim so the floating glass card stays readable. */}
			<div className='absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-black/40' />
		</div>
	);
}
