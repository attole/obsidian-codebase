class ClipboardManager {
	async tryInsertFromClipboard(editor, parser = null) {
		let text = await navigator.clipboard.readText();
		if (!text?.length) return false;

		if (parser) {
			text = await parser.parseText({ input: text });
		}

		const cursor = editor.getCursor();

		editor.replaceRange(text, cursor);
		editor.setCursor({
			line: cursor.line,
			ch: cursor.ch + text.length,
		});

		await navigator.clipboard.writeText('');
		return true;
	}
}
