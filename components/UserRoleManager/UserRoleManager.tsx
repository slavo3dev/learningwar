'use client';

import { useTransition } from 'react';
import {
	updateUserRole,
	assignMentorAdmin,
} from '@/app/dashboard/admin-actions';
import type { UserRole } from '@/types/database';

type UserRow = {
	id: string;
	username: string;
	full_name: string | null;
	role: UserRole;
};

const ROLES: UserRole[] = ['student', 'junior_mentor', 'mentor', 'admin'];

export function UserRoleManager({
	users,
	assignments,
}: {
	users: UserRow[];
	assignments: Record<string, string>;
}) {
	const [isPending, startTransition] = useTransition();
	const mentors = users.filter((u) => u.role !== 'student');

	function handleRoleChange(userId: string, role: UserRole) {
		startTransition(async () => {
			await updateUserRole(userId, role);
		});
	}

	function handleMentorAssign(studentId: string, mentorId: string) {
		if (!mentorId) return;
		startTransition(async () => {
			await assignMentorAdmin(studentId, mentorId);
		});
	}

	return (
		<div className='flex flex-col divide-y divide-gray-200'>
			{users.map((u) => (
				<div
					key={u.id}
					className='flex flex-wrap items-center justify-between gap-3 py-3'>
					<div className='min-w-[160px] flex-1'>
						<p className='text-sm font-medium text-gray-900'>
							{u.full_name ?? u.username}
						</p>
						<p className='text-xs text-gray-500'>@{u.username}</p>
					</div>

					<select
						value={u.role}
						disabled={isPending}
						onChange={(e) =>
							handleRoleChange(u.id, e.target.value as UserRole)
						}
						className='rounded-md border border-gray-300 px-2 py-1 text-sm'>
						{ROLES.map((r) => (
							<option key={r} value={r}>
								{r}
							</option>
						))}
					</select>

					{u.role === 'student' && (
						<select
							value={assignments[u.id] ?? ''}
							disabled={isPending}
							onChange={(e) =>
								handleMentorAssign(u.id, e.target.value)
							}
							className='rounded-md border border-gray-300 px-2 py-1 text-sm'>
							<option value=''>No mentor</option>
							{mentors.map((m) => (
								<option key={m.id} value={m.id}>
									{m.full_name ?? m.username} ({m.role})
								</option>
							))}
						</select>
					)}
				</div>
			))}
		</div>
	);
}
