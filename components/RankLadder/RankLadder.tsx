import { PORCH_LEVELS, getPorchLevel } from '@/lib/porchLevels';

export function RankLadder({ currentStreak }: { currentStreak: number }) {
	const currentLevel = getPorchLevel(currentStreak);

	return (
		<div className='flex max-h-80 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
			<h3 className='mb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-400'>
				Rank Progression
			</h3>
			<p className='mb-3 text-[11px] text-gray-400'>
				Ranks are inspired by the Spartan agoge.
			</p>

			<div className='flex flex-col gap-1.5 overflow-y-auto pr-1'>
				{PORCH_LEVELS.map((lvl) => {
					const isAchieved = currentStreak >= lvl.minStreak;
					const isCurrent = lvl.level === currentLevel.level;

					return (
						<div
							key={lvl.level}
							className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
								isCurrent
									? 'border-[#1a6fca] bg-[#1a6fca]/5'
									: isAchieved
										? 'border-gray-200 bg-gray-50'
										: 'border-gray-100 bg-white opacity-50'
							}`}>
							<div
								className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
									isCurrent
										? 'bg-[#1a6fca] text-white'
										: isAchieved
											? 'bg-gray-300 text-gray-700'
											: 'bg-gray-100 text-gray-400'
								}`}>
								{lvl.level}
							</div>

							<div className='min-w-0 flex-1'>
								<div className='flex flex-wrap items-center gap-1.5'>
									<span
										className={`text-xs font-semibold ${
											isCurrent
												? 'text-[#1a6fca]'
												: 'text-gray-900'
										}`}>
										{lvl.name}
									</span>
									{isCurrent && (
										<span className='rounded-full bg-[#1a6fca] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white'>
											Current
										</span>
									)}
									<span className='text-[10px] text-gray-400'>
										{lvl.minStreak === 0
											? 'Start'
											: `${lvl.minStreak}d`}
									</span>
								</div>
								<p className='mt-0.5 text-[11px] leading-snug text-gray-500'>
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
