'use client';

import { useEffect, useState } from 'react';

export function ScrollToTop() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		function handleScroll() {
			setVisible(window.scrollY > 400);
		}
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	if (!visible) return null;

	return (
		<button
			onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
			className='fixed bottom-24 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-lg transition-colors hover:bg-gray-50'
			aria-label='Scroll to top'>
			↑
		</button>
	);
}
