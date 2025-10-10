/*
 * empty line manager provide atomic operations on empty line token
 * should be used INSIDE OR AFTER lines, and could have minor errors when inserted at the start,
 * so each closeby sections lines would be parsed by one that are earlier / more important
 *
 * by default, Markdown concatinate multiple empty line to one, so as a solution
 * special token (empty html span) with actual empty line is used
 */

class EmptyLineManager {
	EMPTY_LINE_TOKEN = '<span data-token="emptyLine">ㅤ</span>';

	/*
	 * metadata is not reliable for fast input updates, so parse lines manually
	 * treat `lineIndex` as the new line for token (with possible content on split), not old one
	 * it is because enter insertion cannot be intercepted and prevented in this event flow
	 */
	async insertIntoEditor(editor, lineIndex) {
		const helper = window.customJS.createEmptyLineHelperInstance();

		const prevLine = this.#getLineData(editor, lineIndex - 2);
		const splitLine = this.#getLineData(editor, lineIndex - 1);
		const newLine = this.#getLineData(editor, lineIndex);
		const nextLine = this.#getLineData(editor, lineIndex + 1);

		// order dependant
		const handlers = [
			helper.tryHandleHeaders.bind(helper),
			helper.tryHandleLinks.bind(helper),
			helper.tryHandleLists.bind(helper),
			helper.tryHandleQuotes.bind(helper),
			helper.tryHandleTokens.bind(helper),
			helper.tryHandleParagraphs.bind(helper),
			backup,
		];

		handlers.find((fn) =>
			fn(
				editor,
				prevLine,
				splitLine,
				newLine,
				nextLine,
				this.EMPTY_LINE_TOKEN
			)
		);

		// default case - insert 'token\n'
		function backup(editor, prevLine, splitLine, newLine, nextLine, token) {
			editor.setLine(splitLine.position.line, token + '\n');

			editor.setCursor({
				line: newLine.position.line + 1,
				ch: 0,
			});
		}
	}

	findLines(content) {
		const lines = content.split('\n');
		const result = [];

		lines.forEach((line, i) => {
			if (line.includes(this.EMPTY_LINE_TOKEN)) result.push(i);
		});
		return result;
	}

	findPositions(content) {
		const positions = [];
		if (lastIndex === -1) return positions;

		const tokenLength = this.EMPTY_LINE_TOKEN.length;
		while (lastIndex !== -1) {
			const nextIndex = lastIndex + tokenLength;
			positions.push({ start: lastIndex, end: nextIndex });
			lastIndex = content.indexOf(this.EMPTY_LINE_TOKEN, nextIndex);
		}
		return positions;
	}

	#getLineData(editor, lineIndex) {
		if (lineIndex < 0 || lineIndex >= editor.lineCount()) return null;

		const content = editor.getLine(lineIndex);
		const position = { line: lineIndex, ch: 0 };

		return { content, position };
	}
}
