import * as d3 from 'd3';
import { ZettelNode, ZettelGraph, ZettelkastenParser } from './zettelkasten-parser';
import { Vault, TFile } from 'obsidian';

export interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    zettel: ZettelNode;
    x?: number;
    y?: number;
}

export interface ManipulationCommand {
    type: 'move' | 'renumber';
    nodeId: string;
    oldData: any;
    newData: any;
    timestamp: number;
}

export interface DropZone {
    targetNode: GraphNode;
    position: 'child' | 'sibling-before' | 'sibling-after';
    newNumber: string;
    isValid: boolean;
    reason?: string;
}

export class NodeManipulator {
    private vault: Vault;
    private parser: ZettelkastenParser;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private commandHistory: ManipulationCommand[] = [];
    private historyIndex: number = -1;
    private maxHistorySize: number = 50;
    
    // Visual feedback elements
    private dropZoneIndicator: d3.Selection<SVGCircleElement, unknown, null, undefined> | null = null;
    private relationshipPreview: d3.Selection<SVGLineElement, unknown, null, undefined> | null = null;
    private feedbackOverlay: HTMLElement | null = null;

    constructor(
        vault: Vault, 
        parser: ZettelkastenParser, 
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
    ) {
        this.vault = vault;
        this.parser = parser;
        this.svg = svg;
    }

    /**
     * Enhanced drag behavior with hierarchical manipulation support
     */
    createEnhancedDragBehavior(
        nodes: GraphNode[], 
        graph: ZettelGraph,
        onGraphUpdate: (graph: ZettelGraph) => void
    ) {
        let draggedNode: GraphNode | null = null;
        let currentDropZone: DropZone | null = null;

        return d3.drag<SVGGElement, GraphNode>()
            .on("start", (event, d) => {
                draggedNode = d;
                this.startDragOperation(d, event);
            })
            .on("drag", (event, d) => {
                this.updateDragPosition(d, event);
                currentDropZone = this.detectDropZone(d, nodes, event);
                this.updateVisualFeedback(currentDropZone);
            })
            .on("end", async (event, d) => {
                if (currentDropZone && currentDropZone.isValid) {
                    await this.executeNodeMove(d, currentDropZone, graph, onGraphUpdate);
                }
                this.endDragOperation();
                draggedNode = null;
                currentDropZone = null;
            });
    }

    /**
     * Start drag operation with visual feedback
     */
    private startDragOperation(node: GraphNode, event: any) {
        // Add dragging class for visual feedback
        d3.select(event.sourceEvent.target.closest('.node'))
            .classed('dragging', true);

        // Create drop zone indicator
        this.dropZoneIndicator = this.svg.select('g')
            .append('circle')
            .attr('class', 'drop-zone-indicator')
            .attr('r', 0)
            .style('opacity', 0);

        // Create relationship preview line
        this.relationshipPreview = this.svg.select('g')
            .append('line')
            .attr('class', 'relationship-preview')
            .style('opacity', 0);
    }

    /**
     * Update drag position and visual state
     */
    private updateDragPosition(node: GraphNode, event: any) {
        node.fx = event.x;
        node.fy = event.y;
    }

    /**
     * Detect valid drop zones based on current drag position
     */
    private detectDropZone(draggedNode: GraphNode, allNodes: GraphNode[], event: any): DropZone | null {
        const mouseX = event.x;
        const mouseY = event.y;
        const threshold = 40; // Distance threshold for drop detection

        for (const targetNode of allNodes) {
            if (targetNode.id === draggedNode.id) continue;
            if (!targetNode.x || !targetNode.y) continue;

            const distance = Math.sqrt(
                Math.pow(mouseX - targetNode.x, 2) + 
                Math.pow(mouseY - targetNode.y, 2)
            );

            if (distance <= threshold) {
                return this.calculateDropZone(draggedNode, targetNode);
            }
        }

        return null;
    }

    /**
     * Calculate the type of drop zone and new numbering
     */
    private calculateDropZone(draggedNode: GraphNode, targetNode: GraphNode): DropZone {
        const draggedNumber = draggedNode.zettel.number;
        const targetNumber = targetNode.zettel.number;

        // Determine if this would create a valid hierarchical relationship
        const validation = this.validateHierarchicalMove(draggedNumber, targetNumber);

        if (!validation.isValid) {
            return {
                targetNode,
                position: 'child',
                newNumber: '',
                isValid: false,
                reason: validation.reason
            };
        }

        // Calculate new number based on position
        const newNumber = this.calculateNewNumber(draggedNumber, targetNumber, 'child');

        return {
            targetNode,
            position: 'child',
            newNumber,
            isValid: true
        };
    }

