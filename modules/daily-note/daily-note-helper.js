class DailyNoteHelper {
	// get pathes of core daily notes plugin
	getStructurePathes() {
		const options =
			app.internalPlugins.plugins['daily-notes'].instance.options;

		return {
			templatePath: options.template,
			activePath: options.folder,
			archivePath: options.folder + '/daily',
		};
	}

	// whether provided note is daily one. tags property check not done due to long time execution on mobile
	isDailyNote(note) {
		return /^\d{4}-\d{2}-\d{2}$/.test(note.basename);
	}

	async getCurrentDailyNote() {
		// TODO get this date from db, and if none - parse to get today
		const date = window.customJS.DateExpressionParser.parseToken();
		return window.customJS.NoteManager.getNotesByName(date)[0];
	}

	// get closest daily note by provided date and direction from set folder
	getDailyNotesByFolder(path) {
		const notes = window.customJS.FolderManager.getDirectNotes(path);
		return notes?.filter((note) => this.isDailyNote(note));
	}

	// get closest daily note by provided date and direction from whole vault
	getClosestDailyNote(date, direction) {
		const { _, activePath, archivePath } = this.getStructurePathes();

		return this.#getClosestDailyNoteByFolders(date, direction, [
			activePath,
			archivePath,
		]);
	}

	// get closest daily note by provided date and direction from folder pathes
	#getClosestDailyNoteByFolders(date, direction, pathes) {
		const dailyNotes = pathes
			.map((path) => this.getDailyNotesByFolder(path))
			.flat();
		if (dailyNotes.length === 0) return;

		const prev = !direction || direction === 'prev';
		date = new Date(date);

		let closest = null;
		for (const note of dailyNotes) {
			const noteDate = new Date(note.basename);

			if (prev ? noteDate < date : noteDate > date) {
				if (
					!closest ||
					(prev ? noteDate > closest.date : noteDate < closest.date)
				) {
					closest = { note, date: noteDate };
				}
			}
		}
		return closest?.note;
	}
}
