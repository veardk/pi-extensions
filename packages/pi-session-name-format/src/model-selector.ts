/**
 * TUI selector with a live search input + paginated, filtered list.
 * Mirrors the look of pi's `/model` selector without pulling in the
 * runtime/refresh machinery from `ModelSelectorComponent`.
 *
 * - Search is fuzzy across `value`, `label`, and `description`, so a
 *   partial `provider` or `model` substring matches anywhere in the
 *   haystack. Whitespace and `/` separate tokens; all must match.
 * - Up/Down moves by one row, Left/Right jumps one page (maxVisible).
 */

import {
	Container,
	Input,
	SelectList,
	Spacer,
	Text,
	fuzzyFilter,
	matchesKey,
} from "@earendil-works/pi-tui";
import type { KeybindingsManager, SelectItem } from "@earendil-works/pi-tui";
import { getSelectListTheme, keyHint, rawKeyHint } from "@earendil-works/pi-coding-agent";

export interface ModelItem {
	value: string;
	label: string;
	description?: string;
}

/** SelectList with fuzzy matching across value + label + description. */
class FuzzySelectList extends SelectList {
	setFilter(filter: string): void {
		const items = (this as unknown as { items: SelectItem[] }).items;
		const next = !filter.trim()
			? items
			: fuzzyFilter(items, filter, (item) =>
					[item.value, item.label, item.description ?? ""].join(" "),
				);
		(this as unknown as { filteredItems: SelectItem[] }).filteredItems = next;
		(this as unknown as { selectedIndex: number }).selectedIndex = 0;
	}
}

export class ModelSearchSelector extends Container {
	private readonly input: Input;
	private readonly list: SelectList;
	private readonly listMaxVisible: number;
	private readonly allItems: ModelItem[];
	private readonly keybindings: KeybindingsManager;
	private readonly done: (value: string | null) => void;
	private closed = false;

	constructor(
		title: string,
		items: ModelItem[],
		keybindings: KeybindingsManager,
		done: (value: string | null) => void,
	) {
		super();
		this.keybindings = keybindings;
		this.done = done;
		this.allItems = items;
		this.listMaxVisible = 12;

		this.addChild(new Text(title, 1, 0));
		this.addChild(new Spacer(1));
		this.input = new Input({
			placeholder: "Type to filter (provider/model id)",
		});
		this.addChild(this.input);
		this.addChild(new Spacer(1));
		const selectItems: SelectItem[] = items.map((item) => ({
			value: item.value,
			label: item.label,
			description: item.description,
		}));
		this.list = new FuzzySelectList(
			selectItems,
			this.listMaxVisible,
			getSelectListTheme(),
		);
		this.list.onSelect = (item) => this.finish(item.value);
		this.list.onCancel = () => this.finish(null);
		this.addChild(this.list);
		this.addChild(new Spacer(1));
		this.addChild(
			new Text(
				`${rawKeyHint("↑↓", "navigate")}  ${keyHint("tui.select.confirm", "select")}  ${keyHint("tui.select.cancel", "cancel")}`,
				1,
				0,
			),
		);
	}

	handleInput(keyData: string): void {
		if (this.closed) return;
		if (
			this.keybindings.matches(keyData, "tui.select.up") ||
			this.keybindings.matches(keyData, "tui.select.down")
		) {
			this.list.handleInput(keyData);
			return;
		}
		const isPageUp =
			this.keybindings.matches(keyData, "tui.select.pageUp") ||
			matchesKey(keyData, "left");
		const isPageDown =
			this.keybindings.matches(keyData, "tui.select.pageDown") ||
			matchesKey(keyData, "right");
		if (isPageUp || isPageDown) {
			this.pageJump(isPageUp ? -this.listMaxVisible : this.listMaxVisible);
			return;
		}
		if (this.keybindings.matches(keyData, "tui.select.confirm")) {
			const item = this.list.getSelectedItem();
			if (item) this.finish(item.value);
			return;
		}
		if (this.keybindings.matches(keyData, "tui.select.cancel")) {
			this.finish(null);
			return;
		}
		this.input.handleInput(keyData);
		this.list.setFilter(this.input.getValue());
	}

	private pageJump(delta: number): void {
		const current = this.list.getSelectedItem();
		const visible = (this.list as unknown as { filteredItems: SelectItem[] })
			.filteredItems;
		const idx = current ? visible.indexOf(current) : 0;
		const next = idx < 0 ? 0 : idx + delta;
		this.list.setSelectedIndex(next);
	}

	private finish(value: string | null): void {
		if (this.closed) return;
		this.closed = true;
		this.done(value);
	}
}
