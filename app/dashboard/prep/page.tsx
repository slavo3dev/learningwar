import {
	getRecentPorchTopics,
	getPrepHistory,
	getInProgressPrepSession,
} from './prep-actions';
import { PrepRunner, PrepHistory } from '@/components';

export default async function PrepPage() {
	const [recentTopics, sessions, inProgressSession] = await Promise.all([
		getRecentPorchTopics(),
		getPrepHistory(),
		getInProgressPrepSession(),
	]);

	return (
		<div className='max-w-[1400px] p-8'>
			<div className='mb-4'>
				<h1 className='mb-1 text-2xl font-bold text-gray-900'>
					Prep Sessions
				</h1>
				<p className='text-sm text-gray-500'>
					Practice interviews, sales calls, and pitches with AI
					feedback.
				</p>
			</div>

			<div className='grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]'>
				<PrepRunner
					recentTopics={recentTopics}
					inProgressSession={inProgressSession}
				/>
				<div className='lg:sticky lg:top-8 lg:self-start'>
					<PrepHistory sessions={sessions} />
				</div>
			</div>
		</div>
	);
}
