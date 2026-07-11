import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { RegisterServiceWorker } from '@/components';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
	title: 'LearningWar — Learn deliberately',
	description:
		'The only platform that combines an AI mentor, human mentorship, daily accountability, and career intelligence in one place.',
	manifest: '/manifest.json',
	appleWebApp: {
		capable: true,
		statusBarStyle: 'default',
		title: 'LearningWar',
	},
};

export const viewport: Viewport = {
	themeColor: '#1a6fca',
	width: 'device-width',
	initialScale: 1,
	maximumScale: 5,
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang='en' className={cn('h-full', 'font-sans', geist.variable)}>
			<body className='min-h-full bg-background text-foreground antialiased'>
				<RegisterServiceWorker />
				{children}
			</body>
		</html>
	);
}
