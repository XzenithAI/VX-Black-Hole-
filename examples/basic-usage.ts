/**
 * Basic Usage Example
 *
 * Demonstrates fundamental Mind OS capabilities
 */

import { MindOS, ConceptType, GoalType } from '../src';

async function basicExample() {
  console.log('🚀 VX Mind Layer - Basic Usage Example\n');

  // Initialize Mind OS
  const mind = new MindOS({
    workingMemoryCapacity: 7,
    reflectionInterval: 5000, // 5 seconds for demo
    maxConcurrentGoals: 3,
  });

  console.log('1️⃣ Creating concepts...\n');

  // Create some concepts
  const dogId = mind.learn('dog', ConceptType.ENTITY, {
    category: 'animal',
    hasLegs: 4,
    canBark: true,
  });

  const catId = mind.learn('cat', ConceptType.ENTITY, {
    category: 'animal',
    hasLegs: 4,
    meows: true,
  });

  const animalId = mind.learn('animal', ConceptType.ENTITY, {
    category: 'living_thing',
  });

  console.log(`Created concepts: dog, cat, animal\n`);

  // Establish relationships
  mind['memory'].semantic.createRelation(
    'is_a' as any,
    dogId,
    animalId,
    0.9
  );

  mind['memory'].semantic.createRelation(
    'is_a' as any,
    catId,
    animalId,
    0.9
  );

  console.log(`2️⃣ Establishing relationships...\n`);
  console.log(`Dog IS_A Animal`);
  console.log(`Cat IS_A Animal\n`);

  // Create a goal
  console.log(`3️⃣ Creating goal...\n`);

  const goalId = mind.createGoal(
    'Understand the concept of animals',
    GoalType.UNDERSTAND,
    0.8,
    0.6
  );

  console.log(`Goal created: Understand the concept of animals\n`);

  // Focus on concepts
  console.log(`4️⃣ Focusing attention...\n`);
  mind.focus(dogId);
  mind.focus(catId);

  // Understand a concept
  console.log(`5️⃣ Understanding concepts...\n`);

  const understanding = mind.understand(dogId);
  if (understanding) {
    console.log(`Understanding of "dog":`);
    console.log(`  Meaning: ${understanding.meaning}`);
    console.log(`  Related concepts: ${understanding.relatedConcepts.length}`);
    console.log(`  Analogies: ${understanding.analogies.length}\n`);
  }

  // Get current state
  console.log(`6️⃣ Mind state:\n`);
  const state = mind.getState();
  console.log(`  Cycle count: ${state.cycleCount}`);
  console.log(`  Current focus: ${state.currentFocus.length} concepts`);
  console.log(`  Active goals: ${state.activeGoals.length}`);
  console.log(`  Cognitive load: ${(state.cognitiveLoad * 100).toFixed(1)}%\n`);

  // Start consciousness loop for a few cycles
  console.log(`7️⃣ Starting consciousness loop...\n`);

  setTimeout(() => {
    mind.stop();

    console.log(`\n8️⃣ Final statistics:\n`);
    const stats = mind.getStats();
    console.log(`Memory:`, stats.memory);
    console.log(`Goals:`, stats.goals);
    console.log(`Performance:`, stats.performance);

    console.log(`\n✅ Basic example complete!`);
  }, 2000);

  await mind.start();
}

// Run example
basicExample().catch(console.error);
