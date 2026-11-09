## Every answer has a source

Clai doesn't answer from general knowledge. Each answer comes from a passage in the agreement you added, and shows:

- the **clause** number (when the agreement has one),
- the **section** and heading,
- the **page**, or page range,
- the passage's **exact wording**.

Clicking the reference opens the page with the passage highlighted.

## How Clai chooses the passage

1. Your question is broken into its meaningful words. Words that mean the same thing in agreements are added: *leave* → *terminate*, *cap* → *limitation*, *period* → *days*.
2. Every passage is scored with **BM25**, a standard search ranking, for your question and for a version expanded with the vocabulary agreements use for that topic (termination, payment, liability and so on). The rankings are combined.
3. The top passages are **graded**: how much of what you asked about (weighted toward rarer, more specific words) actually appears in the passage.
4. If the evidence is weak, Clai searches once more with alternative wording, then decides.

## "Not found in the agreement"

Clai declines to answer when:

- **most of your key words don't appear anywhere in the agreement**. Clai then names them: *"It doesn't mention 'dress code'"*. Or
- **no passage covers enough of your question**.

It still lists the closest passages, so you can check whether the answer is there in different words. Declining is deliberate. For contracts, a wrong answer that looks confident is worse than no answer.

## How accurate is it?

On a small set of test questions about fictional agreements that Clai wasn't tuned on, the browser version answered 8 of 12 correctly. It declined the other 4, and in each of those the correct clause was among the passages it listed. It didn't cite a wrong clause, and it correctly declined all 3 questions the agreement doesn't answer. Treat these as early, small-sample results; details are in the [technical reference](/docs/technical-reference).

## Quoted, not rewritten

The public version **quotes** the agreement; it doesn't write its own summary. That keeps every answer checkable. A server version of Clai can optionally write short answers with a language model; those are labelled, and their citations are checked against the retrieved passages.
