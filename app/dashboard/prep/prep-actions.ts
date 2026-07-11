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

export async function startPrepQA(
	track: PrepTrack,
	topic: string,
	role: string,
	difficulty: SessionDifficulty,
	count: number,
) {
	if (!topic.trim()) return { error: 'Please enter a topic' };
	try {
		const questions = await generatePrepQuestions(
			track,
			topic.trim(),
			role.trim(),
			difficulty,
			count,
		);
		return { questions };
	} catch {
		return { error: 'Failed to generate questions. Try again.' };
	}
}

export async function finalizePrepQA({
	track,
	topic,
	role,
	difficulty,
	questions,
	answers,
}: {
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

	const payload: PrepSessionInsert = {
		user_id: user.id,
		track,
		mode: 'qa',
		topic,
		role: role || null,
		difficulty,
		overall_score: overallScore,
		details: { results },
		completed_at: new Date().toISOString(),
	};

	const { error } = await supabase.from('prep_sessions').insert(payload);
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

	// Scoped to the owning user explicitly, on top of whatever RLS
	// policy already exists on prep_sessions — belt and suspenders.
	const { error } = await supabase
		.from('prep_sessions')
		.delete()
		.eq('id', sessionId)
		.eq('user_id', user.id);

	if (error) return { error: error.message };

	revalidatePath('/dashboard/prep');
	return { deleted: true };
}
