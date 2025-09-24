class DailyNoteContent {
	get #dailyNoteHelper() {
		return window.customJS.createDailyNoteHelperInstance();
	}

	get #propertyManager() {
		return window.customJS.createPropertyManagerInstance();
	}

	get #sectionManager() {
		return window.customJS.createExtendedSectionManagerInstance();
	}

	// create daily note by provided date from scratch
	async createNote(date) {
		const { templatePath, activePath } =
			this.#dailyNoteHelper.getStructurePathes();

		const note = await window.customJS.NoteManager.createNoteByTemplate({
			folderPath: activePath,
			name: date,
			templatePath,
		});

		if (!note) return;

		this.rollover(note, true);
		this.updateProps(note);
		return note;
	}

	// update provided daily note properties - links to 'prev' and 'next' daily notes
	async updateProps(note) {
		const types = ['prev', 'next'];

		for (const type of types) {
			const targetNote = this.#dailyNoteHelper.getClosestDailyNote(
				note.basename,
				type
			);

			if (!targetNote) continue;

			const currentLink = await this.#propertyManager.read(note, type);
			const link = `[[${targetNote.path}|${targetNote.basename}]]`;

			if (currentLink !== link) {
				await this.#propertyManager.set(
					note,
					{ [type]: link },
					'force'
				);
			}
		}
	}

	/*
	 * whether provided daily note has newest rollover. rollover property could be:
	 * - old date, in case note was created by scripts, but long time ago
	 * - date expression template, in case note was not property created by scripts,
	 *   but rather by some external plugins that used daily notes plugin
	 */
	async isRollovered(note) {
		const betterRolloverDate = this.#dailyNoteHelper.getClosestDailyNote(
			note.basename,
			'prev'
		)?.basename;

		const rollover = await this.#propertyManager.read(note, 'rollovered');
		return (
			!isNaN(new Date(rollover)) &&
			new Date(rollover) >= new Date(betterRolloverDate)
		);
	}

	// rollover content from the previous daily note into the current one
	async rollover(note, isNewlyCreated = false) {
		const previousNote = this.#dailyNoteHelper.getClosestDailyNote(
			note.basename,
			'prev'
		);

		// if note is not newly created - try to fix properites, in case note was not property
		// created by scripts, but rather by some external plugins that use daily notes plugin
		if (!isNewlyCreated) {
			await window.customJS.PropertyManager.fix(note);
		}

		await this.#staticRollover(previousNote, note, isNewlyCreated);
		await this.#dynamicRollover(previousNote, note);
	}

	// static rollover - preserve callouts data
	// TODO possibly more with right markers in future??
	async #staticRollover(previousNote, currentNote, useTemplateNote) {
		const prevSm = await this.#sectionManager.load(previousNote);
		const prevCallouts = prevSm.getSectionsContentObjects('callout');
		if (prevCallouts.callout.length === 0) return;

		// if note is newly created - use template note for callouts header, not newly
		// created one, because new one is not yet cached to have sections available
		const { templatePath } = this.#dailyNoteHelper.getStructurePathes();
		const templateNote =
			window.customJS.NoteManager.getNoteByPath(templatePath);
		const structureNote = useTemplateNote ? templateNote : currentNote;

		// there is still a chance that note is not cached yet (in case it was created
		// recently by external plugin that use daily notes plugins)
		// so backup to template one on error
		let currentSm =
			(await this.#sectionManager.load(structureNote)) ||
			(await this.#sectionManager.load(templateNote));
		const currentCallouts = currentSm.getSectionsContentObjects('callout');
		const contentMap = currentCallouts.callout.map((curr) => {
			const index = prevCallouts.callout.findIndex((prev) =>
				prev.content.trim().includes(curr.content.trim())
			);

			if (index === -1) return null;

			let newContent = prevCallouts.callout[index].content.trim();
			prevCallouts.callout.splice(index, 1);
			return {
				current: curr.content.trim(),
				new: newContent,
			};
		});

		let noteContent = await app.vault.read(currentNote);
		contentMap
			.filter((c) => !!c)
			.forEach((content) => {
				noteContent = noteContent.replace(content.current, content.new);
			});

		await app.vault.modify(currentNote, noteContent);
	}

	/*
	 * dynamic rollover - preserves dynamic content sections:
	 * - unchecked checkboxes
	 * - unfinised inline and preview tasks??
	 * - other pipeline staff??
	 */
	async #dynamicRollover(previousNote, currentNote) {
		// TODO unchecked checkboxes
		console.log('dynamic rollover', previousNote, currentNote);
		return currentNote;
	}
}
