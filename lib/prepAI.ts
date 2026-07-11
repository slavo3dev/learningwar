import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { PrepTrack, PrepQuestion } from './prepConstants';
import type { SessionDifficulty } from './quizConstants';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TRACK_CONTEXT: Record<PrepTrack, string> = {
	interview:
		'a job interview coach preparing a candidate for technical and behavioral interview questions',
	sales: 'a sales coach preparing a salesperson for live sales calls, objection handling, and negotiation',
	pitch: 'a pitch coach preparing a founder to deliver and defend a pitch in front of an audience',
};

function extractJSON(text: string) {
	return JSON.parse(text.replace(/```json|```/g, '').trim());
}

function messageText(content: Anthropic.Messages.ContentBlock[]) {
	return content
		.filter((b) => b.type === 'text')
		.map((b) => ('text' in b ? b.text : ''))
		.join('');
}

export async function generatePrepQuestions(
	track: PrepTrack,
	topic: string,
	role: string,
	difficulty: SessionDifficulty,
	count: number,
): Promise<PrepQuestion[]> {
	const message = await anthropic.messages.create({
		model: 'claude-sonnet-5',
		max_tokens: 1500,
		system: `You are ${TRACK_CONTEXT[track]}. Respond ONLY with valid JSON, no markdown fences, no preamble.`,
		messages: [
			{
				role: 'user',
				content: `Generate exactly ${count} realistic, open-ended practice questions.
Topic: "${topic}"
${role ? `Context: ${role}` : ''}
Difficulty: ${difficulty}
Questions should require a spoken/written answer of a few sentences, not yes/no.
Return ONLY: { "questions": [{ "id": "q1", "question": "..." }] }`,
			},
		],
	});

	const parsed = extractJSON(messageText(message.content));
	return parsed.questions as PrepQuestion[];
}

export async function evaluatePrepAnswer(
	track: PrepTrack,
	question: string,
	answer: string,
): Promise<{
	overallScore: number;
	relevance: number;
	clarity: number;
	completeness: number;
	suggestion: string;
}> {
	const message = await anthropic.messages.create({
		model: 'claude-haiku-4-5-20251001',
		max_tokens: 400,
		system: `You are ${TRACK_CONTEXT[track]}, evaluating a practice answer. Be honest but encouraging. Respond ONLY with valid JSON, no markdown fences.`,
		messages: [
			{
				role: 'user',
				content: `Question: ${question}
Answer: ${answer}

Score each 0-10 and return ONLY this JSON:
{ "overallScore": 0-10, "relevance": 0-10, "clarity": 0-10, "completeness": 0-10, "suggestion": "one specific, actionable sentence to improve" }`,
			},
		],
	});

	return extractJSON(messageText(message.content));
}

export async function generatePrepGuide(
	track: PrepTrack,
	topic: string,
	role: string,
): Promise<string> {
	const message = await anthropic.messages.create({
		model: 'claude-sonnet-5',
		max_tokens: 1500,
		system: `You are ${TRACK_CONTEXT[track]}, writing a concise prep guide. Respond in clean markdown, no preamble.`,
		messages: [
			{
				role: 'user',
				content: `Write a practical prep guide.
Topic: "${topic}"
${role ? `Context: ${role}` : ''}

Include: a short framework or method to use (e.g. STAR for behavioral interview answers, or the sales-appropriate equivalent), 4-6 likely questions or scenarios to expect, and a short checklist of things to prepare beforehand. Keep it scannable with headers and bullet points, under 400 words.`,
			},
		],
	});

	return messageText(message.content);
}
