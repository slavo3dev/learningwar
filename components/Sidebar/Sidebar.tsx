'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const navItems = [
	{ label: 'Daily Porch', href: '/dashboard' },
	{ label: 'Knowledge Check', href: '/dashboard/sessions' },
	{ label: 'Learning Calendar', href: '/dashboard/calendar' },
	{ label: 'Mentor Inbox', href: '/dashboard/inbox' },
	{ label: 'Profile', href: '/dashboard/profile' },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
	const pathname = usePathname();
	const router = useRouter();

	async function handleSignOut() {
		const supabase = createBrowserSupabaseClient();
		await supabase.auth.signOut();
		router.push('/auth/sign-in');
		router.refresh();
	}

	return (
		<aside className='flex h-screen w-64 shrink-0 flex-col justify-between border-r border-gray-200 bg-white p-4'>
			<div className='overflow-y-auto'>
				<div className='mb-8 px-2'>
					<span className='text-lg font-bold text-[#1a6fca]'>
						LearningWar
					</span>
				</div>
				<nav className='flex flex-col gap-1'>
					{navItems.map((item) => {
						const isActive = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
									isActive
										? 'bg-[#1a6fca] text-white'
										: 'text-gray-700 hover:bg-gray-100'
								}`}>
								{item.label}
							</Link>
						);
					})}
				</nav>
			</div>

			<div className='border-t border-gray-200 pt-4'>
				<p className='truncate px-2 text-xs text-gray-500'>
					{userEmail}
				</p>
				<button
					onClick={handleSignOut}
					className='mt-2 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100'>
					Sign out
				</button>
			</div>
		</aside>
	);
}
