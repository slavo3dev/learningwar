import Link from 'next/link';
import { AuthHeader, SignInForm } from '@/components';
import { AuthBackground } from '@/components/AuthBackground/AuthBackground';
import { SIGN_IN_TAGLINES, pickTagline } from '@/lib/authTaglines';

export default async function SignInPage({
	searchParams,
}: {
	searchParams: Promise<{ redirectedFrom?: string }>;
}) {
	const { redirectedFrom } = await searchParams;
	const tagline = pickTagline(SIGN_IN_TAGLINES);

	return (
		<div className='relative min-h-screen flex items-center justify-center px-4 py-12'>
			<AuthBackground variant='sign-in' />

			<div className='dark w-full max-w-sm rounded-2xl border border-white/20 bg-black/55 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 [&_label]:text-white! [&_input]:text-white! [&_input]:caret-white [&_input::placeholder]:text-white/50!'>
				<AuthHeader title='Welcome back' subtitle={tagline} />
				<SignInForm redirectedFrom={redirectedFrom} />

				<p className='mt-6 text-center text-sm text-muted-foreground'>
					No account yet?{' '}
					<Link
						href='/auth/sign-up'
						className='text-primary hover:underline font-medium'>
						Create one free
					</Link>
				</p>
			</div>
		</div>
	);
}
