/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import fs = require('fs');
import path = require('path');
import vscode = require('vscode');
import utils = require('./utils');
import { ILogger } from 'vscode-jsonrpc';

export enum LogLevel {
    Verbose,
    Normal,
    Warning,
    Error
}

export class Logger {

    private commands: vscode.Disposable[];
    private logChannel: vscode.OutputChannel;
    private logFilePath: string;

    public logBasePath: string;

    constructor(readonly MinimumLogLevel: LogLevel = LogLevel.Normal) {
        this.logChannel = vscode.window.createOutputChannel("PowerShell Extension Logs");

        this.logBasePath =
            path.resolve(
                __dirname,
                "../logs",
                `${Math.floor(Date.now() / 1000)}-${vscode.env.sessionId}`);
        this.logFilePath = this.getLogFilePath("vscode-powershell");

        utils.ensurePathExists(this.logBasePath);

        this.commands = [
            vscode.commands.registerCommand(
                'PowerShell.ShowLogs',
                () => { this.showLogPanel(); }),

            vscode.commands.registerCommand(
                'PowerShell.OpenLogFolder',
                () => { this.openLogFolder(); })
        ]
    }

    public getLogFilePath(baseName: string): string {
        return path.resolve(this.logBasePath, `${baseName}.log`);
    }

    public writeAtLevel(logLevel: LogLevel, message: string, ...additionalMessages: string[]) {
        if (logLevel >= this.MinimumLogLevel) {
            // TODO: Add timestamp
            this.logChannel.appendLine(message);
            fs.appendFile(this.logFilePath, message + "\r\n");

            additionalMessages.forEach((line) => {
                this.logChannel.appendLine(line);
                fs.appendFile(this.logFilePath, line + "\r\n");
            });
        }
    }

    public write(message: string, ...additionalMessages: string[]) {
        this.writeAtLevel(LogLevel.Normal, message, ...additionalMessages);
    }

    public writeVerbose(message: string, ...additionalMessages: string[]) {
        this.writeAtLevel(LogLevel.Verbose, message, ...additionalMessages);
    }

    public writeWarning(message: string, ...additionalMessages: string[]) {
        this.writeAtLevel(LogLevel.Warning, message, ...additionalMessages);
    }

    public writeAndShowWarning(message: string, ...additionalMessages: string[]) {
        this.writeWarning(message, ...additionalMessages);

        vscode.window.showWarningMessage(message, "Show Logs").then((selection) => {
            if (selection !== undefined) {
                this.showLogPanel();
            }
        });
    }

    public writeError(message: string, ...additionalMessages: string[]) {
        this.writeAtLevel(LogLevel.Error, message, ...additionalMessages);
    }

    public writeAndShowError(message: string, ...additionalMessages: string[]) {
        this.writeError(message, ...additionalMessages);

        vscode.window.showErrorMessage(message, "Show Logs").then((selection) => {
            if (selection !== undefined) {
                this.showLogPanel();
            }
        });
    }

    public dispose() {
        this.commands.forEach((command) => { command.dispose() });
        this.logChannel.dispose();
    }

    private showLogPanel() {
        this.logChannel.show();
    }

    private openLogFolder() {
        // Open the folder in VS Code since there isn't an easy way to
        // open the folder in the platform's file browser
        vscode.commands.executeCommand(
            'vscode.openFolder',
            vscode.Uri.file(this.logBasePath),
            true);
    }
}

export class LanguageClientLogger implements ILogger {

    constructor(private logger: Logger) { }

    public error(message: string) {
        this.logger.writeError(message);
    }

    public warn(message: string) {
        this.logger.writeWarning(message);
    }

    public info(message: string) {
        this.logger.write(message);
    }

    public log(message: string) {
        this.logger.writeVerbose(message);
    }
}