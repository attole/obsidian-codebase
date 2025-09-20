class LinkObserver {
	edit(editor, _) {
		const cursor = editor.getCursor();
		const text = editor.getLine(cursor.line);

		const newText = window.customJS.Tokenizer.tokenize(
			text,
			window.customJS.LinkParser.TOKENIZE_LINKS
		)
			.map((token) => {
				return window.customJS.LinkParser.parse({
					input: token,
					returnEmptyMark: false,
					isMuted: true,
				});
			})
			.replaceAndCollect();

		if (newText === text) return;

		editor.replaceRange(
			newText,
			{ line: cursor.line, ch: 0 },
			{
				line: cursor.line,
				ch: text.length,
			}
		);
	}
}