    /**
     * Validate if a hierarchical move is allowed
     */
    private validateHierarchicalMove(draggedNumber: string, targetNumber: string): {isValid: boolean, reason?: string} {
        // Prevent moving a parent to become child of its descendant
        if (targetNumber.startsWith(draggedNumber + '.') || targetNumber.startsWith(draggedNumber)) {
            return {
                isValid: false,
                reason: "Cannot move a parent node to become child of its descendant"
            };
        }

        // Prevent moving to self
        if (draggedNumber === targetNumber) {
            return {
                isValid: false,
                reason: "Cannot move node to itself"
            };
        }

        return { isValid: true };
    }

    /**
     * Calculate new number for the moved node
     */
    private calculateNewNumber(draggedNumber: string, targetNumber: string, position: 'child' | 'sibling-before' | 'sibling-after'): string {
        switch (position) {
            case 'child':
                // Make dragged node a child of target
                // If target is "21", new number could be "21.1"
                // If target is "21.1", new number could be "21.1.1"
                return `${targetNumber}.1`;
            
            case 'sibling-before':
                // Insert before target at same level
                const parts = targetNumber.split('.');
                const lastPart = parseInt(parts[parts.length - 1]);
                parts[parts.length - 1] = (lastPart - 0.5).toString();
                return parts.join('.');
            
            case 'sibling-after':
                // Insert after target at same level
                const afterParts = targetNumber.split('.');
                const afterLastPart = parseInt(afterParts[afterParts.length - 1]);
                afterParts[afterParts.length - 1] = (afterLastPart + 1).toString();
                return afterParts.join('.');
            
            default:
                return draggedNumber;
        }
    }

    /**
     * Update visual feedback during drag
     */
    private updateVisualFeedback(dropZone: DropZone | null) {
        if (!this.dropZoneIndicator || !this.relationshipPreview) return;

        if (dropZone) {
            const targetNode = dropZone.targetNode;
            
            // Update drop zone indicator
            this.dropZoneIndicator
                .attr('cx', targetNode.x!)
                .attr('cy', targetNode.y!)
                .attr('r', 35)
                .classed('invalid', !dropZone.isValid)
                .style('opacity', 1);

            // Update target node visual state
            d3.selectAll('.node')
                .classed('drag-target', false)
                .classed('invalid-drop-target', false);

            d3.select(`.node[data-id="${targetNode.id}"]`)
                .classed('drag-target', dropZone.isValid)
                .classed('invalid-drop-target', !dropZone.isValid);

        } else {
            // Hide indicators when no drop zone
            this.dropZoneIndicator.style('opacity', 0);
            this.relationshipPreview.style('opacity', 0);
            
            d3.selectAll('.node')
                .classed('drag-target', false)
                .classed('invalid-drop-target', false);
        }
    }

    /**
     * Execute the node move operation
     */
    private async executeNodeMove(
        draggedNode: GraphNode, 
        dropZone: DropZone, 
        graph: ZettelGraph,
        onGraphUpdate: (graph: ZettelGraph) => void
    ) {
        try {
            // Create command for undo/redo
            const command: ManipulationCommand = {
                type: 'move',
                nodeId: draggedNode.id,
                oldData: {
                    number: draggedNode.zettel.number,
                    parentId: draggedNode.zettel.parentId
                },
                newData: {
                    number: dropZone.newNumber,
                    parentId: dropZone.targetNode.id
                },
                timestamp: Date.now()
            };

            // Execute the move
            await this.performNodeMove(draggedNode, dropZone, graph);
            
            // Add to history
            this.addToHistory(command);
            
            // Update graph
            onGraphUpdate(graph);
            
            // Show success feedback
            this.showFeedback(`Moved ${draggedNode.zettel.number} to ${dropZone.newNumber}`, 'success');

        } catch (error) {
            console.error('Error executing node move:', error);
            this.showFeedback('Failed to move node', 'error');
        }
    }

    /**
     * Perform the actual node move operation
     */
    private async performNodeMove(draggedNode: GraphNode, dropZone: DropZone, graph: ZettelGraph) {
        const oldNumber = draggedNode.zettel.number;
        const newNumber = dropZone.newNumber;
        
        // Update the node's number and relationships
        draggedNode.zettel.number = newNumber;
        
        // Update parent-child relationships
        this.updateParentChildRelationships(draggedNode, dropZone, graph);
        
        // Renumber any child nodes
        await this.renumberChildNodes(oldNumber, newNumber, graph);
        
        // Update file if needed
        await this.updateNodeFile(draggedNode.zettel, oldNumber, newNumber);
    }

    /**
     * Update parent-child relationships in the graph
     */
    private updateParentChildRelationships(draggedNode: GraphNode, dropZone: DropZone, graph: ZettelGraph) {
        // Remove from old parent
        if (draggedNode.zettel.parentId) {
            const oldParent = graph.nodes.get(draggedNode.zettel.parentId);
            if (oldParent) {
                oldParent.children = oldParent.children.filter(id => id !== draggedNode.id);
            }
        }

        // Add to new parent
        const newParent = dropZone.targetNode.zettel;
        draggedNode.zettel.parentId = newParent.id;
        newParent.children.push(draggedNode.id);
    }

