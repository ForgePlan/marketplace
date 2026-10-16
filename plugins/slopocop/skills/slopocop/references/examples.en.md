# English examples

These examples were written for development. They illustrate decisions rather
than require a fixed response template. A clearer version is not the only valid
wording. Each example states its source facts.

## A short answer

Question: “What does HTTP 404 mean?”

Dense: “This status indicates the non-availability of the requested resource
within the server-side processing context.”

Clearer: “HTTP 404 means the server could not find the requested page or file.”

One sentence is sufficient; no next action is required.
A definition does not need a catalog of other codes or a troubleshooting plan.

## An unfamiliar term and its mechanism

Facts: a cache keeps copies of results; a cache miss leads to a database query.

Dense: “Caching optimizes latency, whereas a cache miss triggers a DB lookup.”

Clearer: “A cache is a saved copy of a result. If the result is in the cache,
the service can return it without querying the database. Otherwise, it gets
the result from the database. This is why a cache can make a response faster.”

The explanation preserves “can”; it does not promise that every request is faster.

## Explicit referents

Facts: a service sends a request to a queue; the queue stores it until processing.

Dense: “The service sends the request to the queue. It then stores it.”

Clearer: “The service sends the request to the queue. The queue stores
the request until it is processed.”

Repeating the noun identifies who stores the request.

## Advice and uncertainty

Facts: an update may fix a bug, but testing has not confirmed this.
Updating is a recommendation, not a requirement.

Dense: “It is advisable to undertake an update that will resolve the issue.”

Clearer: “I recommend the update. It may fix the bug, but we have not tested that yet.”

Advice remains advice and uncertainty remains uncertainty.

## Exact values and a prohibition

Facts: the deadline is 12 November 2026 at 13:15 UTC+3; files larger than
20 MB are rejected; the backup must not be deleted.

Clearer: “Upload the file before 12 November 2026 at 13:15 UTC+3.
The service rejects files larger than 20 MB. Do not delete the backup.”

Neither a vague date nor a softer warning preserves these facts.

## Percentages and percentage points

Facts: a fee increased from 10% to 12%.

Clearer: “The fee rose from 10% to 12%. That is an increase of 2 percentage
points, or 20% relative to the previous fee.”

Two different measures of change are distinguished.

## Observed error and suspected cause

Facts: the response was 401; the request has no Authorization header;
the causal link is unverified.

Clearer: “The server returned 401. The request has no `Authorization` header,
which may explain the failure. Repeat the request with the required header
to test that explanation.”

The exact header name survives and the proposed cause is not a verified result.

## Repairing an explanation

Earlier answer: “The operation must be idempotent.”
Reader: “I don't know what that means.”

Clearer: “Repeating the same request should have the same effect as making it
once, without repeating the action. For example, if a payment request is sent
twice, the system should charge once.”

This hypothetical example supplies the missing connection rather than
substituting another unfamiliar term.

## Progress and document boundaries

Facts: a check was added and local tests passed; production use is unverified.

Clearer: “The check is in place and local tests passed. Production use is still
unverified.”

If the task includes a formal notice or report, keep the artifact's requested
style and apply conversational clarity to the surrounding explanation.

## Consequential action

Facts: removing `./exports` is being prepared, deletion is not yet authorized,
and the backup has not been verified.

Clearer: “Deleting `./exports` would remove the saved exports. I’ll check for a
usable copy, then show what would be deleted and request approval.”

The message names the object and consequence; preparation is not completion.
The skill itself supplies no execution permission.

## Repeated failed fixes

Facts: three configuration changes did not fix the connection error. The server
address and credentials are unverified. The agent can check the address.

Clearer: “Three configuration changes did not help. I’ll check whether the server
responds at the configured address. That can help separate a reachability problem
from a credentials problem; neither cause is confirmed yet.”

The diagnostic step changes the investigation instead of promising a fourth fix.

## Compact explanation with a condition

Facts: completed results were loaded into the cache before the first request.
Retrieving a stored result costs less than computing it again.

