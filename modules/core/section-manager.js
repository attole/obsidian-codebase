/*
 * manager for default sections, used internally by extended cache builder and should only
 * be used externally with extended cache data only (no need to work on default sections)
 */

class SectionManager {
	getContentByPosition(content, position) {
		return content.substring(position.start.offset, position.end.offset);
	}

	getSectionContent(content, section) {
		const start = section.position.start.offset;
		const end = section.position.end.offset;
		return content.slice(start, end);
	}

	getSectionIndexByPosition(sections, position) {
		return sections.findIndex(
			(section) =>
				section.position.start.offset <= position &&
				section.position.end.offset >= position
		);
	}

	getSectionIndexByLine(sections, line) {
		return sections.findIndex(
			(section) =>
				section.position.start.line <= line &&
				section.position.end.line >= line
		);
	}

	isSamePositions(positionA, positionB) {
		if (!positionA || !positionB) return false;

		return (
			this.isSamePosition(positionA.start, positionB.start) &&
			this.isSamePosition(positionA.end, positionB.end)
		);
	}

	isSamePosition(positionA, positionB) {
		if (!positionA || !positionB) return false;

		return (
			positionA.line === positionB.line &&
			positionA.col === positionB.col &&
			positionA.offset === positionB.offset
		);
	}
}
