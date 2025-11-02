/**
 * Foundation Layer: Core Types and Primitives
 *
 * The fundamental building blocks of the Mind OS.
 * Everything in the cognitive architecture builds on these primitives.
 */

// ============================================================================
// TIME & IDENTITY
// ============================================================================

/**
 * Unique identifier for any entity in the system
 */
export type EntityId = string;

/**
 * Timestamp in milliseconds since epoch
 */
export type Timestamp = number;

/**
 * Temporal span with start and optional end
 */
export interface TimeSpan {
  start: Timestamp;
  end?: Timestamp;
}

// ============================================================================
// CONCEPTS - Universal Knowledge Units
// ============================================================================

/**
 * A Concept is the fundamental unit of knowledge.
 * Everything the mind knows is represented as concepts and their relations.
 */
export interface Concept {
  id: EntityId;
  label: string;
  type: ConceptType;
  properties: Record<string, any>;
  created: Timestamp;
  lastAccessed: Timestamp;
  accessCount: number;
  importance: number; // 0-1, how central to understanding
  confidence: number; // 0-1, how certain we are about this
}

export enum ConceptType {
  // Ontological categories
  ENTITY = "entity",           // Things (person, place, object)
  EVENT = "event",             // Happenings (action, occurrence)
  STATE = "state",             // Conditions (being, having)
  RELATION = "relation",       // Connections (is-a, part-of, causes)
  PROPERTY = "property",       // Attributes (color, size, quality)
  PROCESS = "process",         // Transformations (change, evolution)

  // Abstract categories
  GOAL = "goal",               // Desired states or outcomes
  PLAN = "plan",               // Sequences of actions
  STRATEGY = "strategy",       // High-level approaches
  BELIEF = "belief",           // Propositions held as true
  RULE = "rule",               // If-then patterns
  PATTERN = "pattern",         // Recurring structures

  // Meta categories
  DOMAIN = "domain",           // Areas of knowledge
  CONTEXT = "context",         // Situations or frames
  PERSPECTIVE = "perspective", // Viewpoints or interpretations
}

// ============================================================================
// RELATIONS - Semantic Connections
// ============================================================================

/**
 * Relations connect concepts in meaningful ways.
 * The semantic network is a graph of concepts and relations.
 */
export interface Relation {
  id: EntityId;
  type: RelationType;
  from: EntityId;       // Source concept
  to: EntityId;         // Target concept
  strength: number;     // 0-1, how strong is this connection
  confidence: number;   // 0-1, how certain are we
  created: Timestamp;
  lastReinforced: Timestamp;
  evidence: EntityId[]; // Episodes that support this relation
}

export enum RelationType {
  // Hierarchical
  IS_A = "is_a",                 // Taxonomy (dog is_a animal)
  PART_OF = "part_of",           // Mereology (wheel part_of car)
  INSTANCE_OF = "instance_of",   // Instantiation (Fido instance_of dog)

  // Causal
  CAUSES = "causes",             // Causation (fire causes heat)
  ENABLES = "enables",           // Enablement (key enables opening)
  PREVENTS = "prevents",         // Prevention (lock prevents opening)

  // Temporal
  BEFORE = "before",             // Temporal ordering
  AFTER = "after",
  DURING = "during",

  // Functional
  HAS_PROPERTY = "has_property", // Attribution (sky has_property blue)
  HAS_GOAL = "has_goal",         // Purpose (agent has_goal survive)
  USES = "uses",                 // Instrumental (carpenter uses hammer)
  PRODUCES = "produces",         // Generation (factory produces cars)

  // Semantic
  SIMILAR_TO = "similar_to",     // Similarity
  OPPOSITE_OF = "opposite_of",   // Contrast
  RELATED_TO = "related_to",     // General association
  IMPLIES = "implies",           // Logical implication

  // Structural
  CONTAINS = "contains",         // Container relationship
  LOCATED_AT = "located_at",     // Spatial relationship
  HAS_MEMBER = "has_member",     // Group membership
}

// ============================================================================
// CONTEXT - Situational Awareness
// ============================================================================

/**
 * Context represents the current situation, framing how concepts are interpreted
 */
export interface Context {
  id: EntityId;
  label: string;
  activeConcepts: Set<EntityId>;    // Currently relevant concepts
  salience: Map<EntityId, number>;  // How relevant each concept is (0-1)
  constraints: Constraint[];         // Contextual constraints
  temporalWindow: TimeSpan;          // Time frame of relevance
  parentContext?: EntityId;          // Broader context this is part of
  metadata: Record<string, any>;
}

