/**
 * Episodic Memory
 *
 * Stores experiences, events, and their sequences.
 * Remembers what happened, when, and in what context.
 */

import {
  EntityId,
  Episode,
  Event,
  Lesson,
  Context,
  TimeSpan,
  Concept,
} from '../foundation/types';
import {
  generateId,
  now,
  timeSince,
  calculateImportanceDecay,
  groupBy,
  topN,
} from '../foundation/utils';

export interface EpisodeQuery {
  timeSpan?: TimeSpan;
  containsConcepts?: EntityId[];
  hasOutcome?: boolean;
  minImportance?: number;
  emotionalValence?: { min?: number; max?: number };
  limit?: number;
}

export class EpisodicMemory {
  private episodes: Map<EntityId, Episode> = new Map();
  private events: Map<EntityId, Event> = new Map();

  // Indexes for fast retrieval
  private episodesByTimeRange: Episode[] = [];
  private eventsByConcept: Map<EntityId, Set<EntityId>> = new Map();
  private lessonsByType: Map<string, Lesson[]> = new Map();

  constructor() {}

  // ========================================================================
  // EPISODE OPERATIONS
  // ========================================================================

  /**
   * Create and store a new episode
   */
  createEpisode(
    description: string,
    events: Event[],
    context: Context,
    timeSpan: TimeSpan,
    outcome?: Concept,
    importance: number = 0.5,
    emotionalValence?: number
  ): Episode {
    const episode: Episode = {
      id: generateId('episode'),
      description,
      events,
      context,
      timeSpan,
      outcome,
      lessons: [],
      importance,
      emotionalValence,
    };

    this.storeEpisode(episode);

    // Store individual events
    for (const event of events) {
      this.storeEvent(event);
    }

    return episode;
  }

  /**
   * Store an episode
   */
  storeEpisode(episode: Episode): void {
    this.episodes.set(episode.id, episode);

    // Update time-based index (keep sorted)
    this.episodesByTimeRange.push(episode);
    this.episodesByTimeRange.sort((a, b) => a.timeSpan.start - b.timeSpan.start);
  }

  /**
   * Get episode by ID
   */
  getEpisode(id: EntityId): Episode | undefined {
    return this.episodes.get(id);
  }

  /**
   * Update episode with learned lessons
   */
  addLesson(episodeId: EntityId, lesson: Lesson): void {
    const episode = this.episodes.get(episodeId);
    if (!episode) return;

    episode.lessons.push(lesson);

    // Update lesson index
    if (!this.lessonsByType.has(lesson.type)) {
      this.lessonsByType.set(lesson.type, []);
    }
    this.lessonsByType.get(lesson.type)?.push(lesson);
  }

  /**
   * Delete an episode
   */
  deleteEpisode(id: EntityId): void {
    const episode = this.episodes.get(id);
    if (!episode) return;

    // Remove from time index
    this.episodesByTimeRange = this.episodesByTimeRange.filter(e => e.id !== id);

    // Remove events
    for (const event of episode.events) {
      this.deleteEvent(event.id);
    }

    this.episodes.delete(id);
  }

  // ========================================================================
  // EVENT OPERATIONS
  // ========================================================================

  /**
   * Create a new event
   */
  createEvent(
    type: string,
    timestamp: Timestamp,
    concepts: EntityId[],
    observed: boolean = true,
    causedBy?: EntityId[],
    causes?: EntityId[]
  ): Event {
    const event: Event = {
      id: generateId('event'),
      type,
      timestamp,
      concepts,
      observed,
      inferred: !observed,
      causedBy,
      causes,
    };

    this.storeEvent(event);
    return event;
  }

  /**
   * Store an event
   */
  storeEvent(event: Event): void {
    this.events.set(event.id, event);

    // Index by concepts
    for (const conceptId of event.concepts) {
      if (!this.eventsByConcept.has(conceptId)) {
        this.eventsByConcept.set(conceptId, new Set());
      }
      this.eventsByConcept.get(conceptId)?.add(event.id);
    }
  }

  /**
   * Get event by ID
   */
  getEvent(id: EntityId): Event | undefined {
    return this.events.get(id);
  }

  /**
   * Delete an event
   */
  deleteEvent(id: EntityId): void {
    const event = this.events.get(id);
    if (!event) return;

    // Remove from concept index
    for (const conceptId of event.concepts) {
      this.eventsByConcept.get(conceptId)?.delete(id);
    }

    this.events.delete(id);
  }

  // ========================================================================
  // QUERYING
  // ========================================================================

