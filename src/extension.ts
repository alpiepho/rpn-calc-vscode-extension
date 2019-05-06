import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('rpnHexCalc.start', () => {
			RpnHexCalcPanel.createOrShow(context.extensionPath);
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(RpnHexCalcPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				RpnHexCalcPanel.revive(webviewPanel, context.extensionPath);
			}
		});
	}
}

/**
 * Manages rpn hex calc webview panels
 */
class RpnHexCalcPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: RpnHexCalcPanel | undefined;

	public static readonly viewType = 'rpnHexCalc';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (RpnHexCalcPanel.currentPanel) {
			RpnHexCalcPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			RpnHexCalcPanel.viewType,
			'Rpn Hex Calc',
			column || vscode.ViewColumn.One,
			{
				// Enable javascript in the webview
				enableScripts: true,

				// And restrict the webview to only loading content from our extension's `media` directory.
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
			}
		);

		RpnHexCalcPanel.currentPanel = new RpnHexCalcPanel(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		RpnHexCalcPanel.currentPanel = new RpnHexCalcPanel(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		RpnHexCalcPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const z = 1 + 2;
		// Vary the webview's content based on where it is located in the editor.
		switch (this._panel.viewColumn) {
			case vscode.ViewColumn.Two:
				this._panel.title = 'Rpn Hex Calc';
				break;

			case vscode.ViewColumn.Three:
				this._panel.title = 'Rpn Hex';
				break;

			case vscode.ViewColumn.One:
			default:
				this._panel.title = 'Rpn Hex Calculator';
				break;
		}
		this._panel.webview.html = this._getHtmlForWebview();
	}

	private _getHtmlForWebview() {
		// Local path to main script run in the webview
		const scriptPathOnDisk1 = vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'popup.css')
		);

		// And the uri we use to load this script in the webview
		const scriptUri1 = scriptPathOnDisk1.with({ scheme: 'vscode-resource' });


		// Local path to main script run in the webview
		const scriptPathOnDisk2 = vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'jquery-3.2.1.slim.min.js')
		);

		// And the uri we use to load this script in the webview
		const scriptUri2 = scriptPathOnDisk2.with({ scheme: 'vscode-resource' });


		// Local path to main script run in the webview
		const scriptPathOnDisk3 = vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'main.js')
		);

		// And the uri we use to load this script in the webview
		const scriptUri3 = scriptPathOnDisk3.with({ scheme: 'vscode-resource' });

		// Use a nonce to whitelist which scripts can be run
		const nonce1 = getNonce();
		const nonce2 = getNonce();
		const nonce3 = getNonce();

		return `<!DOCTYPE html>
		<html>
		  <head>
			<title>RPM Hex Calculator v0.1</title>
			<link rel="stylesheet" href="${scriptUri1}"/>
			<link rel="icon" type="image/x-icon" href="favicon.ico">
		  </head>
		  <body>
			<div class="calc-container">
			  <p id="title" class="text-font">RPN Hex Calculator</p>
			  <div class="calc-font" id="calculator"></div>
			</div>      
		
			<div id="about-overlay" class="about-overlay about-hide">
			  &nbsp;
			</div>
			<div id="about" class="about about-hide">
			  <p >v0.1</p>
			  <p>A simple Hex calculator that uses reverse polish notation.</p>
			  <p>Thanks for trying our app!</p>
			  <p>- "Thatname Group"</p>
			</div>
		  </body>
		  <script type="text/javascript" nonce="${nonce2}" src="${scriptUri2}"></script>
		  <script nonce="${nonce3}" src="${scriptUri3}"></script>
		</html>
		`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