export interface Constraint {
  type: "must_include" | "must_exclude" | "prefer" | "avoid";
  target: EntityId | EntityId[];
  strength: number; // 0-1
}

// ============================================================================
// INTENT & GOALS
// ============================================================================

/**
 * Intent represents purpose - what the mind is trying to achieve
 */
export interface Intent {
  id: EntityId;
  description: string;
  goalType: GoalType;
  desiredState: Partial<Concept>;    // What we want to be true
  currentState?: Partial<Concept>;   // What is currently true
  priority: number;                   // 0-1, how important
  urgency: number;                    // 0-1, how time-sensitive
  deadline?: Timestamp;
  created: Timestamp;
  status: IntentStatus;
}

export enum GoalType {
  ACHIEVE = "achieve",         // Make something true
  MAINTAIN = "maintain",       // Keep something true
  AVOID = "avoid",            // Prevent something
  EXPLORE = "explore",        // Discover information
  UNDERSTAND = "understand",   // Build causal model
  CREATE = "create",          // Bring into existence
  OPTIMIZE = "optimize",      // Improve a metric
}

export enum IntentStatus {
  FORMING = "forming",           // Still being clarified
  PLANNED = "planned",           // Plan exists but not started
  IN_PROGRESS = "in_progress",   // Actively pursuing
  PAUSED = "paused",             // Temporarily suspended
  COMPLETED = "completed",       // Successfully achieved
  FAILED = "failed",             // Could not achieve
  ABANDONED = "abandoned",       // Gave up deliberately
}

/**
 * Goals are structured intents with plans and tracking
 */
export interface Goal {
  id: EntityId;
  intent: Intent;
  parentGoal?: EntityId;         // Goals form hierarchies
  subGoals: EntityId[];
  plan?: Plan;
  progress: number;              // 0-1
  estimatedCompletion?: Timestamp;
  blockers: Blocker[];
  history: GoalEvent[];
}

export interface Plan {
  id: EntityId;
  steps: PlanStep[];
  alternatives: Plan[];          // Backup plans
  estimatedCost: number;         // Resources needed
  expectedOutcome: Concept;
  contingencies: Contingency[];
}

