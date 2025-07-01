import * as d3 from 'd3';

export interface AnimationConfig {
    duration: number;
    easing: string;
    delay?: number;
}

export interface NodePosition {
    x: number;
    y: number;
}

export interface AnimationTarget {
    element: d3.Selection<any, any, any, any>;
    startPosition: NodePosition;
    endPosition: NodePosition;
    config: AnimationConfig;
}

export class AnimationSystem {
    private activeAnimations: Map<string, d3.Transition<any, any, any, any>> = new Map();
    private defaultConfig: AnimationConfig = {
        duration: 500,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        delay: 0
    };

    /**
     * Animate node movement with smooth transitions
     */
    animateNodeMovement(
        nodeSelection: d3.Selection<SVGGElement, any, any, any>,
        targetPosition: NodePosition,
        config: Partial<AnimationConfig> = {}
    ): Promise<void> {
        const finalConfig = { ...this.defaultConfig, ...config };
        const nodeId = nodeSelection.datum()?.id || Math.random().toString();

        return new Promise((resolve) => {
            // Cancel any existing animation for this node
            this.cancelAnimation(nodeId);

            // Create transition
            const transition = nodeSelection
                .transition()
                .duration(finalConfig.duration)
                .delay(finalConfig.delay || 0)
                .ease(d3.easeCubicInOut);

            // Store active animation
            this.activeAnimations.set(nodeId, transition);

            // Animate transform
            transition
                .attr('transform', `translate(${targetPosition.x}, ${targetPosition.y})`)
                .on('end', () => {
                    this.activeAnimations.delete(nodeId);
                    resolve();
                });
        });
    }

    /**
     * Animate node scaling for emphasis
     */
    animateNodeScale(
        nodeSelection: d3.Selection<SVGGElement, any, any, any>,
        scale: number,
        config: Partial<AnimationConfig> = {}
    ): Promise<void> {
        const finalConfig = { ...this.defaultConfig, ...config };
        const nodeId = `scale-${nodeSelection.datum()?.id || Math.random()}`;

        return new Promise((resolve) => {
            const transition = nodeSelection
                .select('circle')
                .transition()
                .duration(finalConfig.duration)
                .delay(finalConfig.delay || 0)
                .ease(d3.easeCubicInOut);

            this.activeAnimations.set(nodeId, transition);

            transition
                .attr('transform', `scale(${scale})`)
                .on('end', () => {
                    this.activeAnimations.delete(nodeId);
                    resolve();
                });
        });
    }

    /**
     * Animate node color change
     */
    animateNodeColor(
        nodeSelection: d3.Selection<SVGGElement, any, any, any>,
        targetColor: string,
        config: Partial<AnimationConfig> = {}
    ): Promise<void> {
        const finalConfig = { ...this.defaultConfig, ...config };
        const nodeId = `color-${nodeSelection.datum()?.id || Math.random()}`;

        return new Promise((resolve) => {
            const transition = nodeSelection
                .select('circle')
                .transition()
                .duration(finalConfig.duration)
                .delay(finalConfig.delay || 0)
                .ease(d3.easeCubicInOut);

            this.activeAnimations.set(nodeId, transition);

            transition
                .attr('fill', targetColor)
                .on('end', () => {
                    this.activeAnimations.delete(nodeId);
                    resolve();
                });
        });
    }

    /**
     * Animate text change (for renumbering)
     */
    animateTextChange(
        textSelection: d3.Selection<SVGTextElement, any, any, any>,
        newText: string,
        config: Partial<AnimationConfig> = {}
    ): Promise<void> {
        const finalConfig = { ...this.defaultConfig, ...config };
        const textId = `text-${Math.random()}`;

        return new Promise((resolve) => {
            // First phase: scale down and fade out
            const fadeOut = textSelection
                .transition()
                .duration(finalConfig.duration / 2)
                .ease(d3.easeCubicInOut);

            this.activeAnimations.set(textId, fadeOut);

            fadeOut
                .attr('transform', 'scale(0.8)')
                .style('opacity', 0)
                .on('end', () => {
                    // Update text content
                    textSelection.text(newText);

                    // Second phase: scale up and fade in
                    const fadeIn = textSelection
                        .transition()
                        .duration(finalConfig.duration / 2)
                        .ease(d3.easeCubicInOut);

                    fadeIn
                        .attr('transform', 'scale(1)')
                        .style('opacity', 1)
                        .on('end', () => {
                            this.activeAnimations.delete(textId);
                            resolve();
                        });
                });
        });
    }

