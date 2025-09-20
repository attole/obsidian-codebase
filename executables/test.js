class test {
	async invoke() {
		console.clear();

		const note = window.customJS.NoteManager.getNoteByPath(
			'in my mind/calendar/test'
		);
	}
}
