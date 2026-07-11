import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import {
	DIFFICULTY_META,
	type SessionDifficulty,
	type QuizQuestion,
} from './quizConstants';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DIFFICULTY_PROMPTS: Record<SessionDifficulty, string> = {
	basic: 'Keep questions at an introductory level — core definitions and fundamental concepts a beginner should know.',
	medium: 'Write intermediate questions that test applying the concept to realistic situations, not just recall.',
	advanced:
		'Write advanced questions covering deeper mechanics, common edge cases, and tradeoffs between approaches.',
	expert: 'Write expert-level questions requiring nuanced judgment, subtle distinctions between similar concepts, and awareness of common misconceptions.',
	legend: 'Write extremely rigorous, legend-tier questions — the kind that would challenge someone deeply experienced in this topic. Obscure edge cases, precise technical distinctions, and scenarios with no obvious right answer at first glance are welcome.',
};

export async function generateQuizQuestions(
	topic: string,
	count: number,
	difficulty: SessionDifficulty,
): Promise<QuizQuestion[]> {
	const mcCount = Math.ceil(count / 2);
	const openCount = count - mcCount;

	const message = await anthropic.messages.create({
		model: 'claude-sonnet-5',
		max_tokens: 2000,
		system: 'You write concise knowledge-check quiz questions for a learner studying a technical topic. Respond ONLY with valid JSON, no markdown fences, no preamble.',
		messages: [
			{
				role: 'user',
				content: `Create a quiz on the topic: "${topic}".
Difficulty level: ${difficulty}. ${DIFFICULTY_PROMPTS[difficulty]}
Generate exactly ${mcCount} multiple_choice questions and ${openCount} open_ended questions (${count} total).
Multiple choice: 4 options, only one correct.
Open ended: a short rubric describing what a correct answer should cover (1-2 sentences).
Return ONLY this JSON shape, nothing else:
{
  "questions": [
    { "id": "q1", "type": "multiple_choice", "question": "...", "options": ["...","...","...","..."], "correctIndex": 0 },
    { "id": "q2", "type": "open_ended", "question": "...", "rubric": "..." }
  ]
}`,
			},
		],
	});

	const text = message.content
		.filter((b) => b.type === 'text')
		.map((b) => ('text' in b ? b.text : ''))
		.join('');

	const cleaned = text.replace(/```json|```/g, '').trim();
	const parsed = JSON.parse(cleaned);
	return parsed.questions as QuizQuestion[];
}

export async function gradeOpenEnded(
	question: string,
	rubric: string,
	answer: string,
): Promise<{ correct: boolean; feedback: string }> {
	const message = await anthropic.messages.create({
		model: 'claude-haiku-4-5-20251001',
		max_tokens: 300,
		system: "You grade a learner's short answer against a rubric. Be encouraging but honest. Respond ONLY with valid JSON, no markdown fences.",
		messages: [
			{
				role: 'user',
				content: `Question: ${question}
Rubric for a correct answer: ${rubric}
Learner's answer: ${answer}

Return ONLY this JSON: { "correct": true or false, "feedback": "one short sentence of feedback" }`,
			},
		],
	});

	const text = message.content
		.filter((b) => b.type === 'text')
		.map((b) => ('text' in b ? b.text : ''))
		.join('');

	const cleaned = text.replace(/```json|```/g, '').trim();
	return JSON.parse(cleaned);
}
