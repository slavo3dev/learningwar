'use client';

import { useState, useTransition } from 'react';
import {
	postWallMessage,
	getWallMessages,
} from '@/app/dashboard/inbox-actions';

type Message = {
	id: string;
	sender_id: string;
	parent_id: string | null;
	body: string;
	read_at: string | null;
	created_at: string;
	sender: {
		id: string;
		full_name: string | null;
		username: string;
		role: 'student' | 'junior_mentor' | 'mentor' | 'admin';
	} | null;
};

const MENTOR_ROLES = new Set(['junior_mentor', 'mentor', 'admin']);

function senderLabel(sender: Message['sender']): string {
	if (!sender) return 'Unknown';
	return sender.full_name ?? sender.username;
}

export function MessageThread({
	studentId,
	currentUserId,
	initialMessages,
}: {
	studentId: string;
	currentUserId: string;
	initialMessages: Message[];
}) {
	const [messages, setMessages] = useState<Message[]>(initialMessages);
	const [draft, setDraft] = useState('');
	const [isPending, startTransition] = useTransition();

	async function refreshThread() {
		const fresh = await getWallMessages(studentId);
		setMessages(fresh as Message[]);
	}

	function handleSend() {
		if (!draft.trim()) return;
		const body = draft;
		setDraft('');
		startTransition(async () => {
			await postWallMessage(studentId, body);
			await refreshThread();
		});
	}

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-col gap-3'>
				{messages.length === 0 && (
					<p className='text-sm text-gray-500'>
						No messages yet. Say hello!
					</p>
				)}
				{messages.map((m) => {
					const isMine = m.sender_id === currentUserId;
					const isMentor = m.sender
						? MENTOR_ROLES.has(m.sender.role)
						: false;
					return (
						<div
							key={m.id}
							className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
							<div
								className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
									isMine
										? 'bg-[#1a6fca] text-white'
										: 'bg-gray-100 text-gray-900'
								}`}>
								{!isMine && isMentor && (
									<p className='mb-1 text-xs font-semibold opacity-70'>
										{senderLabel(m.sender)}
									</p>
								)}
								<p>{m.body}</p>
							</div>
							<span className='mt-1 text-xs text-gray-400'>
								{new Date(m.created_at).toLocaleString()}
							</span>
						</div>
					);
				})}
			</div>

			<div className='flex items-center gap-2 border-t border-gray-200 pt-3'>
				<textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder='Write a message...'
					rows={2}
					className='flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm'
				/>
				<button
					onClick={handleSend}
					disabled={isPending || !draft.trim()}
					className='rounded-md bg-[#1a6fca] px-4 py-2 text-sm font-medium text-white disabled:opacity-50'>
					Send
				</button>
			</div>
		</div>
	);
}
