'use client';

import { useMemo, useState } from 'react';

type ActivityDay = { date: string; count: number };

const CELL_SIZE = 11;
const CELL_GAP = 3;
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EMPTY_COLOR = '#ebedf0';
const FILLED_COLOR = '#1a6fca';

export function HeatmapGrid({ data }: { data: ActivityDay[] }) {
	const [hovered, setHovered] = useState<{
		date: string;
		count: number;
		x: number;
		y: number;
	} | null>(null);

	const { weeks, monthLabels } = useMemo(() => {
		const countsByDay = new Map(data.map((d) => [d.date, d.count]));

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Start on the Sunday of the week 364 days ago
		const start = new Date(today);
		start.setDate(start.getDate() - 364);
		start.setDate(start.getDate() - start.getDay());

		const weeks: { date: string; count: number }[][] = [];
		const monthLabels: { weekIndex: number; label: string }[] = [];
		let lastMonth = -1;
		const cursor = new Date(start);
		let weekIndex = 0;

		while (cursor <= today) {
			const week: { date: string; count: number }[] = [];
			for (let d = 0; d < 7; d++) {
				const key = cursor.toISOString().slice(0, 10);
				week.push({ date: key, count: countsByDay.get(key) ?? 0 });

				if (
					cursor.getDate() <= 7 &&
					cursor.getMonth() !== lastMonth &&
					cursor <= today
				) {
					monthLabels.push({
						weekIndex,
						label: cursor.toLocaleDateString('en-US', {
							month: 'short',
						}),
					});
					lastMonth = cursor.getMonth();
				}
				cursor.setDate(cursor.getDate() + 1);
			}
			weeks.push(week);
			weekIndex++;
		}

		return { weeks, monthLabels };
	}, [data]);

	const gridWidth = weeks.length * (CELL_SIZE + CELL_GAP);

	return (
		<div className='relative overflow-x-auto'>
			<div className='flex'>
				{/* Day-of-week labels */}
				<div className='mr-2 mt-4 flex flex-col gap-[3px] text-xs text-gray-500'>
					{WEEK_DAYS.map((day, i) => (
						<div
							key={day}
							style={{ height: CELL_SIZE }}
							className='flex items-center'>
							{i % 2 === 1 ? day.slice(0, 3) : ''}
						</div>
					))}
				</div>

				<div style={{ width: gridWidth, minWidth: gridWidth }}>
					{/* Month labels */}
					<div className='relative mb-1 h-4 text-xs text-gray-500'>
						{monthLabels.map(({ weekIndex, label }) => (
							<span
								key={`${label}-${weekIndex}`}
								className='absolute'
								style={{
									left: weekIndex * (CELL_SIZE + CELL_GAP),
								}}>
								{label}
							</span>
						))}
					</div>

					<div className='flex gap-[3px]'>
						{weeks.map((week, wi) => (
							<div key={wi} className='flex flex-col gap-[3px]'>
								{week.map((day) => (
									<div
										key={day.date}
										onMouseEnter={(e) => {
											const rect =
												e.currentTarget.getBoundingClientRect();
											setHovered({
												date: day.date,
												count: day.count,
												x: rect.x,
												y: rect.y,
											});
										}}
										onMouseLeave={() => setHovered(null)}
										className='rounded-sm'
										style={{
											width: CELL_SIZE,
											height: CELL_SIZE,
											backgroundColor:
												day.count > 0
													? FILLED_COLOR
													: EMPTY_COLOR,
										}}
									/>
								))}
							</div>
						))}
					</div>
				</div>
			</div>

			{hovered && (
				<div
					className='pointer-events-none fixed z-50 rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg'
					style={{ left: hovered.x, top: hovered.y - 32 }}>
					{hovered.count} {hovered.count === 1 ? 'entry' : 'entries'}{' '}
					on{' '}
					{new Date(hovered.date + 'T00:00:00').toLocaleDateString(
						'en-US',
						{
							month: 'short',
							day: 'numeric',
							year: 'numeric',
						},
					)}
				</div>
			)}
		</div>
	);
}
