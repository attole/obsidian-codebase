module.exports = async () => {
	const note = app.workspace.getActiveFile();
	if (!note || !window.customJS.DailyNoteHelper.isDailyNote(note)) {
		const error = 'Active note is not daily note';
		console.error(error);
		new Notice(error);
		return;
	}

	const dnc = window.customJS.DailyNoteContent;
	if (await dnc.isRollovered(note)) {
		const error = 'Note is already rollovered';
		console.error(error);
		new Notice(error);
		return;
	}

	await dnc.rollover(note, false);
};
