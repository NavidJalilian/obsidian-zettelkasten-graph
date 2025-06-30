import { Vault, TFile, normalizePath } from 'obsidian';
import { ZettelkastenParser, ZettelNode, ZettelGraph } from './zettelkasten-parser';

export class NoteCreator {
    private vault: Vault;
    private parser: ZettelkastenParser;

    constructor(vault: Vault, parser: ZettelkastenParser) {
        this.vault = vault;
        this.parser = parser;
    }

    async createSequentialNote(
        currentNode: ZettelNode, 
        currentGraph: ZettelGraph, 
        folderPath?: string
    ): Promise<TFile | null> {
        try {
            const existingNumbers = Array.from(currentGraph.nodes.values()).map(node => node.number);
            const nextNumber = this.parser.generateNextSequentialNumber(currentNode.number, existingNumbers);
            
            const fileName = await this.generateFileName(nextNumber, currentNode.file, folderPath);
            const filePath = this.getTargetFilePath(fileName, currentNode.file, folderPath);
            
            // Create the file with basic content
            const content = this.generateNoteContent(nextNumber, 'Sequential note');
            const newFile = await this.vault.create(filePath, content);
            
            return newFile;
        } catch (error) {
            console.error('Error creating sequential note:', error);
            return null;
        }
    }

    async createBranchNote(
        currentNode: ZettelNode, 
        currentGraph: ZettelGraph, 
        folderPath?: string
    ): Promise<TFile | null> {
        try {
            const existingNumbers = Array.from(currentGraph.nodes.values()).map(node => node.number);
            const nextNumber = this.parser.generateNextBranchLetter(currentNode.number, existingNumbers);
            
            const fileName = await this.generateFileName(nextNumber, currentNode.file, folderPath);
            const filePath = this.getTargetFilePath(fileName, currentNode.file, folderPath);
            
            // Create the file with basic content
            const content = this.generateNoteContent(nextNumber, 'Branch note');
            const newFile = await this.vault.create(filePath, content);
            
            return newFile;
        } catch (error) {
            console.error('Error creating branch note:', error);
            return null;
        }
    }

    private async generateFileName(number: string, parentFile: TFile, folderPath?: string): Promise<string> {
        // Extract the base name pattern from the parent file
        const parentBasename = parentFile.basename;
        const parentNumber = this.extractNumberFromFilename(parentBasename);
        
        if (parentNumber) {
            // Replace the number in the parent filename with the new number
            const newBasename = parentBasename.replace(parentNumber, number);
            return newBasename;
        } else {
            // If we can't extract the pattern, create a simple filename
            return `${number} - New Note`;
        }
    }

    private extractNumberFromFilename(filename: string): string | null {
        const match = filename.match(/^(\d+(?:\.\d+)*(?:[a-z]+)?)/);
        return match ? match[1] : null;
    }

    private getTargetFilePath(fileName: string, parentFile: TFile, folderPath?: string): string {
        let targetFolder: string;
        
        if (folderPath && folderPath.trim()) {
            // Use the configured folder path
            targetFolder = folderPath.trim();
        } else {
            // Use the same folder as the parent file
            const parentFolder = parentFile.parent?.path || '';
            targetFolder = parentFolder;
        }
        
        // Ensure the filename has .md extension
        const finalFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
        
        // Combine folder and filename
        if (targetFolder) {
            return normalizePath(`${targetFolder}/${finalFileName}`);
        } else {
            return normalizePath(finalFileName);
        }
    }

    private generateNoteContent(number: string, noteType: string): string {
        const timestamp = new Date().toISOString().split('T')[0];
        
        return `# ${number}

${noteType} created on ${timestamp}

## Content

<!-- Add your content here -->

---

*This note was automatically created as part of your Zettelkasten system.*
`;
    }

    async ensureUniqueFilePath(basePath: string): Promise<string> {
        let finalPath = basePath;
        let counter = 1;
        
        while (await this.vault.adapter.exists(finalPath)) {
            const pathWithoutExt = basePath.replace(/\.md$/, '');
            finalPath = `${pathWithoutExt} (${counter}).md`;
            counter++;
        }
        
        return finalPath;
    }
}
