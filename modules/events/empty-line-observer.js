class EmptyLineObserver {
	edit(editor, _) {
		const cursor = editor.getCursor();
		const emptyLine = 'ㅤ';

		editor.replaceRange(emptyLine, cursor);
		editor.setCursor({
			line: cursor.line,
			ch: cursor.ch + emptyLine.length,
		});
	}
}
