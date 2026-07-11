import { getRecentTopics, getSessionHistory } from './session-actions';
import { SessionRunner, SessionHistory } from '@/components';

export default async function SessionsPage() {
	const [recentTopics, sessions] = await Promise.all([
		getRecentTopics(),
		getSessionHistory(),
	]);

	return (
		<div className='max-w-[1400px] p-8'>
			<div className='mb-4'>
				<h1 className='mb-1 text-2xl font-bold text-gray-900'>
					Knowledge Check
				</h1>
				<p className='text-sm text-gray-500'>
					Test yourself on what you&apos;ve been learning.
				</p>
			</div>

			<div className='grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]'>
				<SessionRunner recentTopics={recentTopics} />
				<div className='lg:sticky lg:top-8 lg:self-start'>
					<SessionHistory sessions={sessions} />
				</div>
			</div>
		</div>
	);
}
