class EmptyLineHelper {
	// if there is empty line token on previous or new line - concatinate them
	tryHandleTokens(editor, prevLine, splitLine, newLine, nextLine, token) {
		if (splitLine.content + newLine.content === token) {
			editor.setLine(splitLine.position.line, token);
			editor.setLine(newLine.position.line, token);
			editor.setCursor({ line: newLine.position.line + 1, ch: 0 });
			return true;
		}

		if (prevLine.content.includes(token)) {
			editor.setLine(splitLine.position.line, token);
			return true;
		}

		if (nextLine.content.includes(token)) {
			editor.setLine(newLine.position.line, token);
			editor.setCursor(splitLine.position);
			return true;
		}

		return false;
	}

	tryHandleLinks(editor, prevLine, splitLine, newLine, nextLine, token) {
		const func = (line) => window.customJS.LinkParser.LINK.test(line);
		return this.#tryHandleNonSplittable(editor, splitLine, newLine, func);
	}

	tryHandleHeaders(editor, prevLine, splitLine, newLine, nextLine, token) {
		const func = (line) => line.includes('# ');
		return this.#tryHandleNonSplittable(editor, splitLine, newLine, func);
	}

	/*
	 * non-splittable - embeds, headers, links sections. rules:
	 * - no insertion inside
	 * - on insertion after/before - just as usual '\n'
	 */
	#tryHandleNonSplittable(editor, splitLine, newLine, func) {
		const check = (line1, line2) => func(line1) && line2 === '';

		if (
			check(splitLine.content, newLine.content) ||
			check(newLine.content, splitLine.content)
		)
			return true;

		const fullLine = splitLine.content + newLine.content;
		if (func(fullLine)) {
			editor.setLine(splitLine.position.line, fullLine);

			editor.replaceRange('', newLine.position, {
				line: newLine.position.line + 1,
				ch: 0,
			});

			return true;
		}
	}

	/*
	 * quotes - blockquote, callout sections. rules:
	 * - on insertion inside use double empty line '>'
	 * - required empty line at the end, so on insertion after use '\ntoken'
	 */
	tryHandleQuotes(editor, prevLine, splitLine, newLine, nextLine, token) {
		if (!splitLine.content.startsWith('>')) {
			if (!prevLine.content.startsWith('>')) return false;

			editor.setLine(splitLine.position.line, '\n' + token);
			return true;
		}

		// split with 2 empty lines
		if (newLine.content !== '>') {
			const sliceIndex = newLine.content[1] === ' ' ? 2 : 1;
			newLine.content = '>\n>' + newLine.content.slice(sliceIndex);

			editor.setCursor({
				line: newLine.position.line + 1,
				ch: 1,
			});
		} else {
			// end of quote or just end of line
			newLine.content =
				!nextLine || !nextLine.content.startsWith('>')
					? '\n' + token + '\n'
					: '>\n>';
		}

		editor.setLine(newLine.position.line, newLine.content);

		return true;
	}

	/*
	 * list sections. rules:
	 * - on insertion inside split list into two and adjust levels
	 * - required empty line at the end, so on insertion after use '\ntoken'
	 */
	tryHandleLists(editor, prevLine, splitLine, newLine, nextLine, token) {
		const listItemRegex = /^(\s*)(?:[-*+]|\d+\.)\s+(.*)$/;
		const fullLine = splitLine.content + newLine.content;

		if (!listItemRegex.test(fullLine)) {
			if (!listItemRegex.test(prevLine.content)) return false;

			editor.setLine(splitLine.position.line, '\n' + token);
			return true;
		}

		// get prefix from splitLine, cause new one it will have extra 2 spaces
		const prefix = fullLine.match(/^[\t ]*/)?.[0] ?? '';

		// insert '\ntoken'
		editor.setLine(newLine.position.line, '\n' + token + '\n');

		// end of list
		if (!nextLine || nextLine.content === '') return true;

		let activeIndexLine = splitLine.position.line + 3;
		// split inside line
		if (newLine.content.length - 2 !== prefix.length) {
			// line was splitted before symbol '-'
			if (splitLine.content.length <= prefix.length) {
				editor.replaceRange('', splitLine.position, newLine.position);
				activeIndexLine--;

				newLine.content = newLine.content
					.slice(newLine.content.indexOf('-') + 2)
					.trim();
			} else {
				// line was spitted after symbol '-'
				newLine.content = newLine.content.slice(prefix.length).trim();
			}

			this.#tryAdjustListLevels(
				editor,
				activeIndexLine,
				prefix,
				newLine.content
			);
			return true;
		}

		// end of line
		this.#tryAdjustListLevels(editor, activeIndexLine, prefix);
		return true;
	}

	#tryAdjustListLevels(editor, startIndex, prefix, firstLine = null) {
		let newContent = firstLine ? `- ${firstLine}\n` : `- \n`;
		if (prefix.length > 0) {
			let nextLine;
			for (let i = startIndex + 1; i < editor.lineCount(); i++) {
				nextLine = editor.getLine(i);
				if (!nextLine.includes(prefix)) break;

				newContent += nextLine.slice(prefix.length) + '\n';
			}
		}

		editor.replaceRange(
			newContent,
			{ line: startIndex, ch: 0 },
			{
				line: startIndex + newContent.split('\n').length - 1,
				ch: 0,
			}
		);

		editor.setCursor({ line: startIndex, ch: 2 });
	}

	/*
	 * paragraph sections. rules:
	 * - on insertion inside split into two with 'token\n'
	 * - on insertion before and after use 'token\n'
	 */
	tryHandleParagraphs(editor, prevLine, splitLine, newLine, nextLine, token) {
		// at the start
		if (splitLine.content === '' && newLine.content !== '') {
			editor.setLine(splitLine.position.line, token + '\n');

			editor.setCursor({
				line: newLine.position.line + 1,
				ch: 0,
			});
			return true;
		}

		// split inside
		if (splitLine.content !== '') {
			let content = token + '\n';
			if (newLine.content !== '') content += '\n' + newLine.content;

			editor.setLine(newLine.position.line, content);
			editor.setCursor({
				line: newLine.position.line + 2,
				ch: 0,
			});
			return true;
		}

		return false;
	}
}
