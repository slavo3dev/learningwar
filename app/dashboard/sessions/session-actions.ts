'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib';
import { generateQuizQuestions, gradeOpenEnded } from '@/lib/anthropic';
import type { QuizQuestion, SessionDifficulty } from '@/lib/quizConstants';
import type { Database } from '@/types/database';

type SessionInsert = Database['public']['Tables']['sessions']['Insert'];

export async function startSession(
	topic: string,
	questionCount: number,
	difficulty: SessionDifficulty,
	durationSeconds: number,
) {
	if (!topic.trim()) return { error: 'Please enter a topic' };

	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	let questions: QuizQuestion[];
	try {
		questions = await generateQuizQuestions(
			topic.trim(),
			questionCount,
			difficulty,
		);
	} catch {
		return { error: 'Failed to generate quiz. Try again.' };
	}

	const payload: SessionInsert = {
		user_id: user.id,
		topic: topic.trim(),
		difficulty,
		status: 'in_progress',
		questions,
		answered_count: 0,
		duration_seconds: durationSeconds,
		duration_left_seconds: durationSeconds,
		details: { answers: {} },
	};

	const { data, error } = await supabase
		.from('sessions')
		.insert(payload)
		.select('id')
		.single();

	if (error || !data)
		return { error: error?.message ?? 'Failed to start session' };

	return { questions, sessionId: data.id };
}

export async function saveSessionProgress(
	sessionId: string,
	answers: Record<string, string | number>,
	durationLeftSeconds: number,
) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const answeredCount = Object.values(answers).filter(
		(a) => a !== '' && a !== undefined && a !== null,
	).length;

	const { error } = await supabase
		.from('sessions')
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

export async function getInProgressSession() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;

	const { data } = await supabase
		.from('sessions')
		.select('*')
		.eq('user_id', user.id)
		.eq('status', 'in_progress')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	return data ?? null;
}

export async function abandonSession(sessionId: string) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const { error } = await supabase
		.from('sessions')
		.delete()
		.eq('id', sessionId)
		.eq('user_id', user.id)
		.eq('status', 'in_progress');

	if (error) return { error: error.message };
	return { abandoned: true };
}

export async function submitSession({
	sessionId,
	topic,
	difficulty,
	questions,
	answers,
}: {
	sessionId: string;
	topic: string;
	difficulty: SessionDifficulty;
	questions: QuizQuestion[];
	answers: Record<string, string | number>;
}) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	let correctCount = 0;
	const results: {
		id: string;
		question: string;
		userAnswer: string | number;
		correct: boolean;
		feedback?: string;
		correctAnswer?: string;
	}[] = [];

	for (const q of questions) {
		if (q.type === 'multiple_choice') {
			const isCorrect = answers[q.id] === q.correctIndex;
			if (isCorrect) correctCount++;
			results.push({
				id: q.id,
				question: q.question,
				userAnswer: answers[q.id] ?? '',
				correct: isCorrect,
				correctAnswer: q.options[q.correctIndex],
			});
		} else {
			const userAnswer = String(answers[q.id] ?? '').trim();
			if (!userAnswer) {
				results.push({
					id: q.id,
					question: q.question,
					userAnswer: '',
					correct: false,
					feedback: 'No answer provided',
				});
				continue;
			}
			const graded = await gradeOpenEnded(
				q.question,
				q.rubric,
				userAnswer,
			);
			if (graded.correct) correctCount++;
			results.push({
				id: q.id,
				question: q.question,
				userAnswer,
				correct: graded.correct,
				feedback: graded.feedback,
			});
		}
	}

	const score = Math.round((correctCount / questions.length) * 100);

	const { error } = await supabase
		.from('sessions')
		.update({
			topic,
			difficulty,
			status: 'completed',
			score,
			answered_count: results.length,
			duration_left_seconds: 0,
			details: { results },
			completed_at: new Date().toISOString(),
		})
		.eq('id', sessionId)
		.eq('user_id', user.id);

	if (error) return { error: error.message };

	revalidatePath('/dashboard/sessions');
	return { score, results };
}

export async function getRecentTopics() {
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

export async function getSessionHistory() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return [];

	const { data } = await supabase
		.from('sessions')
		.select(
			'id, topic, score, difficulty, details, completed_at, created_at',
		)
		.eq('user_id', user.id)
		.eq('status', 'completed')
		.order('created_at', { ascending: false })
		.limit(20);

	return data ?? [];
}

export async function deleteSession(sessionId: string) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: 'Not authenticated' };

	const { error } = await supabase
		.from('sessions')
		.delete()
		.eq('id', sessionId)
		.eq('user_id', user.id);

	if (error) return { error: error.message };
	return { deleted: true };
}
