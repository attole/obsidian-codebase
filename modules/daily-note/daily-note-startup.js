class DailyNoteStartup {
	get #noteManager() {
		return window.customJS.createNoteManagerInstance();
	}

	get #dailyNoteHelper() {
		return window.customJS.createDailyNoteHelperInstance();
	}

	get #dailyNoteContent() {
		return window.customJS.createDailyNoteContentInstance();
	}

	async run() {
		const { _, activePath, archivePath } =
			this.#dailyNoteHelper.getStructurePathes();

		// TODO get this date from db, and if none - parse to get today
		const date = window.customJS.DateExpressionParser.parseToken();

		let note = this.#noteManager.getNotesByName(date)[0];
		if (!note) {
			note = await this.#dailyNoteContent.createNote(date);
		}

		// if note should be rolloverd - it was already created (not today), so try to sync it and do rollover
		if (!(await this.#dailyNoteContent.isRollovered(note))) {
			await this.#dailyNoteContent.rollover(note);
		}

		await this.#syncDailyNotes(date, note, activePath, archivePath);
		return await this.#noteManager.openNote(note);
	}

	async #syncDailyNotes(date, currentNote, activePath, archivePath) {
		await this.#updateAndMoveDailyNote(
			currentNote,
			archivePath,
			activePath
		);

		const prevNote = this.#dailyNoteHelper.getClosestDailyNote(
			date,
			'prev'
		);
		await this.#updateAndMoveDailyNote(prevNote, archivePath, activePath);

		const nextNote = this.#dailyNoteHelper.getClosestDailyNote(
			date,
			'next'
		);
		await this.#updateAndMoveDailyNote(nextNote, archivePath, activePath);

		const extraNotes = (
			await this.#dailyNoteHelper.getDailyNotesByFolder(activePath)
		).filter(
			(note) =>
				date !== note.basename &&
				(!prevNote || prevNote.basename !== note.basename) &&
				(!nextNote || nextNote.basename !== note.basename)
		);

		for (const note of extraNotes) {
			await this.#updateAndMoveDailyNote(note, activePath, archivePath);
		}
	}

	async #updateAndMoveDailyNote(note, fromFolder, toFolder) {
		if (!note) return;

		if (note.path.contains(fromFolder))
			await this.#noteManager.moveNote(note.path, toFolder, {
				mode: 'force',
			});

		await this.#dailyNoteContent.updateProps(note);
	}
}
