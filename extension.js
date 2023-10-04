const vscode = require('vscode');
const path = require('./src/path.js')

/**
 * @param {vscode.ExtensionContext} context
 */

const {
	window,
	commands
} = vscode

function activate(context) {

	// const output = window.createOutputChannel('debug')
	const editor = window.activeTextEditor;

	let disposable = commands.registerCommand('selection-minify', function () {
		if (editor) {
			const selection = editor.selection
			const getSelection = editor.document.getText(selection)
			const minified = path.minify(getSelection)
			// output.appendLine(minified)
			// output.show()
			editor.edit(editBuilder => {
				editBuilder.replace(selection, minified);
			}).then(success => {
				if (success) {
					 window.showInformationMessage('Selection Minified!');
				} else {
					 window.showErrorMessage('Failed to minify selection.');
				}
		  })
		}
	});

	context.subscriptions.push(disposable);
}

module.exports = {
	activate
}
