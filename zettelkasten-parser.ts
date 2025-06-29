import { TFile, Vault } from 'obsidian';

export interface ZettelNode {
    id: string;
    title: string;
    file: TFile;
    type: 'sequence' | 'branch';
    number: string;
    parentId?: string;
    children: string[];
    level: number;
}

export interface ZettelGraph {
    nodes: Map<string, ZettelNode>;
    roots: string[];
}

export class ZettelkastenParser {
    private vault: Vault;
    
    // Regex patterns for different numbering formats
    private readonly SEQUENCE_PATTERN = /(\d+(?:\.\d+)*)/; // 21, 21.1, 21.2.3
    private readonly BRANCH_PATTERN = /(\d+(?:\.\d+)*[a-z]+)/; // 21a, 21.1b, 21.2.3c
    private readonly FULL_PATTERN = /(\d+(?:\.\d+)*(?:[a-z]+)?)/g;

    constructor(vault: Vault) {
        this.vault = vault;
    }

    async parseZettelkasten(folderPath?: string): Promise<ZettelGraph> {
        const files = this.vault.getMarkdownFiles();
        const filteredFiles = folderPath 
            ? files.filter(file => file.path.startsWith(folderPath))
            : files;

        const nodes = new Map<string, ZettelNode>();
        const roots: string[] = [];

        // First pass: identify all zettel files and create nodes
        for (const file of filteredFiles) {
            const zettelNumbers = this.extractZettelNumbers(file);
            
            for (const number of zettelNumbers) {
                const nodeId = this.generateNodeId(file, number);
                const node: ZettelNode = {
                    id: nodeId,
                    title: this.extractTitle(file, number),
                    file: file,
                    type: this.determineType(number),
                    number: number,
                    children: [],
                    level: this.calculateLevel(number)
                };
                
                nodes.set(nodeId, node);
            }
        }

        // Second pass: establish parent-child relationships
        for (const [nodeId, node] of nodes) {
            const parentId = this.findParentId(node, nodes);
            if (parentId) {
                node.parentId = parentId;
                const parent = nodes.get(parentId);
                if (parent) {
                    parent.children.push(nodeId);
                }
            } else {
                roots.push(nodeId);
            }
        }

        return { nodes, roots };
    }

    private extractZettelNumbers(file: TFile): string[] {
        const numbers: string[] = [];
        
        // Check filename
        const filenameMatches = file.basename.match(this.FULL_PATTERN);
        if (filenameMatches) {
            numbers.push(...filenameMatches);
        }

        return [...new Set(numbers)]; // Remove duplicates
    }

    private generateNodeId(file: TFile, number: string): string {
        return `${number}-${file.basename}`;
    }

    private extractTitle(file: TFile, number: string): string {
        // Use the filename without extension, or could be enhanced to read first line of content
        return file.basename.replace(new RegExp(`^${number}\\s*[-:]?\\s*`), '') || file.basename;
    }

    private determineType(number: string): 'sequence' | 'branch' {
        return this.BRANCH_PATTERN.test(number) ? 'branch' : 'sequence';
    }

    private calculateLevel(number: string): number {
        if (this.BRANCH_PATTERN.test(number)) {
            // For branches like 21a, 21.1b, count dots + 1
            const baseNumber = number.replace(/[a-z]+$/, '');
            return (baseNumber.match(/\./g) || []).length + 1;
        } else {
            // For sequences like 21, 21.1, 21.2.3, count dots + 1
            return (number.match(/\./g) || []).length + 1;
        }
    }

    private findParentId(node: ZettelNode, nodes: Map<string, ZettelNode>): string | undefined {
        const number = node.number;
        
        if (node.type === 'branch') {
            // For branches like 21a, parent is 21
            const baseNumber = number.replace(/[a-z]+$/, '');
            return this.findNodeByNumber(baseNumber, nodes);
        } else {
            // For sequences like 21.1, parent is 21
            const parts = number.split('.');
            if (parts.length > 1) {
                const parentNumber = parts.slice(0, -1).join('.');
                return this.findNodeByNumber(parentNumber, nodes);
            }
        }
        
        return undefined;
    }

    private findNodeByNumber(targetNumber: string, nodes: Map<string, ZettelNode>): string | undefined {
        for (const [nodeId, node] of nodes) {
            if (node.number === targetNumber) {
                return nodeId;
            }
        }
        return undefined;
    }
}
