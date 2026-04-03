# Decomposition Guide

How to decompose a complex system or problem into bounded parts using FPF.

## When to use

You have a system, project, or problem that is too large or tangled to reason about
as a single unit. You need to break it into parts that can be owned, built, and
evaluated independently.

## Steps

### 1. List the domains

Write down every distinct area of concern. Do not filter yet — just enumerate.
Example: for an e-commerce platform — catalog, pricing, checkout, payments,
shipping, user accounts, analytics, notifications.

### 2. Draw bounded contexts (A.1.1)

Group related concerns into contexts where every term has exactly one meaning.
A good context has: one responsibility, clear vocabulary, and a reason to exist
independently. If two areas share the same word with different meanings
(e.g., "order" in checkout vs. fulfillment), they belong in separate contexts.

### 3. Assign roles (A.2)

For each context, name the roles that act inside it: who creates, who approves,
who operates, who observes. Roles are not people — one person can hold multiple
roles, and one role can be filled by a human or a system.

### 4. Define interfaces

Where contexts must communicate, define the interface: what crosses the boundary
(events, queries, artefacts), in which direction, and what vocabulary applies on
each side. Interfaces are where most bugs live — be precise here.

### 5. Check for category errors (A.7)

Review your decomposition for common mistakes:
- Merging two contexts because they share a name (but not a meaning)
- Confusing a role with a capability (who vs. can-do)
- Confusing a method with its output (how vs. what-was-produced)
Fix any errors before proceeding.

### 6. Validate completeness

Ask: does every responsibility belong to exactly one context? Is there a context
with no clear owner? Is there a role with no home? Gaps mean missing contexts.

## Output

A table of contexts, their responsibilities, key roles, and interfaces — plus
a list of open questions for the next round of refinement.
