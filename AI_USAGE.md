# AI Usage

## Tools used

I mostly worked directly in my editor and terminal for this challenge. I did not use Claude as a blanket assistant for the whole project. I used Claude (the web chat version) only in a few specific places:

* A couple of chat conversations to sanity check my design choices while working through the classification history feature and the repository seam.
* Generating the first draft of the SimulatedLlmClassifierProvider class.
* Drafting the first version of this file, DECISIONS.md and the general write up structure.
* Generating the bulk of the automated test suite in apps/api/test and apps/web/test, along with the Vitest configs.
* Generating the first draft of the interactive changes page ([docs/CHANGES.html](https://cami-challenge-changes.netlify.app/)).

## How I used AI

I read every source file in apps/api and apps/web, plus the CI workflow and docker compose config, before writing any code. This let me form my own diagnosis of the issues instead of just following hints in the README.

Once I understood the codebase, I used Claude in these ways:

1. Design sanity checks. Before committing to an approach for the repository and port layer, I talked it through with Claude to pressure test my thinking. I still made the final call myself.
2. Drafting the SimulatedLlmClassifierProvider. I asked Claude to generate the shape of the class, including the fake callModel and parseModelResponse split and the fallback on error pattern. I then went through it by hand, renamed things to match the rest of the codebase, tightened the response validation and wrote the tests myself so I could confirm the fallback actually triggers on a malformed response.
3. Generating tests. Writing over one hundred test cases by hand for a take home is not a good use of time, so I had Claude generate the bulk of them from my actual service, controller and repository code and the fake in memory repositories. I then reviewed every file, ran the suite and fixed the cases that did not reflect real behaviour, such as mismatched mock shapes and a couple of assertions that were checking the wrong thing.
4. Drafting documentation. I used Claude to produce first drafts of this file, DECISIONS.md and the interactive changes page, then edited them to match what I had actually done.

I verified everything with real runs, not just by reading code. I reproduced the CI failure locally on Node 20 against a real Postgres container, and traced it to a mismatched database name in ci.yml. I seeded 1200 requests and 4800 notes to reproduce and measure the N plus one query issue before and after the fix. I ran tsc and vitest after every meaningful change instead of batching changes and debugging at the end. I also started the real API and web app and hit the endpoints with curl, including classify, status updates, history filters, validation errors and the simulated LLM provider switch, to confirm real runtime behaviour rather than trusting that the code compiled.

When pagination, search, sorting and the notes feature were added later, I repeated the same approach. I implemented against the port, service and controller layers first, updated the fake repository and its tests, ran the full suite, then updated the web page and its tests last so the client side was always checked against a working API shape. I finished by running the API against a real dev Postgres and calling the new endpoints directly with curl, including search, each sort field, pagination offsets, the notes list and add endpoints and the 404 case for a missing request id. This confirmed the raw SQL, especially the window function used for the total count, actually behaves the way the unit tests assume.

## What I changed or rejected

* My first instinct for the repository and port layer was one generic Repository interface shared between CustomerRequest and ClassificationHistory. After talking it through with Claude, I chose two separate, narrower port interfaces instead. The two entities have genuinely different access patterns. CustomerRequest is mutable single row CRUD, while ClassificationHistory is append only paginated reads. A shared generic interface would have added indirection without adding real safety.
* I considered pulling in class validator and class transformer for DTO validation, since that is the typical NestJS approach. I decided against it because it was not already a dependency and a handful of small DTOs did not justify adding a new library under a timebox. I wrote small manual validators instead and documented this as a deliberate trade off.
* I originally planned to put the classify business rules, such as confidence softening and the unknown threshold, into the repository layer alongside the history writes. I moved them into ClassificationService instead, since these are business rules about interpreting a classification result, not persistence concerns. The repository should only know how to store and query data.
* For pagination, the obvious option was a second count query stitched together in the service. I used a single query with COUNT star OVER instead, so the pagination feature did not quietly break the single round trip property that the N plus one fix depended on.
* For search, I considered matching against note bodies as well as the request message, since a support agent searching for a keyword might expect it to also search the notes. I scoped search to the message field only for this pass and wrote this down as a deliberate decision in DECISIONS.md rather than silently choosing the larger scope option.

## Trade-offs

I added a proper unit test layer after the fact, covering the services, controller, both repository adapters, DTOs and a couple of regression tests aimed directly at the planted bugs, such as the single query list, the CI database name and the controller staying thin. The tests were drafted with help from Claude and then verified by hand.

What manual verification actually meant in practice:

* I ran the full test suite after every batch of generated tests, not just once at the end.
* I read every generated test and checked it against the real implementation it claims to cover, rather than trusting that a passing test means a correct test. This caught cases where a mock's shape did not match what the real repository or API actually returns. For example, page.test.tsx's mocks needed updating from a plain array to the items, total, limit, offset shape once pagination was added.
* I deliberately checked that the regression tests actually fail if I revert the fix they are guarding, such as the N plus one single query assertion, the CI database name check and the controller thin layer checks. A regression test that cannot fail is not testing anything.
* I cross checked the parts that unit tests cannot fully prove, meaning the raw SQL in the TypeORM requests repository, including the LATERAL join, the COUNT star OVER window function, the ILIKE search and the dynamic ORDER BY, by running real migrations against Postgres, starting the API and hitting every new endpoint and query parameter combination with curl. A fake repository cannot validate that the actual SQL is syntactically and semantically correct.

The one thing I did not build is a full end to end test that hits a running API against a real Postgres instance in an automated way. I verified that path manually with curl instead, and I called this out as the remaining gap in DECISIONS.md rather than leaving it implicit. Given the time box, I judged that manual verification of the raw SQL, combined with a full generated and reviewed unit test layer, gave enough confidence without spending the remaining time building end to end test infrastructure.

My approach when using Claude for tests was consistent across every file. I would paste in the file or files under test along with any existing sibling tests as a style reference, ask for tests covering the happy path, the validation and error path and the specific planted bug regression case for that file, then paste back any failures for a fix rather than accepting an answer that just looked right. There was no custom prompt file or saved skill configuration for this challenge. It was a plain chat workflow, repeated per file or feature as the code changed.

## Team workflow (optional stretch)

If I were setting AI assisted development standards for a team, I would keep it simple:

* AI assisted changes go through the same review bar as any other change. There is no lighter review path just because a tool wrote the first draft.
* Pull requests should flag what was AI generated in places where it is not obvious, so reviewers know where to look more carefully.
* Generated tests should be treated as a first draft only. Every generated test should be checked against the real implementation it claims to cover, and regression tests should be verified to actually fail when the bug they guard against is reintroduced.
* For anything that touches raw SQL, real infrastructure or external services, generated code and tests should be backed up with a manual run against the real system, since fakes and mocks cannot prove that real SQL or real integrations behave correctly.
