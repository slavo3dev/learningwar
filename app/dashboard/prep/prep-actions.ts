'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib';
import {
	generatePrepQuestions,
	evaluatePrepAnswer,
	generatePrepGuide,
} from '@/lib/prepAI';
import type {
	PrepQuestion,
	PrepTrack,
	PrepAnswerResult,
} from '@/lib/prepConstants';
import type { SessionDifficulty } from '@/lib/quizConstants';
import type { Database } from '@/types/database';

type PrepSessionInsert =
	Database['public']['Tables']['prep_sessions']['Insert'];

export async function getRecentPorchTopics() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return [];

	const { data } = await supabase
		.from('porch_posts')
		.select('what_learned')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(10);

	return (data ?? []).map((d) => d.what_learned);
}

// Starts a Q&A session: generates questions, then immediately persists
// a row with status='in_progress' so it can be resumed if abandoned.
export async function startPrepQA(
	track: PrepTrack,
	topic: string,
	role: string,
	difficulty: SessionDifficulty,
	count: number,
	durationSeconds: number,
) {
	if (!topic.trim()) return { error: 'Please enter a topic' };

	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	let questions: PrepQuestion[];
	try {
		questions = await generatePrepQuestions(
			track,
			topic.trim(),
			role.trim(),
			difficulty,
			count,
		);
	} catch {
		return { error: 'Failed to generate questions. Try again.' };
	}

	const payload: PrepSessionInsert = {
		user_id: user.id,
		track,
		mode: 'qa',
		topic: topic.trim(),
		role: role.trim() || null,
		difficulty,
		status: 'in_progress',
		questions,
		answered_count: 0,
		duration_seconds: durationSeconds,
		duration_left_seconds: durationSeconds,
		details: { answers: {} },
	};

	const { data, error } = await supabase
		.from('prep_sessions')
		.insert(payload)
		.select('id')
		.single();

	if (error || !data)
		return { error: error?.message ?? 'Failed to start session' };

	return { questions, sessionId: data.id };
}

// Incremental save — called periodically and on every question navigation.
// Stores raw answers only (not yet graded); grading happens once at finalize.
export async function savePrepProgress(
	sessionId: string,
	answers: Record<string, string>,
	durationLeftSeconds: number,
) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const answeredCount = Object.values(answers).filter(
		(a) => a.trim().length > 0,
	).length;

	const { error } = await supabase
		.from('prep_sessions')
		.update({
			details: { answers },
			answered_count: answeredCount,
			duration_left_seconds: durationLeftSeconds,
		})
		.eq('id', sessionId)
		.eq('user_id', user.id)
		.eq('status', 'in_progress');

	if (error) return { error: error.message };
	return { saved: true };
}

// Looks for an unfinished Q&A session so the runner can offer to resume it.
export async function getInProgressPrepSession() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;

	const { data } = await supabase
		.from('prep_sessions')
		.select('*')
		.eq('user_id', user.id)
		.eq('status', 'in_progress')
		.eq('mode', 'qa')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	return data ?? null;
}

// Lets the person discard an in-progress session instead of resuming it.
export async function abandonPrepSession(sessionId: string) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const { error } = await supabase
		.from('prep_sessions')
		.delete()
		.eq('id', sessionId)
		.eq('user_id', user.id)
		.eq('status', 'in_progress');

	if (error) return { error: error.message };
	return { abandoned: true };
}

export async function finalizePrepQA({
	sessionId,
	track,
	topic,
	role,
	difficulty,
	questions,
	answers,
}: {
	sessionId: string;
	track: PrepTrack;
	topic: string;
	role: string;
	difficulty: SessionDifficulty;
	questions: PrepQuestion[];
	answers: Record<string, string>;
}) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const results: PrepAnswerResult[] = [];

	for (const q of questions) {
		const answer = (answers[q.id] ?? '').trim();
		if (!answer) {
			results.push({
				id: q.id,
				question: q.question,
				answer: '',
				overallScore: 0,
				relevance: 0,
				clarity: 0,
				completeness: 0,
				suggestion: 'No answer provided.',
			});
			continue;
		}
		const graded = await evaluatePrepAnswer(track, q.question, answer);
		results.push({ id: q.id, question: q.question, answer, ...graded });
	}

	const overallScore =
		Math.round(
			results.reduce((sum, r) => sum + r.overallScore, 0) /
				results.length,
		) * 10; // scale 0-10 avg to a 0-100 score

	const { error } = await supabase
		.from('prep_sessions')
		.update({
			track,
			topic,
			role: role || null,
			difficulty,
			status: 'completed',
			overall_score: overallScore,
			answered_count: results.length,
			duration_left_seconds: 0,
			details: { results },
			completed_at: new Date().toISOString(),
		})
		.eq('id', sessionId)
		.eq('user_id', user.id);

	if (error) return { error: error.message };

	revalidatePath('/dashboard/prep');
	return { results, overallScore };
}

export async function generatePrepGuideSession(
	track: PrepTrack,
	topic: string,
	role: string,
) {
	if (!topic.trim()) return { error: 'Please enter a topic' };

	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	let guide: string;
	try {
		guide = await generatePrepGuide(track, topic.trim(), role.trim());
	} catch {
		return { error: 'Failed to generate guide. Try again.' };
	}

	const payload: PrepSessionInsert = {
		user_id: user.id,
		track,
		mode: 'guide',
		topic,
		role: role || null,
		status: 'completed',
		details: { guide },
		completed_at: new Date().toISOString(),
	};

	const { error } = await supabase.from('prep_sessions').insert(payload);
	if (error) return { error: error.message };

	revalidatePath('/dashboard/prep');
	return { guide };
}

export async function getPrepHistory() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return [];

	const { data } = await supabase
		.from('prep_sessions')
		.select('*')
		.eq('user_id', user.id)
		.eq('status', 'completed')
		.order('created_at', { ascending: false })
		.limit(20);

	return data ?? [];
}

export async function deletePrepSession(sessionId: string) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const { error } = await supabase
		.from('prep_sessions')
		.delete()
		.eq('id', sessionId)
		.eq('user_id', user.id);

	if (error) return { error: error.message };

	revalidatePath('/dashboard/prep');
	return { deleted: true };
}