    /**
     * Renumber child nodes recursively
     */
    private async renumberChildNodes(oldParentNumber: string, newParentNumber: string, graph: ZettelGraph) {
        for (const [nodeId, node] of graph.nodes) {
            if (node.number.startsWith(oldParentNumber + '.')) {
                const oldNumber = node.number;
                const newNumber = node.number.replace(oldParentNumber, newParentNumber);
                
                node.number = newNumber;
                await this.updateNodeFile(node, oldNumber, newNumber);
            }
        }
    }

    /**
     * Update the file associated with a node
     */
    private async updateNodeFile(node: ZettelNode, oldNumber: string, newNumber: string) {
        // This would involve renaming the file and updating its content
        // Implementation depends on specific requirements for file management
        console.log(`Would update file for node ${node.id}: ${oldNumber} -> ${newNumber}`);
    }

    /**
     * End drag operation and cleanup
     */
    private endDragOperation() {
        // Remove visual feedback elements
        if (this.dropZoneIndicator) {
            this.dropZoneIndicator.remove();
            this.dropZoneIndicator = null;
        }
        
        if (this.relationshipPreview) {
            this.relationshipPreview.remove();
            this.relationshipPreview = null;
        }

        // Remove drag classes
        d3.selectAll('.node')
            .classed('dragging', false)
            .classed('drag-target', false)
            .classed('invalid-drop-target', false);
    }

    /**
     * Show feedback message to user
     */
    private showFeedback(message: string, type: 'success' | 'error' | 'info' = 'info') {
        // Remove existing feedback
        if (this.feedbackOverlay) {
            this.feedbackOverlay.remove();
        }

        // Create new feedback overlay
        this.feedbackOverlay = document.createElement('div');
        this.feedbackOverlay.className = `manipulation-feedback ${type}`;
        this.feedbackOverlay.textContent = message;
        
        document.body.appendChild(this.feedbackOverlay);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (this.feedbackOverlay) {
                this.feedbackOverlay.remove();
                this.feedbackOverlay = null;
            }
        }, 3000);
    }

    /**
     * Add command to history for undo/redo
     */
    private addToHistory(command: ManipulationCommand) {
        // Remove any commands after current index (when undoing then doing new action)
        this.commandHistory = this.commandHistory.slice(0, this.historyIndex + 1);
        
        // Add new command
        this.commandHistory.push(command);
        this.historyIndex++;
        
        // Limit history size
        if (this.commandHistory.length > this.maxHistorySize) {
            this.commandHistory.shift();
            this.historyIndex--;
        }
    }

    /**
     * Undo last operation
     */
    async undo(graph: ZettelGraph, onGraphUpdate: (graph: ZettelGraph) => void): Promise<boolean> {
        if (this.historyIndex < 0) return false;

        const command = this.commandHistory[this.historyIndex];
        
        try {
            await this.reverseCommand(command, graph);
            this.historyIndex--;
            onGraphUpdate(graph);
            this.showFeedback('Undid last operation', 'info');
            return true;
        } catch (error) {
            console.error('Error undoing operation:', error);
            this.showFeedback('Failed to undo operation', 'error');
            return false;
        }
    }

    /**
     * Redo last undone operation
     */
    async redo(graph: ZettelGraph, onGraphUpdate: (graph: ZettelGraph) => void): Promise<boolean> {
        if (this.historyIndex >= this.commandHistory.length - 1) return false;

        this.historyIndex++;
        const command = this.commandHistory[this.historyIndex];
        
        try {
            await this.executeCommand(command, graph);
            onGraphUpdate(graph);
            this.showFeedback('Redid operation', 'info');
            return true;
        } catch (error) {
            console.error('Error redoing operation:', error);
            this.showFeedback('Failed to redo operation', 'error');
            this.historyIndex--;
            return false;
        }
    }

    /**
     * Reverse a command for undo
     */
    private async reverseCommand(command: ManipulationCommand, graph: ZettelGraph) {
        const node = graph.nodes.get(command.nodeId);
        if (!node) return;

        // Restore old data
        Object.assign(node, command.oldData);
        
        // Update relationships and files as needed
        // Implementation depends on command type
    }

    /**
     * Execute a command for redo
     */
    private async executeCommand(command: ManipulationCommand, graph: ZettelGraph) {
        const node = graph.nodes.get(command.nodeId);
        if (!node) return;

        // Apply new data
        Object.assign(node, command.newData);
        
        // Update relationships and files as needed
        // Implementation depends on command type
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.historyIndex >= 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.historyIndex < this.commandHistory.length - 1;
    }

    /**
     * Clear command history
     */
    clearHistory() {
        this.commandHistory = [];
        this.historyIndex = -1;
    }
}
