class EmptyLineObserver {
	edit(editor, event) {
		window.customJS.EmptyLineManager.insertIntoEditor(
			editor,
			editor.getCursor().line
		);
	}
}
