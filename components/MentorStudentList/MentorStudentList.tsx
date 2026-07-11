import Link from 'next/link';
import { getMentorStudentList } from '@/app/dashboard/inbox-actions';

export async function MentorStudentList() {
	const students = await getMentorStudentList();

	if (students.length === 0) {
		return (
			<p className='text-sm text-gray-500'>No students assigned yet.</p>
		);
	}

	return (
		<div className='flex flex-col divide-y divide-gray-200'>
			{students.map((s) => {
				const label =
					s.student?.full_name ?? s.student?.username ?? 'Unknown';

				return (
					<Link
						key={s.student_id}
						href={`/dashboard/inbox/${s.student_id}`}
						className='flex items-center justify-between px-2 py-3 hover:bg-gray-50'>
						<span className='text-sm font-medium text-gray-900'>
							{label}
						</span>
						{s.unreadCount > 0 && (
							<span className='rounded-full bg-[#1a6fca] px-2 py-0.5 text-xs font-semibold text-white'>
								{s.unreadCount}
							</span>
						)}
					</Link>
				);
			})}
		</div>
	);
}