export interface PlanStep {
  id: EntityId;
  action: string;
  preconditions: Concept[];      // Must be true before
  effects: CausalEffect[];       // What this causes
  cost: number;
  duration: number;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface CausalEffect {
  target: EntityId;
  change: "increase" | "decrease" | "create" | "destroy" | "transform";
  magnitude: number;
  confidence: number;
}

export interface Contingency {
  condition: Concept;            // If this becomes true
  response: Plan;                // Execute this plan
}

export interface Blocker {
  id: EntityId;
  description: string;
  severity: number;              // 0-1
  resolutionApproach?: string;
}

export interface GoalEvent {
  timestamp: Timestamp;
  type: "created" | "progressed" | "blocked" | "completed" | "failed" | "modified";
  details: string;
  context?: Context;
}

// ============================================================================
// CAUSAL STRUCTURES
// ============================================================================

/**
 * Causal links represent cause-effect relationships with mechanisms
 */
export interface CausalLink {
  id: EntityId;
  cause: EntityId;
  effect: EntityId;
  mechanism?: string;            // How the cause produces the effect
  necessity: number;             // 0-1, how necessary is cause for effect
  sufficiency: number;           // 0-1, how sufficient is cause for effect
  timeDelay: number;             // Milliseconds between cause and effect
  conditions: Concept[];         // Required context
  strength: number;              // 0-1, magnitude of causal influence
  evidence: Evidence[];
}

/**
 * Evidence supports or contradicts beliefs and causal models
 */
export interface Evidence {
  id: EntityId;
  type: "observation" | "experiment" | "testimony" | "inference";
  data: any;
  source: string;
  reliability: number;           // 0-1
  timestamp: Timestamp;
  supportsHypothesis?: EntityId;
  contradictsHypothesis?: EntityId;
}

/**
 * Causal graphs represent networks of causation
 */
export interface CausalGraph {
  id: EntityId;
  nodes: Map<EntityId, Concept>;
  edges: Map<EntityId, CausalLink>;
  domain: string;
  confidence: number;
  created: Timestamp;
  lastUpdated: Timestamp;
}

// ============================================================================
// MEMORY STRUCTURES
// ============================================================================

/**
 * Episode: A sequence of events with causal structure
 */
export interface Episode {
  id: EntityId;
  description: string;
  events: Event[];
  context: Context;
  timeSpan: TimeSpan;
  outcome?: Concept;
  lessons: Lesson[];             // What was learned
  importance: number;
  emotionalValence?: number;     // -1 to 1 (negative to positive)
}

export interface Event {
  id: EntityId;
  type: string;
  timestamp: Timestamp;
  concepts: EntityId[];
  causedBy?: EntityId[];         // Previous events that caused this
  causes?: EntityId[];           // Events this causes
  observed: boolean;
  inferred: boolean;
}

export interface Lesson {
  id: EntityId;
  type: "causal" | "strategic" | "tactical" | "factual";
  description: string;
  generalizes: boolean;          // Can this apply to other situations?
  confidence: number;
  appliedCount: number;          // How many times successfully applied
}

/**
 * Working memory: What's currently in focus
 */
export interface WorkingMemory {
  focus: Set<EntityId>;          // Concepts currently attended to
  context: Context;
  activeGoals: EntityId[];
  reasoning: ReasoningTrace;
  capacity: number;              // Max items that can be held
}

export interface ReasoningTrace {
  steps: ReasoningStep[];
  currentHypotheses: Hypothesis[];
}

export interface ReasoningStep {
  timestamp: Timestamp;
  type: "observe" | "infer" | "recall" | "predict" | "evaluate" | "decide";
  input: EntityId[];
  output: EntityId[];
  reasoning: string;
}

export interface Hypothesis {
  id: EntityId;
  proposition: Concept;
  prior: number;                 // Initial confidence
  posterior: number;             // Updated confidence after evidence
  evidence: Evidence[];
  alternatives: Hypothesis[];    // Competing hypotheses
}

// ============================================================================
// PERFORMANCE & REFLECTION
// ============================================================================

/**
 * Performance metrics for self-evaluation
 */
export interface PerformanceMetrics {
  timestamp: Timestamp;
  goalsAchieved: number;
  goalsFailed: number;
  avgGoalCompletionTime: number;
  accuracyRate: number;          // Predictions correct / total
  efficiencyRate: number;        // Resources used / optimal
  learningRate: number;          // Improvement over time
  adaptability: number;          // Success in novel situations
}

/**
 * Reflection captures meta-cognitive analysis
 */
export interface Reflection {
  id: EntityId;
  timestamp: Timestamp;
  trigger: "scheduled" | "failure" | "success" | "anomaly" | "request";
  focus: "performance" | "knowledge" | "strategy" | "goals";
  observations: string[];
  insights: Insight[];
  actionItems: ActionItem[];
}

export interface Insight {
  id: EntityId;
  description: string;
  type: "bias" | "gap" | "strength" | "weakness" | "pattern" | "opportunity";
  importance: number;
  actionable: boolean;
}

export interface ActionItem {
  id: EntityId;
  description: string;
  priority: number;
  category: "learn" | "practice" | "avoid" | "explore" | "optimize";
  deadline?: Timestamp;
  completed: boolean;
}

// ============================================================================
// MESSAGE PASSING (Inter-Component Communication)
// ============================================================================

/**
 * Messages are how components communicate
 */
export interface Message {
  id: EntityId;
  from: string;                  // Component name
  to: string | string[];         // Recipient(s)
  type: MessageType;
  payload: any;
  timestamp: Timestamp;
  priority: number;
  requiresResponse: boolean;
  responseToId?: EntityId;
}

export enum MessageType {
  // Queries
  QUERY_MEMORY = "query_memory",
  QUERY_CAUSAL = "query_causal",
  QUERY_GOALS = "query_goals",

  // Updates
  UPDATE_CONTEXT = "update_context",
  UPDATE_GOAL = "update_goal",
  UPDATE_BELIEF = "update_belief",

  // Commands
  CREATE_GOAL = "create_goal",
  EXECUTE_PLAN = "execute_plan",
  TRIGGER_REFLECTION = "trigger_reflection",

  // Notifications
  GOAL_COMPLETED = "goal_completed",
  ANOMALY_DETECTED = "anomaly_detected",
  INSIGHT_DISCOVERED = "insight_discovered",

  // Responses
  RESPONSE = "response",
  ERROR = "error",
}

// ============================================================================
// EXPORTS
// ============================================================================

export * from './types';