  /**
   * Query episodes by various criteria
   */
  queryEpisodes(query: EpisodeQuery): Episode[] {
    let results = Array.from(this.episodes.values());

    // Filter by time range
    if (query.timeSpan) {
      const { start, end } = query.timeSpan;
      results = results.filter(ep => {
        const epStart = ep.timeSpan.start;
        const epEnd = ep.timeSpan.end || now();
        return (
          (epStart >= start && (!end || epStart <= end)) ||
          (epEnd >= start && (!end || epEnd <= end))
        );
      });
    }

    // Filter by concepts
    if (query.containsConcepts && query.containsConcepts.length > 0) {
      results = results.filter(ep => {
        const episodeConcepts = new Set(
          ep.events.flatMap(e => e.concepts)
        );
        return query.containsConcepts!.some(c => episodeConcepts.has(c));
      });
    }

    // Filter by outcome
    if (query.hasOutcome !== undefined) {
      results = results.filter(ep =>
        query.hasOutcome ? ep.outcome !== undefined : ep.outcome === undefined
      );
    }

    // Filter by importance
    if (query.minImportance !== undefined) {
      results = results.filter(ep => ep.importance >= query.minImportance!);
    }

    // Filter by emotional valence
    if (query.emotionalValence) {
      const { min, max } = query.emotionalValence;
      results = results.filter(ep => {
        if (ep.emotionalValence === undefined) return false;
        if (min !== undefined && ep.emotionalValence < min) return false;
        if (max !== undefined && ep.emotionalValence > max) return false;
        return true;
      });
    }

    // Sort by importance and recency
    results.sort((a, b) => {
      const aAge = timeSince(a.timeSpan.start);
      const bAge = timeSince(b.timeSpan.start);
      const aScore = a.importance * calculateImportanceDecay(1, aAge);
      const bScore = b.importance * calculateImportanceDecay(1, bAge);
      return bScore - aScore;
    });

    // Apply limit
    return query.limit ? results.slice(0, query.limit) : results;
  }

  /**
   * Find episodes involving specific concepts
   */
  findEpisodesWithConcepts(conceptIds: EntityId[]): Episode[] {
    const episodeIds = new Set<EntityId>();

    for (const conceptId of conceptIds) {
      const eventIds = this.eventsByConcept.get(conceptId) || new Set();

      for (const eventId of eventIds) {
        const event = this.events.get(eventId);
        if (!event) continue;

        // Find which episode contains this event
        for (const [epId, episode] of this.episodes) {
          if (episode.events.some(e => e.id === eventId)) {
            episodeIds.add(epId);
          }
        }
      }
    }

    return Array.from(episodeIds)
      .map(id => this.episodes.get(id))
      .filter(ep => ep !== undefined) as Episode[];
  }

  /**
   * Get recent episodes
   */
  getRecentEpisodes(count: number = 10): Episode[] {
    return this.episodesByTimeRange
      .slice(-count)
      .reverse();
  }

