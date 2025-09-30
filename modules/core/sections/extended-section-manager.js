class ExtendedSectionManager {
	/*
	 * class uses internal fields to support method chaining
	 * must be used via a new instance to ensure proper isolation of the state
	 *
	 * extended section rules:
	 * - because for empty multiple invisible spaces used - empty-line-insert,
	 *   which insert invisible space on new line, those lines make multiple paragraphs
	 *   as one, so they should be deleted and all sections updated respectively
	 * - if code and list sections have paragraphs straight on previous or next lines
	 *   it is considered as one section
	 */
	#content;
	#metadata;
	#sections;

	get #sectionHelper() {
		return window.customJS.createSectionManagerInstance();
	}

	async load(note) {
		const metadata = app.metadataCache.getFileCache(note);
		if (!metadata) return;

		// create copy not to break obsidian original cache
		const copy = structuredClone(metadata);

		this.#content = await app.vault.read(note);
		this.#sections = copy.sections;

		// delete it as #sections are only updated data on sections and should be used exclusively
		delete copy.sections;
		this.#metadata = copy;

		await this.#loadInternal();

		return this;
	}

	// get sections content and metadata. links content is also present in paragraphs
	getSectionsContentObjects(...types) {
		if (!this.#content) {
			const error = 'extededSectionManager: no note was loaded';
			console.error(error);
			new Notice(error);
			return;
		}

		if (types.length === 0) {
			types = [
				'yaml',
				'headings',
				'paragraph',
				'callout',
				'list',
				'links',
				'code',
				'embeds',
				'thematicBreak',
				'tags',
			];
		}

		const rawTypes = ['headings', 'embeds', 'links', 'tags'];
		const rawNeeded = types.filter((type) => rawTypes.contains(type));
		const rawSections =
			rawNeeded.length !== 0
				? this.getRawSectionsObjects(...rawNeeded)
				: [];

		const notRawNeeded = types.filter((type) => !rawTypes.contains(type));
		let otherSections =
			notRawNeeded.length !== 0
				? this.getSectionsObjects(...notRawNeeded)
				: [];

		const otherNotEmpty = Object.values(otherSections).some(
			(val) => Array.isArray(val) && val.length > 0
		);

		if (otherNotEmpty) {
			for (const key in otherSections) {
				const metadata = otherSections[key];

				otherSections[key] = metadata.map((section) => ({
					...section,
					content: this.#sectionHelper.getSectionContent(
						this.#content,
						section
					),
				}));
			}
		}

		return { ...rawSections, ...otherSections };
	}

	// get sections metadata
	getSectionsObjects(...types) {
		if (!this.#content) {
			const error = 'extededSectionManager: no note was loaded';
			console.error(error);
			new Notice(error);
			return;
		}

		if (types.length === 0) {
			types = [
				'yaml',
				'headings',
				'paragraph',
				'callout',
				'list',
				'code',
				'thematicBreak',
			];
		}

		let result = {};
		for (const type of types) {
			let typedSections = this.#sections.filter((s) => s.type === type);

			if (type === 'paragraph' && typedSections.length !== 0) {
				typedSections = typedSections.filter(
					(section) =>
						!this.#sectionHelper.isSectionEmbed(
							this.#metadata,
							section
						)
				);
			}
			result[type] = typedSections ?? [];
		}

		return result;
	}

	// get array of raw objects for specific sections types. result have more data than getSectionsObjects
	getRawSectionsObjects(...types) {
		if (!this.#content) {
			const error = 'extededSectionManager: no note was loaded';
			console.error(error);
			new Notice(error);
			return;
		}

		if (types.length === 0) {
			types = ['headings', 'embeds', 'links', 'tags', 'listItems'];
		}

		const result = {};
		for (const type of types) {
			result[type] = this.#metadata[type] ?? [];
		}

		return result;
	}

	async #loadInternal() {
		if (this.#sections.filter((s) => s.type === 'paragraph').length === 0)
			//delete this
			return;

		await this.#fixEmptyLines();

		// extend sections from base extension types and neighbour paragraphs
		const extentionTypes = ['list', 'code'];
		for (let i = this.#sections.length - 1; i > 0; i--) {
			if (extentionTypes.contains(this.#sections[i].type)) {
				this.#tryBuildExtendedSection(i, i - 1);
			} else if (extentionTypes.contains(this.#sections[i - 1].type)) {
				this.#tryBuildExtendedSection(i - 1, i);
			}
		}

		this.#sections = this.#sections.filter((s) => !!s);
	}

	/*
	 * some section types include empty lines as part of their content, so there is a need to split them into multiple ones
	 * - paragraphs concat all empty spaces (and content straight before and after)
	 * - lists concant first line after them as part of themselves, as well as empty line (and everything straight after)
	 */
	async #fixEmptyLines() {
		for (let i = 0; i < this.#sections.length; i++) {
			if (
				this.#sections[i].type !== 'paragraph' &&
				this.#sections[i].type !== 'list'
			)
				continue;

			const sourceSectionContent = this.#sectionHelper.getSectionContent(
				this.#content,
				this.#sections[i]
			);
			let subSectionsContent = sourceSectionContent
				.split('\nㅤ')
				.filter((s) => !!s);

			// no extra empty lines on this sections
			if (subSectionsContent.length === 1) continue;

			// replace note content (with extra \n to have right structure remained)
			const newSectionContent = subSectionsContent.join('\n');
			this.#content = this.#content.replace(
				sourceSectionContent,
				newSectionContent
			);

			// delete extra \n, to get right col
			subSectionsContent = subSectionsContent.map((s) => s.trim('\n'));

			// calculate right positions for new subsections
			let currentPosition = this.#sections[i].position.start;
			const subSections = subSectionsContent.map((c) => {
				const startPosition = currentPosition;
				const endPosition = {
					line: startPosition.line + c.split('\n').length - 1,
					col: c.split('\n').at(-1).length,
					offset: startPosition.offset + c.length,
				};

				currentPosition = {
					line: endPosition.line + 2,
					col: 0,
					offset: endPosition.offset,
				};

				const type = c.startsWith('>[!')
					? 'callout'
					: c.startsWith('- ')
					? 'list'
					: 'paragraph';

				return {
					type: type,
					position: {
						start: startPosition,
						end: endPosition,
					},
				};
			});

			// add new subsections into #sections
			const sectionsBefore = this.#sections.slice(0, i) ?? [];
			const sectionsAfter = this.#sections.slice(1 + i) ?? [];

			// add update later sections metadata
			const lineDiff =
				sourceSectionContent.split('\n').length -
				newSectionContent.split('\n').length;
			const offsetDiff =
				sourceSectionContent.length - newSectionContent.length;
			sectionsAfter.forEach((s) => {
				s.position.start.line -= lineDiff;
				s.position.start.offset -= offsetDiff;
				s.position.end.line -= lineDiff;
				s.position.end.offset -= offsetDiff;
			});

			this.#sections.splice(
				0,
				this.#sections.length,
				...sectionsBefore,
				...subSections,
				...sectionsAfter
			);

			// update index not to iterate newly created sections
			i += subSections.length - 1;
		}
	}

	// try to create extended section of provided indexes
	#tryBuildExtendedSection(sourceIndex, targetIndex) {
		if (!this.#sections[sourceIndex] || !this.#sections[targetIndex])
			return;

		if (this.#isPartOfExtendedSection(sourceIndex, targetIndex)) {
			let [first, second] =
				targetIndex < sourceIndex
					? [targetIndex, sourceIndex]
					: [sourceIndex, targetIndex];

			// as iteration goes from end to start, change first (by index) to be main extended
			this.#sections[first].position.end =
				this.#sections[second].position.end;
			this.#sections[first].type = this.#sections[sourceIndex].type;
			this.#sections[second] = null;
		}
	}

	// check whether to create extended section of provided indexes
	#isPartOfExtendedSection(sourceIndex, targetIndex) {
		if (this.#sections[targetIndex]?.type !== 'paragraph') return false;

		const sourcePosition = this.#sections[sourceIndex].position;
		const targetPosition = this.#sections[targetIndex].position;

		if (targetIndex < sourceIndex)
			return targetPosition.end.line + 1 === sourcePosition.start.line;

		return targetPosition.start.line === sourcePosition.end?.line + 1;
	}
}
