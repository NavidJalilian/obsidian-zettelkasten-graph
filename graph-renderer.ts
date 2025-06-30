import * as d3 from 'd3';
import { ZettelNode, ZettelGraph } from './zettelkasten-parser';
import { Workspace } from 'obsidian';

interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    zettel: ZettelNode;
    x?: number;
    y?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
    source: GraphNode;
    target: GraphNode;
    type: 'sequence' | 'branch';
}

interface NoteCreationCallbacks {
    onCreateSequential: (node: ZettelNode) => Promise<void>;
    onCreateBranch: (node: ZettelNode) => Promise<void>;
    onDeleteNote?: (node: ZettelNode) => Promise<void>;
}

export class GraphRenderer {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private simulation: d3.Simulation<GraphNode, GraphLink>;
    private workspace: Workspace;
    private container: HTMLElement;
    private noteCreationCallbacks?: NoteCreationCallbacks;
    private currentTransform: d3.ZoomTransform = d3.zoomIdentity;
    private nodePositions: Map<string, {x: number, y: number}> = new Map();

    constructor(container: HTMLElement, workspace: Workspace, noteCreationCallbacks?: NoteCreationCallbacks) {
        this.container = container;
        this.workspace = workspace;
        this.noteCreationCallbacks = noteCreationCallbacks;
        this.initializeSVG();
    }

    private initializeSVG() {
        // Clear any existing content
        d3.select(this.container).selectAll("*").remove();

        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        this.svg = d3.select(this.container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .style("max-width", "100%")
            .style("height", "auto");

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                this.currentTransform = event.transform;
                this.svg.select("g").attr("transform", event.transform);
            });

        this.svg.call(zoom);

