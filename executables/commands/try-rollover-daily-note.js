module.exports = async () => {
	// it is much easier to call this startup run, cause it perform rollover,
	// but also sync extra notes and updates properties
	await window.customJS.DailyNoteStartup.run();
	window.customJS.TabManager.closeActiveTab();
};
