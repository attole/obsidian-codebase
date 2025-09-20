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

	async getCurrentDailyNote() {
		// TODO get this date from db, and if none - parse to get today
		const date = window.customJS.DateExpressionParser.parse();
		return window.customJS.NoteManager.getNotesByName(date)[0];
	}

	// get closest daily note by provided date and direction from whole vault
	getClosestDailyNote(date, direction) {
		const { _, activePath, archivePath } = this.getStructurePathes();

		return this.getClosestDailyNoteByFolders(date, direction, [
			activePath,
			archivePath,
		]);
	}

	// get closest daily note by provided date and direction from set pathes
	getClosestDailyNoteByFolders(date, direction, pathes) {
		const dailyNotes = pathes
			.map((path) => this.getDailyNotesByFolder(path))
			.flat();

		if (dailyNotes.length === 0) return;
		const past = !direction || direction === 'prev';

		date = new Date(date);
		return dailyNotes
			.map((note) => ({
				note: note,
				date: new Date(note.basename),
			}))
			.filter((x) => (past ? x.date < new Date(date) : x.date > date))
			.sort((a, b) => (past ? b.date - a.date : a.date - b.date))[0]
			?.note;
	}

	// get closest daily note by provided date and direction from set folder
	getDailyNotesByFolder(path) {
		return window.customJS.FolderManager.getDirectNotes(path).filter(
			(note) => /^\d{4}-\d{2}-\d{2}$/.test(note.basename)
		);
	}
}
