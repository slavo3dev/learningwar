'use client';

import { useState } from 'react';
import {
	startSession,
	submitSession,
} from '@/app/dashboard/sessions/session-actions';
import {
	DIFFICULTY_META,
	type QuizQuestion,
	type SessionDifficulty,
} from '@/lib/quizConstants';

type Stage = 'setup' | 'quiz' | 'results';

export function SessionRunner({ recentTopics }: { recentTopics: string[] }) {
	const [stage, setStage] = useState<Stage>('setup');
	const [topic, setTopic] = useState('');
	const [questionCount, setQuestionCount] = useState<6 | 9>(6);
	const [difficulty, setDifficulty] = useState<SessionDifficulty>('medium');
	const [questions, setQuestions] = useState<QuizQuestion[]>([]);
	const [answers, setAnswers] = useState<Record<string, string | number>>({});
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [results, setResults] = useState<
		{ id: string; correct: boolean; feedback?: string }[]
	>([]);
	const [score, setScore] = useState(0);

	async function handleStart() {
		if (!topic.trim()) {
			setError('Please enter a topic');
			return;
		}
		setError(null);
		setIsLoading(true);
		const result = await startSession(topic, questionCount, difficulty);
		setIsLoading(false);
		if (result.error || !result.questions) {
			setError(result.error ?? 'Something went wrong');
			return;
		}
		setQuestions(result.questions);
		setAnswers({});
		setCurrentIndex(0);
		setStage('quiz');
	}

	function handleAnswer(id: string, value: string | number) {
		setAnswers((prev) => ({ ...prev, [id]: value }));
	}

	async function handleSubmit() {
		setIsLoading(true);
		const result = await submitSession({
			topic,
			difficulty,
			questions,
			answers,
		});
		setIsLoading(false);
		if (result.error) {
			setError(result.error);
			return;
		}
		setScore(result.score ?? 0);
		setResults(result.results ?? []);
		setStage('results');
	}

	function reset() {
		setStage('setup');
		setTopic('');
		setQuestions([]);
		setAnswers({});
		setResults([]);
		setError(null);
	}

	if (stage === 'setup') {
		return (
			<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
				<h2 className='text-base font-semibold text-gray-900'>
					Start a knowledge check
				</h2>
				<p className='mt-1 text-sm text-gray-500'>
					Pick a topic and I&apos;ll quiz you on it.
				</p>

				<div className='mt-4'>
					<label className='mb-1.5 block text-sm font-medium text-gray-700'>
						Topic
					</label>
					<input
						value={topic}
						onChange={(e) => setTopic(e.target.value)}
						placeholder='e.g. React server components'
						className='w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10'
					/>
				</div>

				{recentTopics.length > 0 && (
					<div className='mt-3'>
						<p className='mb-1.5 text-xs font-medium text-gray-500'>
							From your recent porch updates
						</p>
						<div className='flex flex-wrap gap-1.5'>
							{recentTopics.slice(0, 6).map((t, i) => (
								<button
									key={i}
									onClick={() =>
										setTopic(
											t.length > 60
												? t.slice(0, 60) + '...'
												: t,
										)
									}
									className='rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:border-[#1a6fca] hover:text-[#1a6fca]'>
									{t.length > 40 ? t.slice(0, 40) + '...' : t}
								</button>
							))}
						</div>
					</div>
				)}

				<div className='mt-4'>
					<p className='mb-1.5 text-sm font-medium text-gray-700'>
						Difficulty
					</p>
					<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
						{(
							Object.keys(DIFFICULTY_META) as SessionDifficulty[]
						).map((d) => (
							<button
								key={d}
								onClick={() => setDifficulty(d)}
								className={`rounded-lg border p-2.5 text-left transition-colors ${
									difficulty === d
										? 'border-[#1a6fca] bg-[#1a6fca]/5'
										: 'border-gray-200 hover:bg-gray-50'
								}`}>
								<p
									className={`text-sm font-semibold ${
										difficulty === d
											? 'text-[#1a6fca]'
											: 'text-gray-900'
									}`}>
									{DIFFICULTY_META[d].label}
								</p>
								<p className='text-xs text-gray-500'>
									{DIFFICULTY_META[d].description}
								</p>
							</button>
						))}
					</div>
				</div>

				<div className='mt-4'>
					<p className='mb-1.5 text-sm font-medium text-gray-700'>
						Number of questions
					</p>
					<div className='flex gap-2'>
						{[6, 9].map((n) => (
							<button
								key={n}
								onClick={() => setQuestionCount(n as 6 | 9)}
								className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
									questionCount === n
										? 'border-[#1a6fca] bg-[#1a6fca]/10 text-[#1a6fca]'
										: 'border-gray-200 text-gray-600 hover:bg-gray-50'
								}`}>
								{n}
							</button>
						))}
					</div>
				</div>

				{error && <p className='mt-3 text-xs text-red-600'>{error}</p>}

				<button
					onClick={handleStart}
					disabled={isLoading}
					className='mt-5 rounded-lg bg-[#1a6fca] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1558a3] disabled:opacity-50'>
					{isLoading ? 'Generating questions...' : 'Start session'}
				</button>

				<div className='mt-8 grid grid-cols-1 gap-3 border-t border-gray-100 pt-6 sm:grid-cols-3'>
					<div className='rounded-lg bg-gray-50 p-3'>
						<p className='text-xs font-semibold text-gray-700'>
							Mixed format
						</p>
						<p className='mt-1 text-xs text-gray-500'>
							Half multiple choice, half open-ended — tests recall
							and real understanding.
						</p>
					</div>
					<div className='rounded-lg bg-gray-50 p-3'>
						<p className='text-xs font-semibold text-gray-700'>
							AI-graded
						</p>
						<p className='mt-1 text-xs text-gray-500'>
							Open-ended answers are graded against a rubric, not
							exact string matching.
						</p>
					</div>
					<div className='rounded-lg bg-gray-50 p-3'>
						<p className='text-xs font-semibold text-gray-700'>
							Saved history
						</p>
						<p className='mt-1 text-xs text-gray-500'>
							Every session is saved with full
							question-by-question review.
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (stage === 'quiz') {
		const q = questions[currentIndex];
		const isLast = currentIndex === questions.length - 1;
		const hasAnswer = answers[q.id] !== undefined && answers[q.id] !== '';

		return (
			<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
				<div className='mb-4 flex items-center justify-between'>
					<p className='text-xs font-medium uppercase tracking-wide text-gray-400'>
						Question {currentIndex + 1} of {questions.length} ·{' '}
						{DIFFICULTY_META[difficulty].label}
					</p>
					<div className='h-1.5 w-32 overflow-hidden rounded-full bg-gray-100'>
						<div
							className='h-full bg-[#1a6fca] transition-all'
							style={{
								width: `${((currentIndex + 1) / questions.length) * 100}%`,
							}}
						/>
					</div>
				</div>

				<p className='text-sm font-medium text-gray-900'>
					{q.question}
				</p>

				{q.type === 'multiple_choice' ? (
					<div className='mt-4 space-y-2'>
						{q.options.map((opt, i) => (
							<label
								key={i}
								className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
									answers[q.id] === i
										? 'border-[#1a6fca] bg-[#1a6fca]/5'
										: 'border-gray-200 hover:bg-gray-50'
								}`}>
								<input
									type='radio'
									name={q.id}
									checked={answers[q.id] === i}
									onChange={() => handleAnswer(q.id, i)}
									className='h-4 w-4 text-[#1a6fca] focus:ring-[#1a6fca]'
								/>
								{opt}
							</label>
						))}
					</div>
				) : (
					<textarea
						value={(answers[q.id] as string) ?? ''}
						onChange={(e) => handleAnswer(q.id, e.target.value)}
						rows={3}
						placeholder='Type your answer...'
						className='mt-4 w-full resize-none rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10'
					/>
				)}

				{error && <p className='mt-3 text-xs text-red-600'>{error}</p>}

				<div className='mt-5 flex justify-between'>
					<button
						onClick={() =>
							setCurrentIndex((i) => Math.max(0, i - 1))
						}
						disabled={currentIndex === 0}
						className='rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-40'>
						Back
					</button>
					{isLast ? (
						<button
							onClick={handleSubmit}
							disabled={isLoading || !hasAnswer}
							className='rounded-lg bg-[#1a6fca] px-5 py-2 text-sm font-medium text-white hover:bg-[#1558a3] disabled:opacity-50'>
							{isLoading ? 'Grading...' : 'Submit'}
						</button>
					) : (
						<button
							onClick={() => setCurrentIndex((i) => i + 1)}
							disabled={!hasAnswer}
							className='rounded-lg bg-[#1a6fca] px-5 py-2 text-sm font-medium text-white hover:bg-[#1558a3] disabled:opacity-50'>
							Next
						</button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
			<div className='text-center'>
				<p className='text-xs font-medium uppercase tracking-wide text-gray-400'>
					Session complete · {DIFFICULTY_META[difficulty].label}
				</p>
				<p className='mt-1 text-4xl font-bold text-[#1a6fca]'>
					{score}%
				</p>
				<p className='mt-1 text-sm text-gray-500'>{topic}</p>
			</div>

			<div className='mt-6 space-y-2'>
				{questions.map((q, i) => {
					const r = results.find(
						(res: { id: string }) => res.id === q.id,
					);
					return (
						<div
							key={q.id}
							className={`rounded-lg border p-3 text-sm ${
								r?.correct
									? 'border-green-200 bg-green-50'
									: 'border-red-200 bg-red-50'
							}`}>
							<div className='flex items-start justify-between gap-2'>
								<p className='font-medium text-gray-900'>
									{i + 1}. {q.question}
								</p>
								<span
									className={
										r?.correct
											? 'text-green-600'
											: 'text-red-600'
									}>
									{r?.correct ? '✓' : '✗'}
								</span>
							</div>
							{r?.feedback && (
								<p className='mt-1 text-xs text-gray-600'>
									{r.feedback}
								</p>
							)}
						</div>
					);
				})}
			</div>

			<button
				onClick={reset}
				className='mt-5 rounded-lg bg-[#1a6fca] px-5 py-2 text-sm font-medium text-white hover:bg-[#1558a3]'>
				Start another session
			</button>
		</div>
	);
}
