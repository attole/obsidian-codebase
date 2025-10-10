class LinkObserver {
	async edit(editor, _) {
		const cursor = editor.getCursor();
		const text = editor.getLine(cursor.line);

		const newText = await window.customJS.LinkParser.parseText({
			input: text,
		});
		if (newText === text) return;

		editor.setLine(cursor.line, newText);
	}
}
