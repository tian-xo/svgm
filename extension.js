const vscode = require('vscode');
const path = require('./src/path.js');

function activate(context) {
	let disposable = vscode.commands.registerCommand('selection-minify', function () {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const selection = editor.selection;
			const selectedText = editor.document.getText(selection);
			
			// Delay the processing by 50 milliseconds
			setTimeout(() => {
				const minified = path.minify(selectedText);
				editor.edit(editBuilder => {
					editBuilder.replace(selection, minified);
				}).then(success => {
					if (success) {
						vscode.window.showInformationMessage('Selection Minified!');
					} else {
						vscode.window.showErrorMessage('Failed to minify selection.');
					}
				});
			}, 50);
		} else {
			vscode.window.showWarningMessage('No active text editor found.');
		}
	});

	context.subscriptions.push(disposable);
}

module.exports = {
	activate
};
