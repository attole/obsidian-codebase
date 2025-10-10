class EmptyLine {
	async invoke() {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		if (!view) return;

		const editor = view.editor;
		if (!editor) return;

		// create new empty line to insert token into
		const editorPosition = editor.getCursor();
		editor.replaceRange('\n', editorPosition);
		editorPosition.line += 1;

		window.customJS.EmptyLineManager.insertIntoEditor(
			editor,
			editorPosition.line
		);
	}
}