        // Create main group for all graph elements
        this.svg.append("g");
    }

    render(graph: ZettelGraph) {
        const nodes: GraphNode[] = Array.from(graph.nodes.values()).map(zettel => {
            const node: GraphNode = {
                id: zettel.id,
                zettel: zettel
            };

            // Restore previous position if it exists
            const savedPosition = this.nodePositions.get(zettel.id);
            if (savedPosition) {
                node.x = savedPosition.x;
                node.y = savedPosition.y;
                node.fx = savedPosition.x; // Fix position initially
                node.fy = savedPosition.y;
            }

            return node;
        });

        const links: GraphLink[] = [];
        
        // Create links based on parent-child relationships
        for (const node of nodes) {
            for (const childId of node.zettel.children) {
                const childNode = nodes.find(n => n.id === childId);
                if (childNode) {
                    links.push({
                        source: node,
                        target: childNode,
                        type: childNode.zettel.type
                    });
                }
            }
        }

        this.renderGraph(nodes, links);
    }

    private renderGraph(nodes: GraphNode[], links: GraphLink[]) {
        const width = +this.svg.attr("width");
        const height = +this.svg.attr("height");

        // Clear previous graph but preserve transform
        this.svg.select("g").selectAll("*").remove();

        const g = this.svg.select("g");

        // Restore the previous transform state
        g.attr("transform", this.currentTransform.toString());

        // Create simulation
        this.simulation = d3.forceSimulation<GraphNode>(nodes)
            .force("link", d3.forceLink<GraphNode, GraphLink>(links)
                .id(d => d.id)
                .distance(100)
                .strength(0.8))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(30));

        // Create arrow markers for directed edges
        const defs = g.append("defs");
        
        defs.append("marker")
            .attr("id", "arrow-sequence")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 25)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#4a90e2");

        defs.append("marker")
            .attr("id", "arrow-branch")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 25)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#e74c3c");

        // Create links
        const link = g.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("class", d => `link link-${d.type}`)
            .attr("stroke", d => d.type === 'sequence' ? '#4a90e2' : '#e74c3c')
            .attr("stroke-width", d => d.type === 'sequence' ? 2 : 1.5)
            .attr("stroke-dasharray", d => d.type === 'branch' ? "5,5" : "none")
            .attr("marker-end", d => `url(#arrow-${d.type})`);

        // Create nodes
        const node = g.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(nodes)
            .enter().append("g")
            .attr("class", "node")
            .call(this.createDragBehavior());

        // Add node shapes
        node.append("circle")
            .attr("r", d => d.zettel.type === 'sequence' ? 20 : 15)
            .attr("fill", d => d.zettel.type === 'sequence' ? '#4a90e2' : '#e74c3c')
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        // Add node labels
        node.append("text")
            .attr("dy", 4)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "10px")
            .attr("font-weight", "bold")
            .text(d => d.zettel.number);

        // Add SVG-based hover buttons (alternative approach)
        this.addSVGHoverButtons(node);

        // Add title on hover
        node.append("title")
            .text(d => `${d.zettel.number}: ${d.zettel.title}`);

        // Add click handler to open files
        node.on("click", (_, d) => {
            this.workspace.getLeaf().openFile(d.zettel.file);
        });

        // Add right-click context menu
        node.on("contextmenu", (event, d) => {
            event.preventDefault();
            this.showContextMenu(event, d);
        });

        // HTML-based hover buttons are disabled in favor of SVG-based buttons
        // which are added in addSVGHoverButtons method

        // Update positions on simulation tick
        this.simulation.on("tick", () => {
            link
                .attr("x1", d => (d.source as GraphNode).x!)
                .attr("y1", d => (d.source as GraphNode).y!)
                .attr("x2", d => (d.target as GraphNode).x!)
                .attr("y2", d => (d.target as GraphNode).y!);

            node
                .attr("transform", d => {
                    // Save node positions for stability
                    if (d.x !== undefined && d.y !== undefined) {
                        this.nodePositions.set(d.id, { x: d.x, y: d.y });
                    }
                    return `translate(${d.x},${d.y})`;
                });
        });

        // Release fixed positions after initial stabilization
        setTimeout(() => {
            nodes.forEach(d => {
                d.fx = null;
                d.fy = null;
            });
        }, 1000);
    }

    private createDragBehavior() {
        return d3.drag<SVGGElement, GraphNode>()
            .on("start", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }



    private addSVGHoverButtons(nodeSelection: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>) {
        // Add button group that's initially hidden
        const buttonGroup = nodeSelection.append("g")
            .attr("class", "hover-buttons")
            .style("opacity", "0")
            .style("pointer-events", "none");

        // Sequential button (right side)
        const sequentialButton = buttonGroup.append("g")
            .attr("class", "sequential-button")
            .attr("transform", "translate(30, 0)")
            .style("cursor", "pointer");

        sequentialButton.append("circle")
            .attr("r", 12)
            .attr("fill", "var(--color-blue)")
            .attr("stroke", "white")
            .attr("stroke-width", 2);

        sequentialButton.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", 4)
            .attr("fill", "white")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .text("→");

        // Branch button (left side)
        const branchButton = buttonGroup.append("g")
            .attr("class", "branch-button")
            .attr("transform", "translate(-30, 0)")
            .style("cursor", "pointer");

        branchButton.append("circle")
            .attr("r", 12)
            .attr("fill", "var(--color-red)")
            .attr("stroke", "white")
            .attr("stroke-width", 2);

        branchButton.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", 4)
            .attr("fill", "white")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .text("⤴");

        // Show/hide buttons on hover - ensure only this node's buttons are shown
        nodeSelection.on("mouseenter.buttons", function() {
            // First, hide all other hover buttons to ensure only one set is visible
            d3.selectAll(".hover-buttons")
                .filter(function() { return this !== buttonGroup.node(); })
                .style("opacity", "0")
                .style("pointer-events", "none");

            // Then show this node's buttons
            buttonGroup
                .style("pointer-events", "auto")
                .transition()
                .duration(200)
                .style("opacity", "1");
        });

        nodeSelection.on("mouseleave.buttons", function(event) {
            // Only hide if not moving to the button group itself
            const relatedTarget = event.relatedTarget as Element;
            if (relatedTarget && buttonGroup.node()?.contains(relatedTarget)) {
                return; // Don't hide if moving to the buttons
            }

            buttonGroup
                .transition()
                .duration(200)
                .style("opacity", "0")
                .on("end", () => {
                    buttonGroup.style("pointer-events", "none");
                });
        });

        // Keep buttons visible when hovering over them
        buttonGroup.on("mouseenter", function() {
            d3.select(this)
                .style("pointer-events", "auto")
                .style("opacity", "1");
        });

        buttonGroup.on("mouseleave", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .style("opacity", "0")
                .on("end", () => {
                    d3.select(this).style("pointer-events", "none");
                });
        });

        // Add click handlers
        sequentialButton.on("click", (event, d) => {
            event.stopPropagation();
            if (this.noteCreationCallbacks) {
                this.noteCreationCallbacks.onCreateSequential(d.zettel);
            }
        });

        branchButton.on("click", (event, d) => {
            event.stopPropagation();
            if (this.noteCreationCallbacks) {
                this.noteCreationCallbacks.onCreateBranch(d.zettel);
            }
        });
    }

    private showContextMenu(event: MouseEvent, node: GraphNode) {
        // Remove any existing context menu
        this.hideContextMenu();

        const contextMenu = document.createElement('div');
        contextMenu.className = 'zettelkasten-context-menu';
        contextMenu.style.position = 'absolute';
        contextMenu.style.left = `${event.pageX}px`;
        contextMenu.style.top = `${event.pageY}px`;
        contextMenu.style.zIndex = '1000';

        // Delete option
        const deleteOption = document.createElement('div');
        deleteOption.className = 'zettelkasten-context-menu-item';
        deleteOption.textContent = 'Delete Note';
        deleteOption.style.cursor = 'pointer';

        deleteOption.addEventListener('click', async () => {
            this.hideContextMenu();
            if (this.noteCreationCallbacks?.onDeleteNote) {
                await this.noteCreationCallbacks.onDeleteNote(node.zettel);
            }
        });

        contextMenu.appendChild(deleteOption);
        document.body.appendChild(contextMenu);

        // Hide context menu when clicking elsewhere
        const hideOnClick = (e: MouseEvent) => {
            if (!contextMenu.contains(e.target as Node)) {
                this.hideContextMenu();
                document.removeEventListener('click', hideOnClick);
            }
        };

        // Use setTimeout to avoid immediate hiding due to the current click event
        setTimeout(() => {
            document.addEventListener('click', hideOnClick);
        }, 0);
    }

    private hideContextMenu() {
        const existingMenu = document.querySelector('.zettelkasten-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }

        // Clean up any existing HTML-based hover buttons (legacy cleanup)
        const existingButtons = document.querySelector('.zettelkasten-hover-buttons');
        if (existingButtons) {
            existingButtons.remove();
        }

        // Clean up context menu
        this.hideContextMenu();
    }
}
