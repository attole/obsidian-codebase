class EmptyLine {
	async invoke() {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		if (!view) return;

		const editor = view.editor;
		if (!editor) return;

		const cursor = editor.getCursor();
		const emptyLine = '\nㅤ';

		editor.replaceRange(emptyLine, cursor);
		editor.setCursor({
			line: cursor.line,
			ch: cursor.ch + emptyLine.length,
		});
	}
}
