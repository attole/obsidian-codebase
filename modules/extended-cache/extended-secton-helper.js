class ExtendedSectionHelper {
	haveSameSignature(sectionA, sectionB) {
		if (sectionA.type !== sectionB.type) return false;

		if (sectionA.header && sectionB.header)
			return sectionA.header.content === sectionB.header.content;

		return (
			sectionA.body.content.split('\n')[0] ===
			sectionB.body.content.split('\n')[0]
		);
	}
}
