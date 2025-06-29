import * as d3 from 'd3';
import { ZettelNode, ZettelGraph } from './zettelkasten-parser';
import { TFile, Workspace } from 'obsidian';

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

export class GraphRenderer {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private simulation: d3.Simulation<GraphNode, GraphLink>;
    private workspace: Workspace;
    private container: HTMLElement;

    constructor(container: HTMLElement, workspace: Workspace) {
        this.container = container;
        this.workspace = workspace;
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
                this.svg.select("g").attr("transform", event.transform);
            });

        this.svg.call(zoom);

        // Create main group for all graph elements
        this.svg.append("g");
    }

    render(graph: ZettelGraph) {
        const nodes: GraphNode[] = Array.from(graph.nodes.values()).map(zettel => ({
            id: zettel.id,
            zettel: zettel
        }));

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

        // Clear previous graph
        this.svg.select("g").selectAll("*").remove();

        const g = this.svg.select("g");

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

        // Add title on hover
        node.append("title")
            .text(d => `${d.zettel.number}: ${d.zettel.title}`);

        // Add click handler to open files
        node.on("click", (event, d) => {
            this.workspace.getLeaf().openFile(d.zettel.file);
        });

        // Update positions on simulation tick
        this.simulation.on("tick", () => {
            link
                .attr("x1", d => (d.source as GraphNode).x!)
                .attr("y1", d => (d.source as GraphNode).y!)
                .attr("x2", d => (d.target as GraphNode).x!)
                .attr("y2", d => (d.target as GraphNode).y!);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });
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

    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
    }
}
