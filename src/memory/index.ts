/**
 * Memory System
 *
 * Unified memory architecture with semantic, episodic, and working memory.
 */

export { SemanticMemory, SemanticQuery } from './SemanticMemory';
export { EpisodicMemory, EpisodeQuery } from './EpisodicMemory';
export { WorkingMemory } from './WorkingMemory';

import { SemanticMemory } from './SemanticMemory';
import { EpisodicMemory } from './EpisodicMemory';
import { WorkingMemory } from './WorkingMemory';

/**
 * Integrated Memory System
 *
 * Coordinates all three types of memory for coherent recall and learning.
 */
export class MemorySystem {
  public semantic: SemanticMemory;
  public episodic: EpisodicMemory;
  public working: WorkingMemory;

  constructor(workingMemoryCapacity: number = 7) {
    this.semantic = new SemanticMemory();
    this.episodic = new EpisodicMemory();
    this.working = new WorkingMemory(workingMemoryCapacity);
  }

  /**
   * Perform maintenance on all memory systems
   */
  performMaintenance(): void {
    this.semantic.performMaintenance();
    this.episodic.consolidate();
    this.working.decaySalience();
  }

  /**
   * Get statistics across all memory systems
   */
  getStats() {
    return {
      semantic: this.semantic.getStats(),
      episodic: this.episodic.getStats(),
      working: this.working.getStats(),
    };
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.semantic.clear();
    this.episodic.clear();
    this.working.reset();
  }
}
