module.exports = async (params) => {
	const { quickAddApi } = params;

	const handler = window.customJS.DailyNoteCommands;
	const input = await quickAddApi.inputPrompt();
	const isBulkOpen = input.trim().startsWith('b');
	const isCreate = input.trim().startsWith('c');

	if (isBulkOpen)
		return await handler.bulkOpenDailyNotes(input.replace('b', '').trim());
	if (isCreate)
		return await handler.createDailyNote({
			input: input.replace('c', '').trim(),
		});
	return await handler.openDailyNote({
		input: input.trim(),
	});
};
