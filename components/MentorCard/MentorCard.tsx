type Mentor = {
	id: string;
	full_name: string | null;
	username: string;
} | null;

function initials(name: string): string {
	return name
		.split(' ')
		.filter(Boolean)
		.map((p) => p[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

export function MentorCard({ mentor }: { mentor: Mentor }) {
	if (!mentor) {
		return (
			<div className='mb-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500'>
				You don&apos;t have a mentor assigned yet. Reach out and
				we&apos;ll get you paired up.
			</div>
		);
	}

	const label = mentor.full_name ?? mentor.username;

	return (
		<div className='mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4'>
			<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a6fca] text-sm font-semibold text-white'>
				{initials(label)}
			</div>
			<div>
				<p className='text-sm font-medium text-gray-900'>{label}</p>
				<p className='text-xs text-gray-500'>Your mentor</p>
			</div>
		</div>
	);
}
