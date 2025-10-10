/*
 * extended cache is reparsed default cache with empty line parsing and extended sections
 *
 * as empty line is special token, that is parsed as a paragraph type by default,
 * it should be removed from sections, and all structure changed accordingly
 *
 * extended section definition:
 * - a section with a special type that may have a paragraph immediately before (header)
 *   or after (footer)
 * - the section object contains:
 *     - position and content: covers the whole section including added header/footer.
 *     - header, body, footer: separate objects with their own position and content.
 * - header/footer paragraphs are removed from the note's main content and metadata,
 *   as they are now part of the extended section.
 *
 * section-specific rules:
 * 1. blockquote, callout sections:
 * 	   - only header is possible
 * 	   - footer is not possible as these blocks require an empty line at the end
 *
 * 2. code sections:
 *     - both header and footer are possible
 *
 * 3. list sections:
 * 	   - header is possible
 *     - paragraph immediately after list is normally treated as part of the last
 *       list item, so it should be splited into footer, and metadata.listItems
 *       should be updated
 *
 * 4. embeds:
 *     - by default, threated as part of paragraph and is tracked in metadata.embeds
 *     - both header and footer are possible
 *     - treated as main sections (new type - 'embed'), not as part of metadata
 *     - not in paragraphs ad metadata.embeds
 */