    /**
     * Animate link creation/update
     */
    animateLinkChange(
        linkSelection: d3.Selection<SVGLineElement, any, any, any>,
        startPos: NodePosition,
        endPos: NodePosition,
        config: Partial<AnimationConfig> = {}
    ): Promise<void> {
        const finalConfig = { ...this.defaultConfig, ...config };
        const linkId = `link-${Math.random()}`;

        return new Promise((resolve) => {
            // Start from the start position
            linkSelection
                .attr('x1', startPos.x)
                .attr('y1', startPos.y)
                .attr('x2', startPos.x)
                .attr('y2', startPos.y)
                .style('opacity', 0);

            const transition = linkSelection
                .transition()
                .duration(finalConfig.duration)
                .delay(finalConfig.delay || 0)
                .ease(d3.easeCubicInOut);

            this.activeAnimations.set(linkId, transition);

            transition
                .attr('x2', endPos.x)
                .attr('y2', endPos.y)
                .style('opacity', 1)
                .on('end', () => {
                    this.activeAnimations.delete(linkId);
                    resolve();
                });
        });
    }

    /**
     * Create a pulsing animation for emphasis
     */
    createPulseAnimation(
        selection: d3.Selection<any, any, any, any>,
        config: Partial<AnimationConfig> = {}
    ): void {
        const finalConfig = { ...this.defaultConfig, ...config };
        const pulseId = `pulse-${Math.random()}`;

        const pulse = () => {
            const transition = selection
                .transition()
                .duration(finalConfig.duration)
                .ease(d3.easeSinInOut);

            this.activeAnimations.set(pulseId, transition);

            transition
                .attr('transform', 'scale(1.1)')
                .transition()
                .duration(finalConfig.duration)
                .attr('transform', 'scale(1)')
                .on('end', () => {
                    // Continue pulsing
                    if (this.activeAnimations.has(pulseId)) {
                        pulse();
                    }
                });
        };

        pulse();
    }

    /**
     * Stop pulsing animation
     */
    stopPulseAnimation(pulseId: string): void {
        const animation = this.activeAnimations.get(pulseId);
        if (animation) {
            // Use d3.interrupt to stop the transition
            animation.each(function() {
                d3.interrupt(this);
            });
            this.activeAnimations.delete(pulseId);
        }
    }

    /**
     * Animate graph layout changes
     */
    animateLayoutChange(
        nodeSelection: d3.Selection<SVGGElement, any, any, any>,
        linkSelection: d3.Selection<SVGLineElement, any, any, any>,
        config: Partial<AnimationConfig> = {}
    ): Promise<void> {
        const finalConfig = { ...this.defaultConfig, ...config };

        return new Promise((resolve) => {
            let completedAnimations = 0;
            const totalAnimations = nodeSelection.size() + linkSelection.size();

            const checkCompletion = () => {
                completedAnimations++;
                if (completedAnimations >= totalAnimations) {
                    resolve();
                }
            };

            // Animate nodes
            nodeSelection.each(function(d: any) {
                const node = d3.select(this);
                const transition = node
                    .transition()
                    .duration(finalConfig.duration)
                    .delay(finalConfig.delay || 0)
                    .ease(d3.easeCubicInOut);

                transition
                    .attr('transform', `translate(${d.x}, ${d.y})`)
                    .on('end', checkCompletion);
            });

            // Animate links
            linkSelection.each(function(linkData: any) {
                const link = d3.select(this);
                const transition = link
                    .transition()
                    .duration(finalConfig.duration)
                    .delay(finalConfig.delay || 0)
                    .ease(d3.easeCubicInOut);

                transition
                    .attr('x1', linkData.source.x)
                    .attr('y1', linkData.source.y)
                    .attr('x2', linkData.target.x)
                    .attr('y2', linkData.target.y)
                    .on('end', checkCompletion);
            });

            // Handle case where there are no elements to animate
            if (totalAnimations === 0) {
                resolve();
            }
        });
    }