  /**
   * Find similar episodes based on concepts and context
   */
  findSimilarEpisodes(targetEpisode: Episode, limit: number = 5): Episode[] {
    const targetConcepts = new Set(
      targetEpisode.events.flatMap(e => e.concepts)
    );

    const scored = Array.from(this.episodes.values())
      .filter(ep => ep.id !== targetEpisode.id)
      .map(ep => {
        const epConcepts = new Set(ep.events.flatMap(e => e.concepts));

        // Calculate concept overlap
        const intersection = new Set(
          [...targetConcepts].filter(c => epConcepts.has(c))
        );
        const union = new Set([...targetConcepts, ...epConcepts]);
        const similarity = intersection.size / union.size;

        return { episode: ep, score: similarity };
      })
      .filter(({ score }) => score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(({ episode }) => episode);
  }

  // ========================================================================
  // LESSONS & LEARNING
  // ========================================================================

  /**
   * Get all lessons of a specific type
   */
  getLessons(type?: string): Lesson[] {
    if (type) {
      return this.lessonsByType.get(type) || [];
    }

    // Return all lessons
    const allLessons: Lesson[] = [];
    for (const lessons of this.lessonsByType.values()) {
      allLessons.push(...lessons);
    }
    return allLessons;
  }

  /**
   * Find lessons that apply to a current situation
   */
  findApplicableLessons(
    currentConcepts: EntityId[],
    lessonType?: string
  ): Lesson[] {
    const lessons = this.getLessons(lessonType);
    const conceptSet = new Set(currentConcepts);

    // Find lessons from episodes containing similar concepts
    const applicable: Array<{ lesson: Lesson; relevance: number }> = [];

    for (const lesson of lessons) {
      // Find episodes containing this lesson
      for (const episode of this.episodes.values()) {
        if (!episode.lessons.some(l => l.id === lesson.id)) continue;

        const episodeConcepts = new Set(
          episode.events.flatMap(e => e.concepts)
        );

        const overlap = [...conceptSet].filter(c => episodeConcepts.has(c)).length;
        const relevance = overlap / Math.max(conceptSet.size, episodeConcepts.size);

        if (relevance > 0.3) {
          applicable.push({ lesson, relevance });
        }
      }
    }

    // Sort by relevance and applied count (prefer proven lessons)
    applicable.sort((a, b) => {
      const aScore = a.relevance * (1 + a.lesson.appliedCount * 0.1);
      const bScore = b.relevance * (1 + b.lesson.appliedCount * 0.1);
      return bScore - aScore;
    });

    return applicable.map(({ lesson }) => lesson);
  }

  /**
   * Record that a lesson was applied
   */
  applyLesson(lessonId: EntityId, successful: boolean): void {
    for (const episode of this.episodes.values()) {
      const lesson = episode.lessons.find(l => l.id === lessonId);
      if (lesson) {
        lesson.appliedCount++;
        if (successful) {
          lesson.confidence = Math.min(1, lesson.confidence + 0.1);
        } else {
          lesson.confidence = Math.max(0, lesson.confidence - 0.1);
        }
      }
    }
  }

  // ========================================================================
  // CONSOLIDATION
  // ========================================================================

  /**
   * Consolidate episodic memory (merge similar episodes, extract patterns)
   */
  consolidate(): void {
    // Group episodes by similarity
    const groups = this.findEpisodeClusters();

    for (const group of groups) {
      if (group.length < 2) continue;

      // Extract common patterns
      const commonConcepts = this.findCommonConcepts(group);
      const commonOutcome = this.findCommonOutcome(group);

      // Create a generalized lesson if pattern is strong
      if (commonConcepts.length > 0 && commonOutcome) {
        const lesson: Lesson = {
          id: generateId('lesson'),
          type: 'strategic',
          description: `Pattern: ${commonConcepts.length} common concepts lead to similar outcomes`,
          generalizes: true,
          confidence: 0.7,
          appliedCount: 0,
        };

        // Add lesson to all episodes in group
        for (const episode of group) {
          this.addLesson(episode.id, lesson);
        }
      }
    }
  }

  /**
   * Find clusters of similar episodes
   */
  private findEpisodeClusters(): Episode[][] {
    const episodes = Array.from(this.episodes.values());
    const clusters: Episode[][] = [];
    const assigned = new Set<EntityId>();

    for (const ep of episodes) {
      if (assigned.has(ep.id)) continue;

      const similar = this.findSimilarEpisodes(ep, 10);
      if (similar.length > 0) {
        const cluster = [ep, ...similar];
        clusters.push(cluster);
        cluster.forEach(e => assigned.add(e.id));
      }
    }

    return clusters;
  }

  /**
   * Find concepts common to a group of episodes
   */
  private findCommonConcepts(episodes: Episode[]): EntityId[] {
    if (episodes.length === 0) return [];

    const conceptCounts = new Map<EntityId, number>();

    for (const ep of episodes) {
      const concepts = new Set(ep.events.flatMap(e => e.concepts));
      for (const concept of concepts) {
        conceptCounts.set(concept, (conceptCounts.get(concept) || 0) + 1);
      }
    }

    // Return concepts that appear in at least 50% of episodes
    const threshold = episodes.length * 0.5;
    return Array.from(conceptCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([concept]) => concept);
  }

  /**
   * Find common outcome in a group of episodes
   */
  private findCommonOutcome(episodes: Episode[]): Concept | undefined {
    const withOutcomes = episodes.filter(ep => ep.outcome !== undefined);
    if (withOutcomes.length === 0) return undefined;

    // For simplicity, return the most common outcome type
    // In reality, would need more sophisticated comparison
    return withOutcomes[0].outcome;
  }

  // ========================================================================
  // STATS & MAINTENANCE
  // ========================================================================

  /**
   * Get statistics about episodic memory
   */
  getStats() {
    const totalEvents = this.events.size;
    const lessonCounts = Object.fromEntries(
      Array.from(this.lessonsByType.entries()).map(([type, lessons]) => [
        type,
        lessons.length,
      ])
    );

    return {
      episodeCount: this.episodes.size,
      eventCount: totalEvents,
      lessonCounts,
      avgEventsPerEpisode:
        this.episodes.size > 0
          ? totalEvents / this.episodes.size
          : 0,
    };
  }

  /**
   * Clear all episodic memory
   */
  clear(): void {
    this.episodes.clear();
    this.events.clear();
    this.episodesByTimeRange = [];
    this.eventsByConcept.clear();
    this.lessonsByType.clear();
  }
}
