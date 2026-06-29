export function SpartanIcon({ className }: { className?: string }) {
	return (
		<svg viewBox='0 0 24 24' fill='none' className={className}>
			<path
				d='M4 10c0-1 1-2 2-2 0-3 2.5-5 6-5s6 2 6 5c1 0 2 1 2 2 0 2-1 3-2 3v3c0 3-3 5-6 5s-6-2-6-5v-3c-1 0-2-1-2-3Z'
				stroke='currentColor'
				strokeWidth='1.5'
				strokeLinejoin='round'
			/>
			<path
				d='M8 8c1.5-1 2.5-1 4-1s2.5 0 4 1'
				stroke='currentColor'
				strokeWidth='1.5'
				strokeLinecap='round'
			/>
			<path
				d='M9 21c0-2 1.5-3 3-3s3 1 3 3'
				stroke='currentColor'
				strokeWidth='1.5'
				strokeLinecap='round'
			/>
		</svg>
	);
}

export function LionIcon({ className }: { className?: string }) {
	return (
		<svg viewBox='0 0 24 24' fill='none' className={className}>
			<circle
				cx='12'
				cy='12'
				r='4'
				stroke='currentColor'
				strokeWidth='1.5'
			/>
			<path
				d='M12 3c1.5 1 1.8 2.5 1 4M12 3c-1.5 1-1.8 2.5-1 4M4 8c1.7 0 3-.5 4-1.8M4 8c.3 1.6 1.3 2.6 3 3M20 8c-1.7 0-3-.5-4-1.8M20 8c-.3 1.6-1.3 2.6-3 3M6 16c.5 1.6 1.6 2.6 3 3M6 16c-1.6.2-2.8 1-3.5 2.3M18 16c-.5 1.6-1.6 2.6-3 3M18 16c1.6.2 2.8 1 3.5 2.3'
				stroke='currentColor'
				strokeWidth='1.3'
				strokeLinecap='round'
			/>
		</svg>
	);
}

export function WolfIcon({ className }: { className?: string }) {
	return (
		<svg viewBox='0 0 24 24' fill='none' className={className}>
			<path
				d='M4 4l4 5h8l4-5-2 8-2 3 3 6-6-3-1 1-1-1-6 3 3-6-2-3-2-8Z'
				stroke='currentColor'
				strokeWidth='1.4'
				strokeLinejoin='round'
			/>
			<circle cx='9.5' cy='11' r='0.6' fill='currentColor' />
			<circle cx='14.5' cy='11' r='0.6' fill='currentColor' />
		</svg>
	);
}
