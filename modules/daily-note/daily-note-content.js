class DailyNoteContent {
	get #noteManager() {
		return window.customJS.createNoteManagerInstance();
	}
	get #dailyNoteHelper() {
		return window.customJS.createDailyNoteHelperInstance();
	}

	get #propertyManager() {
		return window.customJS.createPropertyManagerInstance();
	}

	get #extendedCacheManager() {
		return window.customJS.createExtendedCacheManagerInstance();
	}

	get #extendedSectionHelper() {
		return window.customJS.createExtendedSectionHelperInstance();
	}

	// create daily note by provided date
	async createNote(date) {
		const { templatePath, activePath } =
			this.#dailyNoteHelper.getStructurePathes();

		const note = await this.#noteManager.createNoteByTemplate({
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

			// use name based link, cause daily notes have are unique date names
			const currentLink = await this.#propertyManager.read(note, type);
			const newLink = `[[${targetNote.basename}]]`;

			if (currentLink !== newLink) {
				await this.#propertyManager.set(
					note,
					{ [type]: newLink },
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
		const rolloverString = await this.#propertyManager.read(
			note,
			'rollovered'
		);
		const oldRolloverDate = new Date(rolloverString);

		const betterRolloverDate = this.#dailyNoteHelper.getClosestDailyNote(
			note.basename,
			'prev'
		);
		const newRolloverDate = betterRolloverDate
			? new Date(betterRolloverDate.basename)
			: null;

		return (
			!isNaN(oldRolloverDate) &&
			newRolloverDate &&
			oldRolloverDate >= newRolloverDate
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
		// if note is newly created - use template note for callouts header, not newly
		// created one, because new one is not yet cached to have sections available
		const { templatePath } = this.#dailyNoteHelper.getStructurePathes();
		const templateNote = this.#noteManager.getNoteByPath(templatePath);

		let currentCallouts = await this.#extendedCacheManager.getSections(
			useTemplateNote ? templateNote : currentNote,
			['callout']
		);

		// there is still a chance that note was not cached (in case it was created recently
		// by external plugin that use daily notes plugins) so backup to template one on error
		if (!currentCallouts?.callout?.length && !useTemplateNote) {
			currentCallouts = await this.#extendedCacheManager.getSections(
				templateNote,
				['callout']
			);
		}

		// if even template has no callouts - return
		if (!currentCallouts?.callout?.length) return;
		currentCallouts = currentCallouts.callout;

		let previousCallouts = await this.#extendedCacheManager.getSections(
			previousNote,
			['callout']
		);

		// if previous note has no callouts - return
		if (!previousCallouts?.callout?.length) return;
		previousCallouts = previousCallouts.callout;

		let noteContent = await app.vault.read(currentNote);
		currentCallouts.forEach((callout) => {
			const prevCallout = previousCallouts.find((c) =>
				this.#extendedSectionHelper.haveSameSignature(c, callout)
			);

			if (!prevCallout) return;

			noteContent = noteContent.replace(
				callout.content,
				prevCallout.content
			);
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