class ExtendedCacheBuilder {
	get #sectionManager() {
		return window.customJS.createSectionManagerInstance();
	}

	async build(note) {
		let content = await app.vault.read(note);

		if (content === '') return;

		// create copy not to break obsidian original cache
		const metadata = structuredClone(app.metadataCache.getFileCache(note));
		if (!metadata) {
			const error = 'extendedCacheBuilder: error on parsing metadata';
			console.error(error);
			new Notice(error);
			return;
		}

		let sections = metadata.sections;
		delete metadata.sections;

		content = this.#handleEmptyLines(content, sections, metadata);

		this.#createExtendedSections(content, sections, metadata);
		this.#updateSectionsContent(content, sections, metadata);

		app.metadataCache.setExtendedFileCache(note, { metadata, sections });
		return { metadata, sections };
	}

	/*
	 * remove empty line tokens and update content and sections accordingly
	 *
	 * empty lines are inserted with script - when placed inside sections,
	 * content is automatically splited, so there is no need to split sections
	 * content there (only recalculate sections metadata)
	 *
	 * during token insertion, a new empty line is also appended at the end, so normally
	 * sections should never appear directly one after anoter, but ensure this explicitly,
	 * cause user migth manually delete that empty line after the token
	 *
	 * in case user deleted empty line after token, those sections should be splitted
	 */
	#handleEmptyLines(content, sections, metadata) {
		const emptyLineManager =
			window.customJS.createEmptyLineManagerInstance();

		const linesIndexes = emptyLineManager.findLines(content);
		if (linesIndexes.length === 0) return content;

		const contentLines = content.split('\n');
		const tokenLength = emptyLineManager.EMPTY_LINE_TOKEN.length;
		const metaItems = ['headings', 'embeds', 'links', 'tags', 'listItems']
			.flatMap((type) => metadata[type] ?? null)
			.filter((item) => !!item);

		// iterate backwards so not to mess with indexes on splicing
		for (let i = linesIndexes.length - 1; i >= 0; i--) {
			const lineIndex = linesIndexes[i];
			const line = contentLines[lineIndex];

			// if something more than just token - skip
			if (line.length > emptyLineManager.EMPTY_LINE_TOKEN.length)
				continue;

			// if previous and next line are not empty / empty line tokens - split sections
			const prevLine = contentLines[lineIndex - 1];
			if (
				prevLine !== '' &&
				contentLines[lineIndex + 1] !== '' &&
				emptyLineManager.findPositions(prevLine).length === 0
			) {
				// replace empty line token with empty line and shift positions accordingly
				contentLines.splice(lineIndex, 1, '');
				this.#shiftPositions({
					items: [sections, metaItems],
					lineIndex,
					offsetShift: tokenLength,
				});

				// handle split on sections, and do not change any positions
				this.#handleSplit(contentLines, sections, lineIndex);
				continue;
			}

			// remove empty line token line and shift positions accordingly
			contentLines.splice(lineIndex, 1);
			this.#shiftPositions({
				items: [sections, metaItems],
				lineIndex,
				lineShift: 1,
				offsetShift: tokenLength + 1,
			});
		}

		return contentLines.join('\n');
	}

	/*
	 * create extended sections by rules defined on manager
	 * do not change content, only sections data and metadata.embeds
	 */
	#createExtendedSections(content, sections, metadata) {
		this.#handleEmbeds(content, sections, metadata);

		for (let i = sections.length - 1; i >= 0; i--) {
			switch (sections[i]?.type) {
				case 'embed':
					continue;

				case 'blockquote':
				case 'callout':
					this.#tryBuildExtendedSection(sections, i, i - 1);
					break;

				case 'code':
					this.#tryBuildExtendedSection(sections, i, i - 1);
					this.#tryBuildExtendedSection(sections, i, i + 1);
					break;

				case 'list':
					this.#tryBuildExtendedSection(sections, i, i - 1);
					this.#tryFixListFooter(content, sections[i], metadata);
			}
		}

		for (let i = 0; i < sections.length; i++) {
			if (!sections[i]) sections.splice(i, 1);
		}
	}

	// add content property to all cached items
	#updateSectionsContent(content, sections, metadata) {
		for (const section of sections) {
			section.content = this.#sectionManager.getContentByPosition(
				content,
				section.position
			);

			const props = ['header', 'body', 'footer'];
			props.forEach((prop) => {
				if (section[prop])
					section[prop].content =
						this.#sectionManager.getContentByPosition(
							content,
							section[prop].position
						);
			});

			if (!section.body) {
				section.body = {
					position: section.position,
					content: section.content,
				};
			}
		}

		if (!metadata.listItems) return;
		for (const listItem of metadata.listItems) {
			listItem.content = this.#sectionManager.getContentByPosition(
				content,
				listItem.position
			);
		}
	}

	/* only when user manually deleted '\n' on empty line, and have this structure:
	 * - paragraph/list
	 * - empty line token
	 * - paragraph
	 * those sections are concatenated, and should be splitted
	 * others positions do not changed, only subsections ones
	 *
	 * known problem - on structure like:
	 * - list
	 * - empty line token
	 * - paragraph
	 * - blockquote/callout/codeblock, any section type
	 * will not be parsed properly, and seemed to be list item content, so even after
	 * split, there is no second section defined, only first paragraph
	 * fix - have multiple consequtive redefining sections types
	 */
	#handleSplit(contentLines, sections, lineIndex) {
		const baseSectionIndex = this.#sectionManager.getSectionIndexByLine(
			sections,
			lineIndex
		);
		if (baseSectionIndex === -1) return;

		const baseSection = sections[baseSectionIndex];

		const firstSectionContent = contentLines
			.slice(baseSection.position.start.line, lineIndex)
			.join('\n');

		const firstSubsection = {
			type: firstSectionContent.startsWith('- ') ? 'list' : 'paragraph',
			position: {
				start: baseSection.position.start,
				end: {
					line: lineIndex - 1,
					col: contentLines[lineIndex - 1].length,
					offset:
						baseSection.position.start.offset +
						firstSectionContent.length,
				},
			},
		};

		// offset increased by 2 - empty line between sections in content is two '\n')
		const secondSubsection = {
			type: 'paragraph',
			position: {
				start: {
					line: lineIndex + 1,
					col: 0,
					offset:
						baseSection.position.start.offset +
						firstSectionContent.length +
						2,
				},
				end: baseSection.position.end,
			},
		};

		sections.splice(baseSectionIndex, 1, firstSubsection, secondSubsection);
	}

	/*
	 * shift positions for all cache items
	 *
	 * if section constisted only with empty line tokens, then at the last shift, it
	 * will have negative offsets (casue end position shifted, start - not)
	 * in this case - delete it and shift everything that came after
	 *
	 * no such case for metadata items - empty line tokens can't be inside of those
	 */
	#shiftPositions({
		items: [sections, metaItems],
		lineIndex = 0,
		lineShift = 0,
		offsetShift = 0,
	}) {
		const shift = (items, isSections = false) => {
			for (let i = items.length - 1; i >= 0; i--) {
				const itemPosition = items[i].position;
				if (lineIndex && itemPosition.end.line < lineIndex) continue;

				// move start position only from next of changed item
				if (itemPosition.start.line > lineIndex) {
					itemPosition.start.line -= lineShift;
					itemPosition.start.offset -= offsetShift;
				}

				// always move end position
				itemPosition.end.line -= lineShift;
				itemPosition.end.offset -= offsetShift;

				if (itemPosition.start.offset >= itemPosition.end.offset) {
					if (!isSections) {
						items.splice(i, 1);
						continue;
					}

					const lineDiff =
						itemPosition.end.line - itemPosition.start.line;
					const offsetDiff =
						itemPosition.end.offset - itemPosition.start.offset;

					// offset changed by 1 because in content new line is just '\n'
					this.#shiftPositions({
						items: [sections, metaItems],
						lineIndex: itemPosition.start.line,
						lineShift: lineDiff,
						offsetShift: offsetDiff + 1,
					});

					items.splice(i, 1);
				}
			}
		};

		shift(sections, true);
		shift(metaItems);
	}

	/*
	 * remove embeds from metadata.embeds and create their independent sections
	 * by default embeds are part of paragraph, so optional header/footer is already
	 * a part of section and should be splitted
	 */
	#handleEmbeds(content, sections, metadata) {
		if (!metadata.embeds) return;

		const embeds = metadata.embeds;
		delete metadata.embeds;

		const contentLines = content.split('\n');

		for (const embed of embeds) {
			const sectionIndex = this.#sectionManager.getSectionIndexByLine(
				sections,
				embed.position.start.line
			);

			if (sectionIndex === -1) continue;

			const section = sections[sectionIndex];
			section.type = 'embed';
			section.body = {
				position: embed.position,
				link: embed.link,
			};

			// offset changed by 1 because in content new line is just '\n'

			// header
			if (section.position.start.line < embed.position.start.line) {
				section.header = {
					position: {
						start: section.position.start,
						end: {
							line: embed.position.start.line - 1,
							col:
								contentLines[embed.position.start.line - 1]
									.length ?? 0,
							offset: embed.position.start.offset - 1,
						},
					},
				};
			}

			// footer
			if (section.position.end.line > embed.position.end.line) {
				section.footer = {
					position: {
						start: {
							line: embed.position.end.line + 1,
							col:
								contentLines[embed.position.end.line + 1]
									.length ?? 0,
							offset: embed.position.end.offset + 1,
						},
						end: section.position.end,
					},
				};
			}
		}
	}

	#tryBuildExtendedSection(sections, sourceIndex, targetIndex) {
		if (
			!sections[sourceIndex] ||
			!sections[targetIndex] ||
			!this.#isPartOfExtendedSection(sections, sourceIndex, targetIndex)
		)
			return;

		const sourceSection = sections[sourceIndex];
		const targetSection = sections[targetIndex];

		if (!sourceSection.body)
			sourceSection.body = { position: { ...sourceSection.position } };

		if (targetIndex < sourceIndex) {
			sourceSection.header = { position: targetSection.position };
			sourceSection.position.start = targetSection.position.start;
		} else {
			sourceSection.footer = { position: targetSection.position };
			sourceSection.position.end = targetSection.position.end;
		}

		sections[targetIndex] = null;
	}

	#tryFixListFooter(content, section, metadata) {
		const lastListItemIndex = metadata.listItems.findIndex((item) =>
			this.#sectionManager.isSamePosition(
				item.position.end,
				section.position.end
			)
		);

		const lastListItemContent = this.#sectionManager
			.getContentByPosition(
				content,
				metadata.listItems[lastListItemIndex].position
			)
			.split('- ')
			.at(-1);

		const i = lastListItemContent.indexOf('\n');
		if (i === -1) return;

		// set footer
		const footerContent = lastListItemContent.slice(i + 1);
		section.footer = {
			position: {
				start: {
					line:
						section.position.end.line -
						footerContent.split('\n').length,
					col: 0,
					offset: section.position.end.offset - footerContent.length,
				},
				end: section.position.end,
			},
		};

		// adjust body
		if (!section.body) {
			section.body = {
				position: {
					start: section.position.start,
				},
			};
		}
		section.body.position.end = {
			line: section.footer.position.start.line - 1,
			col: lastListItemContent.length - footerContent.length,
			offset: section.footer.position.start.offset - 1,
		};

		this.#fixLastListItem(content, section, metadata, lastListItemIndex);
	}

	/*
	 * if there is a footer on list, then all sub items of last item are broken
	 * and are not set on metadata.itemList, so parse them manually
	 */
	#fixLastListItem(content, section, metadata, lastItemIndex) {
		let lastListItemContentLines = this.#sectionManager
			.getContentByPosition(content, section.body.position)
			.split('\n- ')
			.at(-1)
			.split('\n')
			.map((line) => line.replace(/^[\n \t]+/, ''));

		lastListItemContentLines[0] = '- ' + lastListItemContentLines[0];

		let splittedLastListItems = [];
		let startPosition = {
			...metadata.listItems[lastItemIndex].position.start,
		};

		for (const line of lastListItemContentLines) {
			const position = {
				start: startPosition,
				end: {
					line: startPosition.line,
					col: line.length,
					offset: startPosition.offset + line.length,
				},
			};

			splittedLastListItems.push({
				parent: null,
				position: position,
			});

			startPosition = {
				line: position.end.line + 1,
				col: 0,
				offset: position.end.offset + 2,
			};
		}

		metadata.listItems.splice(-1, 1, ...splittedLastListItems);
	}

	// sections are part of extended one in case they located consecutively by lines
	#isPartOfExtendedSection(sections, sourceIndex, targetIndex) {
		if (sections[targetIndex]?.type !== 'paragraph') return false;

		const sourcePosition = sections[sourceIndex].position;
		const targetPosition = sections[targetIndex].position;

		return targetIndex < sourceIndex
			? targetPosition.end.line + 1 === sourcePosition.start.line
			: targetPosition.start.line === sourcePosition.end.line + 1;
	}
}
