import Link from 'next/link';
import { AuthHeader, SignUpForm } from '@/components';
import { AuthBackground } from '@/components/AuthBackground/AuthBackground';
import { SIGN_UP_TAGLINES, pickTagline } from '@/lib/authTaglines';

export default function SignUpPage() {
	const tagline = pickTagline(SIGN_UP_TAGLINES);

	return (
		<div className='relative min-h-screen flex items-center justify-center px-4 py-12'>
			<AuthBackground variant='sign-up' />

			<div className='dark w-full max-w-sm rounded-2xl border border-white/20 bg-black/55 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 [&_label]:!text-white'>
				<AuthHeader title='Create your account' subtitle={tagline} />
				<SignUpForm />

				<p className='mt-6 text-center text-sm text-muted-foreground'>
					Already have an account?{' '}
					<Link
						href='/auth/sign-in'
						className='text-primary hover:underline font-medium'>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}
