class FullCalendarStartup {
	async run() {
		const sidebarCalendar = document.querySelector(
			'.workspace-split.mod-right-split .fc'
		);

		if (!sidebarCalendar) return;

		// small debounce to set state after last resize
		const resizeObserver = new ResizeObserver(() => {
			setTimeout(() => this.#fixListDay(), 50);
		});
		resizeObserver.observe(sidebarCalendar);

		const calendar = app.plugins.plugins['obsidian-full-calendar'];
		calendar.cache.on('update', () => {
			this.#fixListDay();
		});

		this.#fixListDay();
	}

	#fixListDay() {
		const leftElements =
			document.querySelectorAll('a.fc-list-day-text') ?? [];

		leftElements.forEach((el) => {
			el.removeAttribute('href');
			el.innerText = '';
		});

		const rightElements =
			document.querySelectorAll('a.fc-list-day-side-text') ?? [];

		for (const element of rightElements) {
			element.removeAttribute('href');
			element.style.float = 'unset';
			element.style.cursor = 'pointer';

			const date = this.#getDate(element);

			const note = window.customJS.NoteManager.getNotesByName(date)[0];
			if (!note) return;

			element.innerText = note.basename;
			element.addEventListener('click', async (e) => {
				e.preventDefault();

				let leaf = app.workspace.getMostRecentLeaf();
				if (!leaf) return;

				if (leaf.getViewState().pinned) {
					leaf = app.workspace.getLeaf('tab');
				}

				leaf.openFile(note);
			});
		}
	}

	// full calendar plugin append its list day date after mine
	// so if element text starts with right date - use it, otherwise parse
	#getDate(element) {
		const match = element.innerText.match(/(\d{4}-\d{2}-\d{2})/);
		if (match) return match[0];

		return window.customJS.DateExpressionParser.parseToken({
			input: new Date(element.innerText),
		});
	}
}
