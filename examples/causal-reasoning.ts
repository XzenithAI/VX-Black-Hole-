/**
 * Causal Reasoning Example
 *
 * Demonstrates causal inference, prediction, and explanation
 */

import { MindOS, ConceptType } from '../src';

async function causalReasoningExample() {
  console.log('🧠 VX Mind Layer - Causal Reasoning Example\n');

  const mind = new MindOS();

  console.log('1️⃣ Building causal model...\n');

  // Create concepts
  const rainId = mind.learn('rain', ConceptType.EVENT);
  const wetGroundId = mind.learn('wet_ground', ConceptType.STATE);
  const slipperyId = mind.learn('slippery', ConceptType.STATE);
  const fallId = mind.learn('fall', ConceptType.EVENT);

  // Create causal links
  const causal = mind['causal'];

  const link1 = causal.createLink(
    rainId,
    wetGroundId,
    0.9,
    0.8,
    0.9,
    'water accumulation'
  );

  const link2 = causal.createLink(
    wetGroundId,
    slipperyId,
    0.8,
    0.7,
    0.8,
    'reduced friction'
  );

  const link3 = causal.createLink(
    slipperyId,
    fallId,
    0.6,
    0.5,
    0.6,
    'loss of balance'
  );

  console.log('Causal chain: Rain → Wet Ground → Slippery → Fall\n');

  // Predict effects
  console.log('2️⃣ Predicting effects of rain...\n');

  const predictions = causal.predictEffect(rainId, 3);

  console.log(`Predictions (${predictions.length} found):`);
  for (const pred of predictions.slice(0, 5)) {
    console.log(`  - ${pred.explanation}`);
    console.log(`    Confidence: ${(pred.confidence * 100).toFixed(1)}%`);
  }

  // Explain an effect
  console.log('\n3️⃣ Explaining why falls occur...\n');

  const explanations = causal.explainEffect(fallId, 3);

  console.log(`Explanations (${explanations.length} found):`);
  for (const exp of explanations.slice(0, 3)) {
    console.log(`  - ${exp.explanation}`);
    console.log(`    Confidence: ${(exp.confidence * 100).toFixed(1)}%`);
  }

  // Intervention analysis
  console.log('\n4️⃣ Intervention: What if we prevent ground from getting wet?\n');

  const intervention = new Map([[wetGroundId, false]]);
  const outcome = causal.predictIntervention(intervention, fallId);

  if (outcome) {
    console.log(`Outcome: ${outcome.explanation}`);
    console.log(`Confidence: ${(outcome.confidence * 100).toFixed(1)}%`);
  } else {
    console.log(`No causal path found after intervention`);
  }

  // Counterfactual reasoning
  console.log('\n5️⃣ Counterfactual: What if it hadn\'t rained?\n');

  const actual = new Map([[rainId, true]]);
  const counterfactual = new Map([[rainId, false]]);

  const cf = causal.counterfactual(actual, counterfactual, fallId);

  console.log(`Actual scenario confidence: ${cf.actualOutcome ? (cf.actualOutcome.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log(`Counterfactual confidence: ${cf.counterfactualOutcome ? (cf.counterfactualOutcome.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log(`Difference: ${(cf.difference * 100).toFixed(1)}%`);

  console.log('\n✅ Causal reasoning example complete!');
}

// Run example
causalReasoningExample().catch(console.error);