Clearer: “Even the first request can be faster: its result is already stored.
The request does not need to have been made before.”

When only storage is known, preserve the condition for a speedup: retrieval must
cost less than computation. A high hit rate alone does not establish that.

## Independent facts without an invented cause

Facts: a new version is recommended but optional. It may resolve a failure;
that has not been tested. The reason for the recommendation is unknown.

Clearer: “The new version is recommended, but you do not have to install it.
Whether it resolves the failure has not been tested. The reason for the recommendation
is unknown.”

No story about why it was released or why installation is optional is needed.
Optional installation does not promise that the system will keep behaving unchanged.
“Nothing will break if you skip it” or “you can safely stay on the current version”
adds a guarantee that the facts do not contain.

## One representation of a process

Facts: an app sends a job to a buffer; the buffer stores it; a worker executes
the job and sends the result to the app.

Clearer: “The buffer stores the job, the worker executes it, and the app receives
the result.” If the reader needs the flow, describe that sequence once instead
of repeating roles, a diagram and a recap.

Storage does not establish execution order or protection against data loss.
The result's recipient does not establish its route; intermediaries are unspecified.

## Actions after a failed check

Facts: a backup exists; a configuration check failed; starting after failure is
forbidden. The backup's contents and any changes during checking are unknown.

Clearer:

> Do not start the service.
>
> 1. Keep the backup and read the error message.
> 2. Resolve the reported problem and repeat the configuration check.
> 3. Start the service only after the check passes.

Replacing the backup or rolling back changes needs more information. That gap
does not prevent answering the main question.

## Compactness preserves the request

Show all seven options when the reader asks to compare seven. Preserve stages
and their connections when a detailed explanation is requested. Remove repetition,
not requested options or necessary reasoning.

## Language and a short definition

Question: “What does a draft mean?”
Clearer: “A draft is a provisional version that can still be revised.”

Russian development priority does not change the language of an English question.
This definition needs no claim about contracts or their legal status.

## The decision criterion

Facts: K costs $24 for 6 GB, L costs $36 for 10 GB, M costs $45 for 16 GB.
The reader wants all options and the lowest total price for at least 10 GB.

Clearer: “K does not qualify: 6 GB is below your 10 GB minimum. L and M qualify;
choose L at $36 for 10 GB. M costs $45 for 16 GB.”

Price per GB does not determine this choice and need not be calculated.

## Actor counts and assigned tasks

Facts: an author writes a request, an editor checks it, a manager approves it,
and a worker executes it. An incomplete request returns to the author.

Clearer: “There are four actors. The author completes the request, then the
editor checks it again.”

Assignment does not establish that only this person knows the answer or can
make a correction. Exclusive knowledge or authority needs its own evidence.

## A heading and its explanation add different information

Facts: a reviewer checks whether sources are listed in a note. This prevents
publication without sources.

Repetitive: “The reviewer checks for sources. The reviewer's task is to check
whether sources are listed. This check prevents publication without sources.”

Clearer: “The reviewer checks whether sources are listed. This prevents the note
from being published without them.”

“Them” has one clear referent. Repeat a name when a pronoun could identify two
different things or actors. Do not cycle through synonyms for one concept.
When a heading already states a step, the body must add information; it may be absent.

## Sentence links without a chain of colons

Facts: the file is saved, the check is running, its result is unknown.

Cluttered: “The file is saved: the check is running: the result is unknown.”

Clearer: “The file is saved. The check is still running and its result is unknown.”

A colon can introduce a list or a useful explanation. Ordinary links can use a
full stop or conjunction. The colon count itself is not a clarity score.

## Bounds and conflicting facts

Facts: setup costs from $250. The service card says two-day delivery; the
manager's note says five days.

Inaccurate: “Setup costs about $250. Delivery takes five days.”

Clearer: “Setup costs from $250. The service card and the manager's note give
different delivery times, two and five days. Which is correct?”

“From” states a lower bound; “about” changes the condition. Keep “at least” and
“more than 100” the same way: they do not give an exact number. When sources
disagree, name the conflict instead of silently choosing one.
