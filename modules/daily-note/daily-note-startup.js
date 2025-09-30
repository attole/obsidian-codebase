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
		const date = window.customJS.DateExpressionParser.parse();

		let note = this.#noteManager.getNotesByName(date)[0];
		if (!note) {
			note = await this.#dailyNoteContent.createNote(date);
			await this.#syncExtraDailyNotes(date, activePath, archivePath);
		}

		// if note should be rolloverd - it was already created (not today), so do rollover and sync extra note
		if (!(await this.#dailyNoteContent.isRollovered(note))) {
			if (note.path.contains(archivePath))
				this.#noteManager.moveNote(note.path, activePath);

			await this.#syncExtraDailyNotes(date, activePath, archivePath);
			await this.#dailyNoteContent.rollover(note);
		}

		// always try to update props
		await this.#dailyNoteContent.updateProps(note);
		return await this.#noteManager.openNote(note);
	}

	// sync extra daily notes - update their props and remove to archive folder
	async #syncExtraDailyNotes(date, activePath, archivePath) {
		const notes = await this.#dailyNoteHelper.getDailyNotesByFolder(
			activePath
		);

		const prevNote = this.#dailyNoteHelper.getClosestDailyNote(
			date,
			'prev'
		);
		const nextNote = this.#dailyNoteHelper.getClosestDailyNote(
			date,
			'next'
		);

		const extraNotes = notes.filter(
			(note) =>
				note.basename !== date &&
				(!prevNote || prevNote.basename !== note.basename) &&
				(!nextNote || nextNote.basename !== note.basename)
		);

		for (const note of extraNotes) {
			await this.#dailyNoteContent.updateProps(note);

			// there could a case with some unrelated duplication, and this note is newer
			// so move it forcefully (replace old one)
			await this.#noteManager.moveNote(note.path, archivePath, {
				mode: 'force',
			});
		}
	}
}
