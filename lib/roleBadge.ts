import type { UserRole } from '@/types/database';

const ROOKIE_STREAK_THRESHOLD = 30;

const ROLE_LABELS: Record<UserRole, string> = {
	student: 'Student',
	junior_mentor: 'Junior Mentor',
	mentor: 'Mentor',
	admin: 'Admin',
};

/**
 * Cosmetic-only badge label. Does not affect permissions or the
 * stored `role` value — a student is always `role = 'student'` in
 * the DB regardless of streak. New students show "Rookie" until
 * their streak reaches ROOKIE_STREAK_THRESHOLD, then show "Student".
 */
export function getRoleBadgeLabel(
	role: UserRole,
	currentStreak: number,
): string {
	if (role === 'student' && currentStreak < ROOKIE_STREAK_THRESHOLD) {
		return 'Rookie';
	}
	return ROLE_LABELS[role];
}
