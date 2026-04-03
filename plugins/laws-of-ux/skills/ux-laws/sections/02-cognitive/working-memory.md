## Working Memory

**Summary:** Working memory is a limited cognitive system that temporarily holds and manipulates 4-7 chunks of information for about 20-30 seconds. Interfaces must minimize reliance on users remembering information across screens or steps.

### Key Takeaways
- Working memory is limited to 4-7 chunks of information at any given moment with each chunk fading after 20-30 seconds. We use it to keep track of information in order to achieve tasks but we often have trouble remembering what information we've already seen. Designers must be mindful of this limit when displaying information to users and ensure it's both necessary and relevant.
- Our brains are good at recognizing something we've seen before but not at keeping new information ready to be used. We can support recognition over recall by making it clear what information has already been viewed (e.g. visually differentiating visited links and providing breadcrumbs links).
- Place burden of memory on the system, not the user. We can lessen the burden of memorizing critical information by carrying it over from screen to screen when necessary (e.g. comparison tables that make comparing multiple items easy).

### Frontend Code Implications
- Style visited links differently from unvisited ones. Use `a:visited { color: var(--color-visited); }` to help users recognize which pages they have already seen, supporting recognition over recall.
- Implement breadcrumb navigation (`<nav aria-label="Breadcrumb">` with `<ol>`) so users always know where they are in a hierarchy without having to remember their path.
- Carry critical context across screens. In multi-step flows, display a summary sidebar or sticky header showing previously entered information (e.g., selected product, shipping address) so users do not need to memorize it. Use `position: sticky; top: 0;` for persistent context.
- Provide comparison tables (`<table>` with sticky column headers via `position: sticky; left: 0;`) when users need to evaluate multiple options, so they do not need to hold attributes in memory while switching between product pages.

### Code Review Checklist
- [ ] Visited links are visually differentiated from unvisited links via `:visited` styles
- [ ] Breadcrumb navigation is present for hierarchical content deeper than two levels
- [ ] Multi-step flows carry forward a summary of previously entered data so users do not need to remember it
- [ ] Comparison scenarios provide side-by-side views rather than requiring users to navigate back and forth

### Origins
The term "working memory" was coined by George A. Miller, Eugene Galanter, and Karl H. Pribram and used in the 1960s in theories that likened the mind to a computer. In 1968, Richard C. Atkinson and Richard M. Shiffrin used the term to describe their "short-term store." Most theorists today use working memory to replace or include the older concept of short-term memory, emphasizing the manipulation of information rather than mere maintenance. The neural basis research traces back over 100 years to ablation experiments of the prefrontal cortex by Hitzig and Ferrier.

### Examples
- **E-commerce Comparison:** A product comparison table that pins selected items in columns so users can scroll through attributes without losing track of which product is which.
- **Multi-step Forms:** A flight booking wizard that shows the selected origin, destination, and dates in a persistent header across all steps (seat selection, payment, confirmation).

### Further Reading
- [Working Memory and External Memory](https://www.nngroup.com/articles/working-memory-external-memory/) - Raluca Budiu | Nielsen Norman Group
- [Working Memory and External Memory [Video]](https://www.youtube.com/watch?v=qV5gSyfi4p8) - Raluca Budiu | Nielsen Norman Group
- [Reducing Cognitive Overload For A Better User Experience](https://www.smashingmagazine.com/2016/09/reducing-cognitive-overload-for-a-better-user-experience/) - Danny Halarewich | Smashing Magazine
