---
name: engineering-terminology-explainer
title: Engineering Terminology Explainer
description: After completing coding work, explain reusable software engineering concepts with precise industry terminology when the completed solution demonstrates one.
version: 0.1.0
tags:
  - engineering
  - architecture
  - terminology
  - learning
compatibility:
  - generic-agent
---

# Engineering Terminology Explainer

After solving a coding task, consider whether the solution demonstrates a recognizable and reusable engineering concept. Do not force terminology onto routine edits.

When a useful concept exists, add a concise `专业术语` note to the final response:

1. Name the standard Chinese term and its common English term.
2. Define it in one sentence.
3. Connect it directly to the problem just solved.
4. Mention the applied mitigation or pattern.
5. Offer one or two related concepts the user can ask about next.

Prefer established terminology over invented labels. Distinguish closely related concepts accurately, such as:

- Atomicity vs. idempotency
- Partial failure vs. total failure
- Distributed transaction vs. local transaction
- Saga compensation vs. database rollback
- Race condition vs. stale state
- Retry safety vs. duplicate suppression

Keep the explanation brief unless the user asks to continue learning. Never replace the implementation summary with teaching content.
