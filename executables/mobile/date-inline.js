class DateInline {
	async invoke() {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		if (!view) return;

		const editor = view.editor;
		if (!editor) return;

		const dateExpression = window.customJS.DateExpressionParser;
		const tokenizer = window.customJS.createTokenizerInstance();

		this.#tryReplaceSelection(editor, tokenizer, dateExpression) ||
			this.#tryReplaceInline(editor, tokenizer, dateExpression) ||
			(await this.#tryInsertFromClipboard(
				editor,
				tokenizer,
				dateExpression
			));
	}

	#tryReplaceSelection(editor, tokenizer, parser) {
		const text = editor.getSelection();
		if (!text || text.length === 0) return false;

		const newText = this.#parseInternally(text, tokenizer, parser);
		if (newText === text) return false;

		editor.replaceSelection(newText);
		return true;
	}

	#tryReplaceInline(editor, tokenizer, parser) {
		const text = editor.getLine(editor.getCursor().line);

		const newText = this.#parseInternally(text, tokenizer, parser);
		if (newText === text) return false;

		editor.replaceRange(
			newText,
			{ line: editor.getCursor().line, ch: 0 },
			{ line: editor.getCursor().line, ch: text.length }
		);

		return true;
	}

	async #tryInsertFromClipboard(editor, tokenizer, parser) {
		const text = await navigator.clipboard.readText();

		console.log('A', text);

		const newText = this.#parseInternally(text, tokenizer, parser);
		if (newText === text) return false;

		editor.replaceSelection(newText);
		await navigator.clipboard.writeText('');
		return true;
	}

	#parseInternally(text, tokenizer, parser) {
		if (text === '') return text;
		return tokenizer
			.tokenize(text, parser.TOKENIZE_DATE_EXPRESSION)
			.map((token) =>
				parser.parse({
					input: token,
					returnBaseOnEmpty: true,
					isMuted: true,
				})
			)
			.replaceAndCollect();
	}
}
