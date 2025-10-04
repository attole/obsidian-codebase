class DateObserver {
	get #tokenizer() {
		return window.customJS.createTokenizerInstance();
	}

	get #dateExpression() {
		return window.customJS.createDateExpressionParserInstance();
	}

	/*
	 * rules if event triggered by 'space' keyword:
	 * - if inside a link - move the space outside, and leave cursor inside straight after date
	 * - if outside a link - append a space after the cursor as usual
	 */
	edit(editor, event) {
		const cursor = editor.getCursor();
		let text = editor.getLine(cursor.line);

		const isSpaceEvent = event.code === 'Space';
		const isInLink = text.slice(cursor.ch, cursor.ch + 3).includes(']]');
		if (isInLink && isSpaceEvent)
			text = text.slice(0, cursor.ch - 1) + text.slice(cursor.ch);

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

		if (newText === text) return;

		let offset = 0;
		if (isInLink && isSpaceEvent) {
			newText += ' ';
			offset = 1;
		}

		editor.replaceRange(
			newText,
			{ line: cursor.line, ch: 0 },
			{
				line: cursor.line,
				ch: text.length + offset,
			}
		);

		if (isInLink) {
			offset = -2;
			if (isSpaceEvent) offset -= 1;
		}

		editor.setCursor({
			line: cursor.line,
			ch: newText.length + offset,
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

		if (newText === text) return;

		// in this case there is no links, so if event is triggered by 'space' keyword
		// just remove last space, that is activation keyup
		if (event.code === 'Space')
			newText = newText.slice(0, newText.length - 1);

		element.value = newText;
	}
}
