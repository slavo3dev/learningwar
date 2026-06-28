import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib';
import { Sidebar } from '@/components';

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/auth/sign-in');
	}

	return (
		<div className='flex min-h-screen'>
			<Sidebar userEmail={user.email ?? ''} />
			<main className='flex-1 bg-gray-50 p-8'>{children}</main>
		</div>
	);
}
