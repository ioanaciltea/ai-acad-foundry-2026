1. 1536
2. 0.2139
Low Relevance: Because the query is off-topic, a low score (like 0.2139 on a 0-to-1 scale) generally indicates that the system correctly recognized the input as irrelevant, distant from the target domain, or failing to meet the required threshold for a successful match.
3. If use_rag is turned on, the system appends a CONTEXT section directly into prompt_sent, which includes text excerpts pulled from the database alongside their match scores and reference markers (like [1]). Furthermore, extra prompts are sent to the system_prompt to ensure the AI relies solely on those specific passages and cites them correctly.
4. The lyrical agent runs in Docker, which is known because the containerized environment handles its execution without requiring a local installation of Node.js on the host machine, even though its configuration metadata lists the runtime explicitly as "runs_on": "unknown".


**Part 5 Improvements (Retrieval)**

1. Score Threshold

What it fixed: It eliminated the risk of vector search returning weak matches for irrelevant questions, thus preventing the assistant from hallucinating answers based on poor context.

Demonstration question: "What is the weather forecast for tomorrow?"

Result: Previously, it returned the closest chunk from the corpus (with a score of 0.32); now, it returns an empty list (hits: []), forcing the assistant to correctly refuse out-of-scope questions.

2. Stable Chunk IDs (Also applied in Part 4)

What it fixed: It eliminated vector duplication in Qdrant during document re-ingestion by switching from random UUIDs to deterministic ones.

Demonstration question: Repeatedly calling POST /ingest on the card-policy document.

Result: Previously, the total point count in the database doubled on every re-ingestion; now, the points retain the same point_ids and are cleanly overwritten