class DailyNoteCommands {
	get #dateExpression() {
		return window.customJS.createDateExpressionParserInstance();
	}

	get #noteManager() {
		return window.customJS.createNoteManagerInstance();
	}

	// used as is on quickadd command to open daily notes
	async openDailyNote({ input, isMuted = false, split = true }) {
		const date = this.#dateExpression.parse({ input: input.trim() });

		if (!(await this.#noteManager.doNoteExistByName(date))) {
			if (isMuted) return;
			const error = `openDailyNote: no daily note found for: ${date}`;
			console.error(error);
			new Notice(error);
			return;
		}

		return await this.#noteManager.openNotesByName({
			name: date,
			split,
		});
	}

	// used as is on quickadd command to bulk open daily notes
	async bulkOpenDailyNotes(input) {
		const match = input.match(/f:(.*)\s+t:(.*)/);
		if (!match) return;

		const [, fromStr, toStr] = match;
		let from = new Date(this.#dateExpression.parse({ input: fromStr }));
		let to = new Date(this.#dateExpression.parse({ input: toStr }));

		let isFirst = true;
		for (; from <= to; from.setDate(from.getDate() + 1)) {
			const date = this.#dateExpression.parse({ input: from });
			await this.openDailyNote({
				input: date,
				isMuted: true,
				split: isFirst,
			});
			isFirst = false;
		}

		return true;
	}

	// used as is on quickadd command to create daily note
	async createDailyNote({ input, split = true }) {
		const date = this.#dateExpression.parse({ input: input.trim() });
		await window.customJS.DailyNoteContent.createNote(date);
		return await this.openDailyNote({ input, split: split });
	}
}
