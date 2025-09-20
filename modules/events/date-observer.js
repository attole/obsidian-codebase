class DateObserver {
	get #tokenizer() {
		return window.customJS.createTokenizerInstance();
	}

	get #dateExpression() {
		return window.customJS.createDateExpressionParserInstance();
	}

	edit(editor, event) {
		const cursor = editor.getCursor();
		let text = editor.getLine(cursor.line);

		/* cursor auto detect right position on some content change, but on drastic full line - not
		due to bag (i suppose??), when use settings to auto complete brackets, all auto data and cursor 
		are set out of them, even if before replacing content, it was inside brackets. 
		So to avoid this, use offset of cursor position */
		const cursorOffset = text.slice(cursor.ch, cursor.ch + 3).contains(']]')
			? 3
			: 0;

		// if event is using inserting space, do remove it
		if (event.code === 'Space') {
			text =
				text.slice(0, cursor.ch - 1 + cursorOffset) +
				text.slice(cursor.ch + cursorOffset);
		}

		const newText = this.#tokenizer
			.tokenize(text, this.#dateExpression.TOKENIZE_DATE_EXPRESSION)
			.map((token) =>
				this.#dateExpression.parse({
					input: token,
					returnBaseOnEmpty: true,
					isMuted: true,
				})
			)
			.replaceAndCollect();

		if (newText.length - text.length <= cursorOffset) return;

		editor.replaceRange(
			newText,
			{ line: cursor.line, ch: 0 },
			{
				line: cursor.line,
				ch: text.length,
			}
		);

		editor.setCursor({
			line: cursor.line,
			ch: newText.length - cursorOffset,
		});
	}

	patch(element, event) {
		const text = element.value;
		let newText = this.#tokenizer
			.tokenize(text, this.#dateExpression.TOKENIZE_DATE_EXPRESSION)
			.map((token) =>
				this.#dateExpression.parse({
					input: token,
					returnBaseOnEmpty: true,
					isMuted: true,
				})
			)
			.replaceAndCollect();

		// in this case there would be no links, so just remove last space, that is activation keyup
		if (newText !== text) {
			if (event.code === 'Space')
				newText = newText.slice(0, newText.length - 1);

			element.value = newText;
		}
	}
}
