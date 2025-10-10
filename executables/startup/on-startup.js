class OnStartup {
	get #startupHelper() {
		return window.customJS.createStartupHelperInstance();
	}

	async invoke() {
		app.workspace.onLayoutReady(async () => {
			const tabManager = window.customJS.TabManager;
			tabManager.closeAllTabs('markdown');

			const noteLeaf = await window.customJS.DailyNoteStartup.run();
			tabManager.pinTab(noteLeaf);
		});

		// load extended cache
		window.customJS.ExtendedCacheStartup.load();

		if (!app.isMobile) await this.#desktopOnly();
	}

	async #desktopOnly() {
		// setup observables on different events on active editor
		const editorObservables = this.#startupHelper.setupEditorObservables();
		app.workspace.on('active-leaf-change', (_) => {
			const view = app.workspace.getActiveViewOfType(
				obsidian.MarkdownView
			);

			if (!view.editor) return;

			editorObservables.forEach((observable) => {
				observable.on(view.editor);
			});
		});

		// setup observables on different events on dom elemets
		this.#startupHelper.setupDomObservables();

		// fix bad styling and broken links on calendar
		window.customJS.FullCalendarStartup.run();

		// add notes dock on sidebar
		await window.customJS.DockBuilder.run();
		// hide additional tabs headers and icons on sidebars
		window.customJS.TabsHeaderHider.run();
	}
}
