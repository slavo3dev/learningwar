import { PORCH_LEVELS, getPorchLevel } from '@/lib/porchLevels';

export function RankLadder({ currentStreak }: { currentStreak: number }) {
	const currentLevel = getPorchLevel(currentStreak);

	return (
		<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
			<h3 className='mb-1 text-sm font-semibold text-gray-900'>
				Rank Progression
			</h3>
			<p className='mb-4 text-xs text-gray-500'>
				Every day you post keeps your streak alive. Ranks are inspired
				by the Spartan agoge.
			</p>

			<div className='flex flex-col gap-2'>
				{PORCH_LEVELS.map((lvl) => {
					const isAchieved = currentStreak >= lvl.minStreak;
					const isCurrent = lvl.level === currentLevel.level;

					return (
						<div
							key={lvl.level}
							className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
								isCurrent
									? 'border-[#1a6fca] bg-[#1a6fca]/5'
									: isAchieved
										? 'border-gray-200 bg-gray-50'
										: 'border-gray-100 bg-white opacity-60'
							}`}>
							<div
								className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
									isCurrent
										? 'bg-[#1a6fca] text-white'
										: isAchieved
											? 'bg-gray-300 text-gray-700'
											: 'bg-gray-100 text-gray-400'
								}`}>
								{lvl.level}
							</div>

							<div className='min-w-0 flex-1'>
								<div className='flex flex-wrap items-center gap-2'>
									<span
										className={`text-sm font-semibold ${
											isCurrent
												? 'text-[#1a6fca]'
												: 'text-gray-900'
										}`}>
										{lvl.name}
									</span>
									{isCurrent && (
										<span className='rounded-full bg-[#1a6fca] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white'>
											Current
										</span>
									)}
									<span className='text-xs text-gray-400'>
										{lvl.minStreak === 0
											? 'Starting rank'
											: `${lvl.minStreak}-day streak`}
									</span>
								</div>
								<p className='mt-0.5 text-xs text-gray-600'>
									{lvl.description}
								</p>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
