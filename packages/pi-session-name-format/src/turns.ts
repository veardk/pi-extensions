/**
 * Walk a session branch and collect naming turns.
 *
 * Each user prompt opens a turn; the turn keeps only the LAST assistant
 * text message of the consecutive run that follows. Slash-command
 * exchanges (prompt + any reply) are dropped together. Tool-call blocks
 * and tool-result entries carry no prose and never enter a turn.
 */

import type { NamingTurn } from "./name-format.ts";

export function collectTurns(entries: unknown[]): NamingTurn[] {
	const turns: NamingTurn[] = [];
	let inSlash = false;
	for (const entry of entries as any[]) {
		if (entry?.type !== "message") continue;
		const msg = entry.message;
		if (msg?.role === "user") {
			const text = extractText(msg?.content).trim();
			if (!text) continue;
			if (text.startsWith("/")) {
				inSlash = true;
				continue;
			}
			inSlash = false;
			turns.push({ user: text });
		} else if (msg?.role === "assistant") {
			const text = extractText(msg?.content).trim();
			if (!text || inSlash) continue;
			if (turns.length === 0) turns.push({ user: "" });
			turns[turns.length - 1].assistant = text;
		}
	}
	return turns;
}

function extractText(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.filter((b: any) => b?.type === "text" && typeof b.text === "string")
			.map((b: any) => b.text)
			.join("");
	}
	return "";
}
