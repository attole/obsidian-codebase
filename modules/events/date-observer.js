class DateObserver {
	get #dateExpression() {
		return window.customJS.createDateExpressionParserInstance();
	}

	/*
	 * if event is triggered by 'space' keyword and:
	 * - if inside a link - move the space outside, and leave cursor inside straight after date
	 * - if outside a link - append a space after the cursor as usual
	 */
	edit(editor, event = null) {
		const cursor = editor.getCursor();
		const text = editor.getLine(cursor.line);

		let newText = this.#dateExpression.parseText({
			input: text,
		});
		if (newText === text) return;

		const isInLink = text.slice(cursor.ch, cursor.ch + 2).includes(']]');
		const isSpaceEvent = event?.code === 'Space';

		let offset = 0;
		if (isInLink) {
			offset = -2;
		} else if (isSpaceEvent) {
			newText += ' ';
		}

		editor.setLine(cursor.line, newText);
		editor.setCursor({
			line: cursor.line,
			ch: newText.length + offset,
		});
	}

	patch(element, _) {
		const text = element.value;
		if (!text) return;

		let newText = this.#dateExpression.parseText({
			input: text,
		});
		if (newText !== text) element.value = newText;
	}
}
