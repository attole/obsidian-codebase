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
			await this.#syncDailyNotes(date, activePath, archivePath);
		}

		// if note should be rolloverd - it was already created (not today), so try to sync it and do rollover
		if (!(await this.#dailyNoteContent.isRollovered(note))) {
			await this.#updateAndMoveDailyNotes(note, archivePath, activePath);
			await this.#dailyNoteContent.rollover(note);
			await this.#syncDailyNotes(date, activePath, archivePath);
		}

		// always try to update props
		await this.#dailyNoteContent.updateProps(note);
		return await this.#noteManager.openNote(note);
	}

	// move closest notes to active folder, all others - archive, update all props
	async #syncDailyNotes(date, activePath, archivePath) {
		const prevNote = this.#dailyNoteHelper.getClosestDailyNote(
			date,
			'prev'
		);
		const nextNote = this.#dailyNoteHelper.getClosestDailyNote(
			date,
			'next'
		);

		await this.#updateAndMoveDailyNotes(
			[prevNote, nextNote],
			archivePath,
			activePath
		);

		const extraNotes = (
			await this.#dailyNoteHelper.getDailyNotesByFolder(activePath)
		).filter(
			(note) =>
				date !== note.basename &&
				(!prevNote || prevNote.basename !== note.basename) &&
				(!nextNote || nextNote.basename !== note.basename)
		);

		this.#updateAndMoveDailyNotes(extraNotes, activePath, archivePath);
	}

	async #updateAndMoveDailyNotes(notes, fromFolder, toFolder) {
		for (const note of notes) {
			if (!note) continue;

			if (note.path.contains(fromFolder))
				this.#noteManager.moveNote(note.path, toFolder, {
					mode: 'force',
				});

			await this.#dailyNoteContent.updateProps(note);
		}
	}
}
