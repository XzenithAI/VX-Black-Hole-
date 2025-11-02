/**
 * Goal Planning Example
 *
 * Demonstrates autonomous goal-directed behavior
 */

import { MindOS, GoalType, IntentStatus } from '../src';

async function goalPlanningExample() {
  console.log('🎯 VX Mind Layer - Goal Planning Example\n');

  const mind = new MindOS({
    maxConcurrentGoals: 5,
  });

  console.log('1️⃣ Creating goal hierarchy...\n');

  // Create top-level strategic goal
  const strategicGoalId = mind.createGoal(
    'Master artificial intelligence',
    GoalType.ACHIEVE,
    0.9, // high priority
    0.5  // medium urgency
  );

  console.log(`Strategic goal: Master artificial intelligence`);

  // Create sub-goals
  const goals = mind['goals'];

  const learningGoal = goals.createIntent(
    'Learn machine learning fundamentals',
    GoalType.ACHIEVE,
    {},
    0.8,
    0.7
  );

  const learningGoalId = goals.createGoal(learningGoal, strategicGoalId);

  const practiceGoal = goals.createIntent(
    'Practice implementing ML models',
    GoalType.ACHIEVE,
    {},
    0.7,
    0.6
  );

  const practiceGoalId = goals.createGoal(practiceGoal, strategicGoalId);

  console.log(`  Sub-goal 1: Learn machine learning fundamentals`);
  console.log(`  Sub-goal 2: Practice implementing ML models\n`);

  // Create plans
  console.log('2️⃣ Creating execution plans...\n');

  const plan1 = goals.createPlan(learningGoalId.id);
  const plan2 = goals.createPlan(practiceGoalId.id);

  if (plan1) {
    console.log(`Plan for learning goal:`);
    console.log(`  Steps: ${plan1.steps.length}`);
    console.log(`  Estimated cost: ${plan1.estimatedCost}`);
  }

  if (plan2) {
    console.log(`Plan for practice goal:`);
    console.log(`  Steps: ${plan2.steps.length}`);
    console.log(`  Estimated cost: ${plan2.estimatedCost}\n`);
  }

  // Simulate progress
  console.log('3️⃣ Simulating progress...\n');

  goals.updateProgress(learningGoalId.id, 0.3);
  console.log(`Learning goal: 30% complete`);

  goals.updateProgress(practiceGoalId.id, 0.1);
  console.log(`Practice goal: 10% complete\n`);

  // Add a blocker
  console.log('4️⃣ Encountering blocker...\n');

  goals.addBlocker(practiceGoalId.id, {
    id: 'blocker-1',
    description: 'Need to complete learning before practicing',
    severity: 0.8,
    resolutionApproach: 'Complete learning goal first',
  });

  console.log(`Blocker added to practice goal`);
  console.log(`  Reason: Need to complete learning first\n`);

  // Query goals
  console.log('5️⃣ Querying goals...\n');

  const activeGoals = goals.queryGoals({
    status: [IntentStatus.PLANNED, IntentStatus.IN_PROGRESS],
  });

  console.log(`Active goals: ${activeGoals.length}`);

  const topLevelGoals = goals.getTopLevelGoals();
  console.log(`Top-level goals: ${topLevelGoals.length}\n`);

  // Statistics
  console.log('6️⃣ Goal system statistics:\n');
  const stats = goals.getStats();
  console.log(`  Total goals: ${stats.goalCount}`);
  console.log(`  By status:`, stats.goalsByStatus);
  console.log(`  By type:`, stats.goalsByType);

  console.log('\n✅ Goal planning example complete!');
}

// Run example
goalPlanningExample().catch(console.error);
