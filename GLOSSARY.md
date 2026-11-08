# Recipe RAG

A recipe chatbot that answers cooking questions using only recipes it has retrieved from its own collection, built stage by stage as a way to learn retrieval-augmented generation.

## Recipes

**Recipe**:
One dish from the source collection: a title, category, ingredients, steps, the original time text, and a source URL.
_Avoid_: Document, item, entry

**Recipe Document**:
The single block of text produced from a Recipe that gets embedded. There is exactly one per Recipe.
_Avoid_: Chunk, text block, passage

**Enrichment**:
Metadata derived from a Recipe that the source data doesn't state cleanly, such as whether it is vegetarian or its total minutes.
_Avoid_: Tags, annotations

## Retrieval

**Embedding**:
The vector for a Recipe Document or a Query, always recorded together with the model that produced it.
_Avoid_: Vector (when the model is meant to be implied)

**Query**:
The search text sent to retrieval. It may differ from the user's literal message.
_Avoid_: Question (when the search text is meant), prompt

**Hit**:
One Recipe returned by retrieval for a Query, with its rank and score.
_Avoid_: Result, match

## Evaluation

**Eval Case**:
A test Query paired with its Expected Recipes, and optionally constraints that every Hit must satisfy.
_Avoid_: Test question, golden

**Expected Recipes**:
The 1–3 Recipes that must appear in the Hits for an Eval Case to count as fully retrieved.
_Avoid_: Ground truth, relevant set

**No-Answer Case**:
An Eval Case whose correct outcome is that the collection has nothing relevant. It has no Expected Recipes and is left out of recall.

**Recall@5**:
For one Eval Case, the share of its Expected Recipes that appear in the top 5 Hits. The reported score is the average over all cases.

**Hit@5**:
Whether at least one Expected Recipe appears in the top 5 Hits.

**Constraint Violation**:
A Hit that breaks a constraint stated in the Eval Case, such as a meat dish returned for a vegetarian query.

**Eval Run**:
One saved execution of the full Eval Case set against a specific retrieval configuration, labelled so it can be compared with earlier runs.
