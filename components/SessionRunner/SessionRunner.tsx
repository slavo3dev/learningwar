'use client';

import { useState, useEffect, useRef } from 'react';
import {
	startSession,
	submitSession,
	saveSessionProgress,
	abandonSession,
} from '@/app/dashboard/sessions/session-actions';
import {
	DIFFICULTY_META,
	type QuizQuestion,
	type SessionDifficulty,
} from '@/lib/quizConstants';
import type { Session } from '@/types/database';

type Stage = 'setup' | 'quiz' | 'results';

const AUTOSAVE_INTERVAL_MS = 15_000;
const DURATION_OPTIONS_MIN = [5, 10, 15, 20];

function formatTime(totalSeconds: number) {
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SessionRunner({
	recentTopics,
	inProgressSession,
}: {
	recentTopics: string[];
	inProgressSession: Session | null;
}) {
	const [stage, setStage] = useState<Stage>('setup');
	const [topic, setTopic] = useState('');
	const [questionCount, setQuestionCount] = useState<6 | 9>(6);
	const [difficulty, setDifficulty] = useState<SessionDifficulty>('medium');
	const [durationMinutes, setDurationMinutes] = useState<number>(10);
	const [customDuration, setCustomDuration] = useState('');
	const [questions, setQuestions] = useState<QuizQuestion[]>([]);
	const [answers, setAnswers] = useState<Record<string, string | number>>({});
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [results, setResults] = useState<
		{ id: string; correct: boolean; feedback?: string }[]
	>([]);
	const [score, setScore] = useState(0);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
	const [resumeChoicePending, setResumeChoicePending] =
		useState(!!inProgressSession);

	const answersRef = useRef(answers);
	answersRef.current = answers;
	const secondsLeftRef = useRef(secondsLeft);
	secondsLeftRef.current = secondsLeft;
	const sessionIdRef = useRef(sessionId);
	sessionIdRef.current = sessionId;
	const questionsRef = useRef(questions);
	questionsRef.current = questions;
	const topicRef = useRef(topic);
	topicRef.current = topic;
	const difficultyRef = useRef(difficulty);
	difficultyRef.current = difficulty;

	useEffect(() => {
		if (stage !== 'quiz' || secondsLeft === null) return;
		if (secondsLeft <= 0) {
			handleSubmit();
			return;
		}
		const tick = setInterval(() => {
			setSecondsLeft((s) => (s !== null ? s - 1 : s));
		}, 1000);
		return () => clearInterval(tick);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stage, secondsLeft]);

	useEffect(() => {
		if (stage !== 'quiz' || !sessionId) return;
		const interval = setInterval(() => {
			saveSessionProgress(
				sessionIdRef.current!,
				answersRef.current,
				secondsLeftRef.current ?? 0,
			);
		}, AUTOSAVE_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [stage, sessionId]);

	function saveNow() {
		if (!sessionId) return;
		saveSessionProgress(
			sessionId,
			answersRef.current,
			secondsLeftRef.current ?? 0,
		);
	}

	async function handleResume() {
		if (!inProgressSession) return;
		const savedAnswers =
			(
				inProgressSession.details as {
					answers?: Record<string, string | number>;
				} | null
			)?.answers ?? {};
		setSessionId(inProgressSession.id);
		setTopic(inProgressSession.topic);
		setDifficulty(
			(inProgressSession.difficulty as SessionDifficulty) ?? 'medium',
		);
		setQuestions((inProgressSession.questions as QuizQuestion[]) ?? []);
		setAnswers(savedAnswers);
		setSecondsLeft(inProgressSession.duration_left_seconds ?? 0);
		setCurrentIndex(0);
		setResumeChoicePending(false);
		setStage('quiz');
	}

	async function handleDiscardResume() {
		if (!inProgressSession) return;
		await abandonSession(inProgressSession.id);
		setResumeChoicePending(false);
	}

	async function handleStart() {
		if (!topic.trim()) {
			setError('Please enter a topic');
			return;
		}
		setError(null);
		setIsLoading(true);
		const totalDurationSeconds = durationMinutes * 60;
		const result = await startSession(
			topic,
			questionCount,
			difficulty,
			totalDurationSeconds,
		);
		setIsLoading(false);
		if (result.error || !result.questions || !result.sessionId) {
			setError(result.error ?? 'Something went wrong');
			return;
		}
		setQuestions(result.questions);
		setAnswers({});
		setCurrentIndex(0);
		setSessionId(result.sessionId);
		setSecondsLeft(totalDurationSeconds);
		setStage('quiz');
	}

	function handleAnswer(id: string, value: string | number) {
		setAnswers((prev) => ({ ...prev, [id]: value }));
	}

	function goNext() {
		saveNow();
		setCurrentIndex((i) => i + 1);
	}

	function goBack() {
		saveNow();
		setCurrentIndex((i) => Math.max(0, i - 1));
	}

	async function handleSubmit() {
		if (!sessionIdRef.current) return;
		setIsLoading(true);
		const result = await submitSession({
			sessionId: sessionIdRef.current,
			topic: topicRef.current,
			difficulty: difficultyRef.current,
			questions: questionsRef.current,
			answers: answersRef.current,
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
		setSessionId(null);
		setSecondsLeft(null);
	}

	if (resumeChoicePending && inProgressSession) {
		return (
			<div className='rounded-xl border border-[#1a6fca]/30 bg-[#1a6fca]/5 p-6 shadow-sm'>
				<h2 className='text-base font-semibold text-gray-900'>
					Pick up where you left off?
				</h2>
				<p className='mt-1 text-sm text-gray-600'>
					You have an unfinished knowledge check on{' '}
					<span className='font-medium'>
						&ldquo;{inProgressSession.topic}&rdquo;
					</span>{' '}
					with{' '}
					{inProgressSession.duration_left_seconds != null
						? formatTime(inProgressSession.duration_left_seconds)
						: 'time'}{' '}
					left.
				</p>
				<div className='mt-4 flex gap-2'>
					<button
						onClick={handleResume}
						className='rounded-lg bg-[#1a6fca] px-5 py-2 text-sm font-medium text-white hover:bg-[#1558a3]'>
						Resume session
					</button>
					<button
						onClick={handleDiscardResume}
						className='rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50'>
						Discard &amp; start new
					</button>
				</div>
			</div>
		);
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

				<div className='mt-4'>
					<p className='mb-1.5 text-sm font-medium text-gray-700'>
						Time limit
					</p>
					<div className='flex flex-wrap items-center gap-2'>
						{DURATION_OPTIONS_MIN.map((n) => (
							<button
								key={n}
								onClick={() => {
									setDurationMinutes(n);
									setCustomDuration('');
								}}
								className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
									durationMinutes === n && !customDuration
										? 'border-[#1a6fca] bg-[#1a6fca]/10 text-[#1a6fca]'
										: 'border-gray-200 text-gray-600 hover:bg-gray-50'
								}`}>
								{n} min
							</button>
						))}
						<input
							type='number'
							min={1}
							max={120}
							value={customDuration}
							onChange={(e) => {
								const val = e.target.value;
								setCustomDuration(val);
								const num = parseInt(val, 10);
								if (!isNaN(num) && num >= 1 && num <= 120) {
									setDurationMinutes(num);
								}
							}}
							placeholder='Custom min'
							className={`w-24 rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors ${
								customDuration
									? 'border-[#1a6fca] bg-[#1a6fca]/5 text-[#1a6fca]'
									: 'border-gray-200 text-gray-600 focus:border-[#1a6fca]'
							}`}
						/>
					</div>
					<p className='mt-1.5 text-xs text-gray-400'>
						Your session auto-submits when time runs out — progress
						saves automatically, so closing the tab won&apos;t lose
						your answers.
					</p>
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
		const timeLow = secondsLeft !== null && secondsLeft <= 60;

		return (
			<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
				<div className='mb-4 flex items-center justify-between'>
					<p className='text-xs font-medium uppercase tracking-wide text-gray-400'>
						Question {currentIndex + 1} of {questions.length} ·{' '}
						{DIFFICULTY_META[difficulty].label}
					</p>
					<div className='flex items-center gap-3'>
						{secondsLeft !== null && (
							<span
								className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
									timeLow
										? 'bg-red-100 text-red-700'
										: 'bg-gray-100 text-gray-600'
								}`}>
								{formatTime(secondsLeft)}
							</span>
						)}
						<div className='h-1.5 w-32 overflow-hidden rounded-full bg-gray-100'>
							<div
								className='h-full bg-[#1a6fca] transition-all'
								style={{
									width: `${((currentIndex + 1) / questions.length) * 100}%`,
								}}
							/>
						</div>
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
						onClick={goBack}
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
							onClick={goNext}
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