    /**
     * Create entrance animation for new nodes
     */
    animateNodeEntrance(
        nodeSelection: d3.Selection<SVGGElement, any, any, any>,
        config: Partial<AnimationConfig> = {}
    ): Promise<void> {
        const finalConfig = { ...this.defaultConfig, ...config };

        return new Promise((resolve) => {
            // Start with nodes invisible and scaled down
            nodeSelection
                .style('opacity', 0)
                .attr('transform', (d: any) => `translate(${d.x}, ${d.y}) scale(0)`);

            const transition = nodeSelection
                .transition()
                .duration(finalConfig.duration)
                .delay((_, i) => (finalConfig.delay || 0) + i * 50) // Stagger entrance
                .ease(d3.easeBackOut);

            transition
                .style('opacity', 1)
                .attr('transform', (d: any) => `translate(${d.x}, ${d.y}) scale(1)`)
                .on('end', (_, i, nodes) => {
                    // Resolve when last animation completes
                    if (i === nodes.length - 1) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Create exit animation for removed nodes
     */
    animateNodeExit(
        nodeSelection: d3.Selection<SVGGElement, any, any, any>,
        config: Partial<AnimationConfig> = {}
    ): Promise<void> {
        const finalConfig = { ...this.defaultConfig, ...config };

        return new Promise((resolve) => {
            const transition = nodeSelection
                .transition()
                .duration(finalConfig.duration)
                .delay(finalConfig.delay || 0)
                .ease(d3.easeBackIn);

            transition
                .style('opacity', 0)
                .attr('transform', (d: any) => `translate(${d.x}, ${d.y}) scale(0)`)
                .on('end', (_, i, nodes) => {
                    // Remove nodes after animation
                    d3.select(nodes[i]).remove();

                    // Resolve when last animation completes
                    if (i === nodes.length - 1) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Cancel a specific animation
     */
    cancelAnimation(animationId: string): void {
        const animation = this.activeAnimations.get(animationId);
        if (animation) {
            // Use d3.interrupt to stop the transition
            animation.each(function() {
                d3.interrupt(this);
            });
            this.activeAnimations.delete(animationId);
        }
    }

    /**
     * Cancel all active animations
     */
    cancelAllAnimations(): void {
        this.activeAnimations.forEach((animation) => {
            // Use d3.interrupt to stop the transition
            animation.each(function() {
                d3.interrupt(this);
            });
        });
        this.activeAnimations.clear();
    }

    /**
     * Get the number of active animations
     */
    getActiveAnimationCount(): number {
        return this.activeAnimations.size;
    }

    /**
     * Check if any animations are currently running
     */
    hasActiveAnimations(): boolean {
        return this.activeAnimations.size > 0;
    }

    /**
     * Create a custom easing function
     */
    static createCustomEasing(controlPoints: [number, number, number, number]): (t: number) => number {
        // In a real implementation, would use controlPoints to create cubic bezier
        // For now, return a standard easing function
        void controlPoints; // Suppress unused parameter warning
        return d3.easeCubic;
    }

    /**
     * Batch multiple animations to run simultaneously
     */
    async runAnimationBatch(animations: (() => Promise<void>)[]): Promise<void> {
        await Promise.all(animations.map(animation => animation()));
    }

    /**
     * Run animations in sequence
     */
    async runAnimationSequence(animations: (() => Promise<void>)[]): Promise<void> {
        for (const animation of animations) {
            await animation();
        }
    }
}
