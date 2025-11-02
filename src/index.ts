/**
 * VX Mind Layer - The First True Mind OS
 *
 * Integrated cognitive architecture with:
 * - Causal reasoning
 * - Autonomous goals
 * - Continuous memory
 * - Self-reflection
 * - Cross-domain composition
 *
 * @module vx-mind-layer
 */

// Foundation
export * from './foundation';

// Memory
export * from './memory';

// Reasoning
export * from './reasoning';

// Goals
export * from './goals';

// Reflection
export * from './reflection';

// Semantic
export * from './semantic';

// Composer
export * from './composer';

// Orchestrator
export * from './orchestrator';

// Learning
export * from './learning';

// Main export
import { MindOS } from './orchestrator';
export { MindOS };
export default MindOS;
