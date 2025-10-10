class LinkInline {
	async invoke() {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		if (!view) return;

		const editor = view.editor;
		if (!editor) return;

		window.customJS.LinkObserver.edit(editor);

	}
}
