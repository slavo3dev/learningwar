'use server';

import { createServerSupabaseClient } from '@/lib';
import { generateQuizQuestions, gradeOpenEnded } from '@/lib/anthropic';
import type { QuizQuestion, SessionDifficulty } from '@/lib/quizConstants';
import type { Database } from '@/types/database';

type SessionInsert = Database['public']['Tables']['sessions']['Insert'];

export async function startSession(
	topic: string,
	questionCount: number,
	difficulty: SessionDifficulty,
) {
	if (!topic.trim()) return { error: 'Please enter a topic' };
	try {
		const questions = await generateQuizQuestions(
			topic.trim(),
			questionCount,
			difficulty,
		);
		return { questions };
	} catch {
		return { error: 'Failed to generate quiz. Try again.' };
	}
}

export async function submitSession({
	topic,
	difficulty,
	questions,
	answers,
}: {
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

	const payload: SessionInsert = {
		user_id: user.id,
		topic,
		score,
		difficulty,
		details: { results },
		completed_at: new Date().toISOString(),
	};

	const { error } = await supabase.from('sessions').insert(payload);

	if (error) return { error: error.message };

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
		.order('created_at', { ascending: false })
		.limit(20);

	return data ?? [];
}
