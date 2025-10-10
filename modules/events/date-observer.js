class DateObserver {
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
		const text = editor.getLine(cursor.line);

		let newText = this.#dateExpression.parseText({
			input: text,
		});
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
		if (!text) return;

		let newText = this.#dateExpression.parseText({
			input: text,
		});
		if (newText !== text) element.value = newText;
	}
}
