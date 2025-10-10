class DateInline {
	async invoke() {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		if (!view) return;

		const editor = view.editor;
		if (!editor) return;

		window.customJS.DateObserver.edit(editor);

		const dateExpression = window.customJS.DateExpressionParser;
		const clipboardManager = window.customJS.ClipboardManager;
		await clipboardManager.tryInsertFromClipboard(editor, dateExpression);
	}
}
