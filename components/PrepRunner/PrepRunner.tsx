'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
	startPrepQA,
	finalizePrepQA,
	generatePrepGuideSession,
	savePrepProgress,
	abandonPrepSession,
} from '@/app/dashboard/prep/prep-actions';
import {
	TRACK_META,
	MODE_META,
	type PrepTrack,
	type PrepMode,
	type PrepQuestion,
	type PrepAnswerResult,
} from '@/lib/prepConstants';
import { DIFFICULTY_META, type SessionDifficulty } from '@/lib/quizConstants';
import type { PrepSession } from '@/types/database';

type Stage = 'setup' | 'qa' | 'guide' | 'results';

const AUTOSAVE_INTERVAL_MS = 15_000;
const DURATION_OPTIONS_MIN = [5, 10, 15, 20];

function formatTime(totalSeconds: number) {
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PrepRunner({
	recentTopics,
	inProgressSession,
}: {
	recentTopics: string[];
	inProgressSession: PrepSession | null;
}) {
	const router = useRouter();
	const [stage, setStage] = useState<Stage>('setup');
	const [track, setTrack] = useState<PrepTrack>('interview');
	const [mode, setMode] = useState<PrepMode>('qa');
	const [topic, setTopic] = useState('');
	const [role, setRole] = useState('');
	const [difficulty, setDifficulty] = useState<SessionDifficulty>('medium');
	const [questionCount, setQuestionCount] = useState<number>(6);
	const [customCount, setCustomCount] = useState('');
	const [durationMinutes, setDurationMinutes] = useState<number>(10);
	const [customDuration, setCustomDuration] = useState('');
	const [questions, setQuestions] = useState<PrepQuestion[]>([]);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [guide, setGuide] = useState('');
	const [results, setResults] = useState<PrepAnswerResult[]>([]);
	const [overallScore, setOverallScore] = useState(0);
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

	// Countdown ticker — runs once a second while actively answering.
	useEffect(() => {
		if (stage !== 'qa' || secondsLeft === null) return;
		if (secondsLeft <= 0) {
			handleSubmitAll();
			return;
		}
		const tick = setInterval(() => {
			setSecondsLeft((s) => (s !== null ? s - 1 : s));
		}, 1000);
		return () => clearInterval(tick);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stage, secondsLeft]);

	// Periodic autosave — protects against a closed tab / crash mid-session.
	useEffect(() => {
		if (stage !== 'qa' || !sessionId) return;
		const interval = setInterval(() => {
			savePrepProgress(
				sessionIdRef.current!,
				answersRef.current,
				secondsLeftRef.current ?? 0,
			);
		}, AUTOSAVE_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [stage, sessionId]);

	function saveNow() {
		if (!sessionId) return;
		savePrepProgress(
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
					answers?: Record<string, string>;
				} | null
			)?.answers ?? {};
		setSessionId(inProgressSession.id);
		setTrack(inProgressSession.track as PrepTrack);
		setTopic(inProgressSession.topic);
		setRole(inProgressSession.role ?? '');
		setDifficulty(
			(inProgressSession.difficulty as SessionDifficulty) ?? 'medium',
		);
		setQuestions((inProgressSession.questions as PrepQuestion[]) ?? []);
		setAnswers(savedAnswers);
		setSecondsLeft(inProgressSession.duration_left_seconds ?? 0);
		setCurrentIndex(0);
		setResumeChoicePending(false);
		setStage('qa');
	}

	async function handleDiscardResume() {
		if (!inProgressSession) return;
		await abandonPrepSession(inProgressSession.id);
		setResumeChoicePending(false);
	}

	async function handleStart() {
		if (!topic.trim()) {
			setError('Please enter a topic');
			return;
		}
		setError(null);
		setIsLoading(true);

		if (mode === 'guide') {
			const result = await generatePrepGuideSession(track, topic, role);
			setIsLoading(false);
			if (result.error || !result.guide) {
				setError(result.error ?? 'Something went wrong');
				return;
			}
			setGuide(result.guide);
			router.refresh();
			setStage('guide');
			return;
		}

		const totalDurationSeconds = durationMinutes * 60;
		const result = await startPrepQA(
			track,
			topic,
			role,
			difficulty,
			questionCount,
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
		setStage('qa');
	}

	function goNext() {
		saveNow();
		setCurrentIndex((i) => i + 1);
	}

	function goBack() {
		saveNow();
		setCurrentIndex((i) => Math.max(0, i - 1));
	}

	async function handleSubmitAll() {
		if (!sessionId) return;
		setIsLoading(true);
		const result = await finalizePrepQA({
			sessionId,
			track,
			topic,
			role,
			difficulty,
			questions,
			answers: answersRef.current,
		});
		setIsLoading(false);
		if (result.error) {
			setError(result.error);
			return;
		}
		setResults(result.results ?? []);
		setOverallScore(result.overallScore ?? 0);
		router.refresh();
		setStage('results');
	}

	function reset() {
		setStage('setup');
		setTopic('');
		setRole('');
		setQuestions([]);
		setAnswers({});
		setGuide('');
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
					You have an unfinished{' '}
					{TRACK_META[inProgressSession.track as PrepTrack]?.label ??
						inProgressSession.track}{' '}
					session on{' '}
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
					Prep Sessions
				</h2>
				<p className='mt-1 text-sm text-gray-500'>
					Practice interviews, sales calls, and pitches with AI
					feedback.
				</p>

				<div className='mt-4 flex gap-2'>
					{(Object.keys(TRACK_META) as PrepTrack[]).map((t) => (
						<button
							key={t}
							onClick={() => setTrack(t)}
							className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
								track === t
									? 'border-[#1a6fca] bg-[#1a6fca]/10 text-[#1a6fca]'
									: 'border-gray-200 text-gray-600 hover:bg-gray-50'
							}`}>
							{TRACK_META[t].label}
						</button>
					))}
				</div>

				<div className='mt-4 flex gap-2'>
					{(Object.keys(MODE_META) as PrepMode[]).map((m) => (
						<button
							key={m}
							onClick={() => setMode(m)}
							className={`flex-1 rounded-lg border p-2.5 text-left transition-colors ${
								mode === m
									? 'border-[#1a6fca] bg-[#1a6fca]/5'
									: 'border-gray-200 hover:bg-gray-50'
							}`}>
							<p
								className={`text-sm font-semibold ${mode === m ? 'text-[#1a6fca]' : 'text-gray-900'}`}>
								{MODE_META[m].label}
							</p>
							<p className='text-xs text-gray-500'>
								{MODE_META[m].description}
							</p>
						</button>
					))}
				</div>

				<div className='mt-4'>
					<label className='mb-1.5 block text-sm font-medium text-gray-700'>
						Topic
					</label>
					<input
						value={topic}
						onChange={(e) => setTopic(e.target.value)}
						placeholder={TRACK_META[track].topicPlaceholder}
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
					<label className='mb-1.5 block text-sm font-medium text-gray-700'>
						{TRACK_META[track].roleLabel}
					</label>
					<input
						value={role}
						onChange={(e) => setRole(e.target.value)}
						placeholder={TRACK_META[track].rolePlaceholder}
						className='w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10'
					/>
				</div>

				{mode === 'qa' && (
					<>
						<div className='mt-4'>
							<p className='mb-1.5 text-sm font-medium text-gray-700'>
								Difficulty
							</p>
							<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
								{(
									Object.keys(
										DIFFICULTY_META,
									) as SessionDifficulty[]
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
											className={`text-sm font-semibold ${difficulty === d ? 'text-[#1a6fca]' : 'text-gray-900'}`}>
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
							<div className='flex flex-wrap items-center gap-2'>
								{[6, 9].map((n) => (
									<button
										key={n}
										onClick={() => {
											setQuestionCount(n);
											setCustomCount('');
										}}
										className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
											questionCount === n && !customCount
												? 'border-[#1a6fca] bg-[#1a6fca]/10 text-[#1a6fca]'
												: 'border-gray-200 text-gray-600 hover:bg-gray-50'
										}`}>
										{n}
									</button>
								))}
								<input
									type='number'
									min={1}
									max={20}
									value={customCount}
									onChange={(e) => {
										const val = e.target.value;
										setCustomCount(val);
										const num = parseInt(val, 10);
										if (
											!isNaN(num) &&
											num >= 1 &&
											num <= 20
										) {
											setQuestionCount(num);
										}
									}}
									placeholder='Custom'
									className={`w-20 rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors ${
										customCount
											? 'border-[#1a6fca] bg-[#1a6fca]/5 text-[#1a6fca]'
											: 'border-gray-200 text-gray-600 focus:border-[#1a6fca]'
									}`}
								/>
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
											durationMinutes === n &&
											!customDuration
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
										if (
											!isNaN(num) &&
											num >= 1 &&
											num <= 120
										) {
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
								Your session auto-submits when time runs out —
								progress saves automatically, so closing the tab
								won&apos;t lose your answers.
							</p>
						</div>
					</>
				)}

				{error && <p className='mt-3 text-xs text-red-600'>{error}</p>}

				<button
					onClick={handleStart}
					disabled={isLoading}
					className='mt-5 rounded-lg bg-[#1a6fca] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1558a3] disabled:opacity-50'>
					{isLoading
						? 'Generating...'
						: mode === 'guide'
							? 'Generate guide'
							: 'Start practice'}
				</button>
			</div>
		);
	}

	if (stage === 'guide') {
		return (
			<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
				<div className='mb-4 flex items-center justify-between'>
					<div>
						<p className='text-xs font-medium uppercase tracking-wide text-gray-400'>
							{TRACK_META[track].label} · Guide
						</p>
						<h2 className='mt-0.5 text-base font-semibold text-gray-900'>
							{topic}
						</h2>
					</div>
				</div>
				<div className='prose prose-sm max-w-none whitespace-pre-wrap text-sm text-gray-700'>
					{guide}
				</div>
				<div className='mt-5 flex gap-2'>
					<button
						onClick={() => {
							setMode('qa');
							setStage('setup');
						}}
						className='rounded-lg bg-[#1a6fca] px-5 py-2 text-sm font-medium text-white hover:bg-[#1558a3]'>
						Practice this with Q&A
					</button>
					<button
						onClick={reset}
						className='rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100'>
						Start over
					</button>
				</div>
			</div>
		);
	}

	if (stage === 'qa') {
		const q = questions[currentIndex];
		const isLast = currentIndex === questions.length - 1;
		const hasAnswer = (answers[q.id] ?? '').trim().length > 0;
		const timeLow = secondsLeft !== null && secondsLeft <= 60;

		return (
			<div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
				<div className='mb-4 flex items-center justify-between'>
					<p className='text-xs font-medium uppercase tracking-wide text-gray-400'>
						{TRACK_META[track].label} · Question {currentIndex + 1}{' '}
						of {questions.length}
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

				<textarea
					value={answers[q.id] ?? ''}
					onChange={(e) =>
						setAnswers((prev) => ({
							...prev,
							[q.id]: e.target.value,
						}))
					}
					rows={5}
					placeholder='Type your answer as you would say it out loud...'
					className='mt-4 w-full resize-none rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-[#1a6fca] focus:ring-2 focus:ring-[#1a6fca]/10'
				/>

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
							onClick={handleSubmitAll}
							disabled={isLoading || !hasAnswer}
							className='rounded-lg bg-[#1a6fca] px-5 py-2 text-sm font-medium text-white hover:bg-[#1558a3] disabled:opacity-50'>
							{isLoading
								? 'Scoring answers...'
								: 'Finish & get feedback'}
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
					{TRACK_META[track].label} · Session complete
				</p>
				<p className='mt-1 text-4xl font-bold text-[#1a6fca]'>
					{overallScore}%
				</p>
				<p className='mt-1 text-sm text-gray-500'>{topic}</p>
			</div>

			<div className='mt-6 space-y-3'>
				{results.map((r, i) => (
					<div
						key={r.id}
						className='rounded-lg border border-gray-200 p-3'>
						<p className='text-sm font-medium text-gray-900'>
							{i + 1}. {r.question}
						</p>
						<p className='mt-1 text-xs text-gray-500'>
							{r.answer || '(no answer)'}
						</p>
						<div className='mt-2 grid grid-cols-4 gap-2 text-center text-xs'>
							{[
								['Overall', r.overallScore],
								['Relevance', r.relevance],
								['Clarity', r.clarity],
								['Completeness', r.completeness],
							].map(([label, val]) => (
								<div
									key={label as string}
									className='rounded-md bg-gray-50 py-1.5'>
									<p className='font-semibold text-gray-900'>
										{val}/10
									</p>
									<p className='text-gray-400'>{label}</p>
								</div>
							))}
						</div>
						{r.suggestion && (
							<p className='mt-2 text-xs italic text-[#1a6fca]'>
								{r.suggestion}
							</p>
						)}
					</div>
				))}
			</div>

			<button
				onClick={reset}
				className='mt-5 rounded-lg bg-[#1a6fca] px-5 py-2 text-sm font-medium text-white hover:bg-[#1558a3]'>
				Start another session
			</button>
		</div>
	);
}
