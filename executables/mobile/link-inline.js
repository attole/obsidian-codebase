class LinkInline {
	async invoke() {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		if (!view) return;

		const editor = view.editor;
		if (!editor) return;

		let text = editor.getLine(editor.getCursor().line);
		if (text === '') return text;

		const linkParser = window.customJS.LinkParser;
		const newText = window.customJS
			.createTokenizerInstance()
			.tokenize(text, linkParser.TOKENIZE_LINKS)
			.map((token) =>
				linkParser.parse({
					input: token,
					returnEmptyMark: false,
					isMuted: true,
				})
			)
			.replaceAndCollect();

		console.log('AAA', text, newText);

		if (newText === text) return;

		editor.replaceRange(
			newText,
			{ line: editor.getCursor().line, ch: 0 },
			{ line: editor.getCursor().line, ch: text.length }
		);
	}
}
