class SectionManager {
	/*
	 * basic section related functionality, used internally by ExtendedSectionManager
	 * should not be used independently
	 */
	
	getSectionContent(content, section) {
		const start = section.position.start.offset;
		const end = section.position.end?.offset ?? content.length;

		return content.slice(start, end);
	}

	// check whether sections is actually an embed data (embeds are just ![[path]]) 
	isSectionEmbed(metadata, section) {
		if (!metadata.embeds) return false;

		for (const element of metadata.embeds) {
			if (this.samePosition(element.position, section.position))
				return true;
		}

		return false;
	}

	samePosition(a, b) {
		if (!a || !b) return false;

		return (
			a.start.line === b.start.line &&
			a.start.col === b.start.col &&
			a.start.offset === b.start.offset &&
			a.end.line === b.end.line &&
			a.end.col === b.end.col &&
			a.end.offset === b.end.offset
		);
	}
}
