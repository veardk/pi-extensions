/**
 * TUI input dialog with a pre-filled initial value.
 *
 * `ctx.ui.input(title, placeholder)` ignores the second arg, so to pre-fill
 * we render our own Container with an `Input` initialized via `setValue`.
 */

import { Container, Input, Spacer, Text } from "@earendil-works/pi-tui";
import type { KeybindingsManager } from "@earendil-works/pi-tui";

export class PrefilledInput extends Container {
	private readonly input: Input;
	private readonly keybindings: KeybindingsManager;
	private readonly done: (value: string | null) => void;
	private closed = false;

	constructor(
		title: string,
		initialValue: string,
		keybindings: KeybindingsManager,
		done: (value: string | null) => void,
	) {
		super();
		this.keybindings = keybindings;
		this.done = done;
		this.addChild(new Text(title, 1, 0));
		this.addChild(new Spacer(1));
		this.input = new Input();
		if (initialValue) this.input.setValue(initialValue);
		this.addChild(this.input);
	}

	handleInput(keyData: string): void {
		if (this.closed) return;
		if (this.keybindings.matches(keyData, "tui.select.confirm")) {
			this.finish(this.input.getValue());
			return;
		}
		if (this.keybindings.matches(keyData, "tui.select.cancel")) {
			this.finish(null);
			return;
		}
		this.input.handleInput(keyData);
	}

	private finish(value: string | null): void {
		if (this.closed) return;
		this.closed = true;
		this.done(value);
	}
}
