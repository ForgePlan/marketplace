## Miller's Law

**Summary:** The average person can only keep 7 (plus or minus 2) items in their working memory. Design should organize content into small, meaningful chunks rather than presenting long, unstructured lists.

### Key Takeaways
- Don't use the "magical number seven" to justify unnecessary design limitations.
- Organize content into smaller chunks to help users process, understand, and memorize easily.
- Remember that short-term memory capacity will vary per individual, based on their prior knowledge and situational context.

### Frontend Code Implications
- Navigation menus should group items into no more than 7 plus or minus 2 top-level categories. Use dropdown sub-menus or mega-menus to organize overflow items into logical groups rather than adding more top-level links.
- Forms should group related fields using `<fieldset>` and `<legend>`. Phone numbers should use input masks `(XXX) XXX-XXXX`. Break long forms into multi-step wizards with a progress indicator showing current step out of total.
- When displaying lists (search results, product grids, table rows), paginate or use "load more" patterns. Avoid rendering more than 7-10 items without clear visual grouping or category headers.
- Tab bars and segmented controls should contain 3-5 items maximum. If more are needed, use a scrollable tab strip or move items into a "More" overflow menu.

### Code Review Checklist
- [ ] Top-level navigation contains no more than 5-9 items; overflow is handled via sub-menus or grouping
- [ ] Long forms are broken into logical steps or grouped sections with clear labels
- [ ] Data sequences (phone, card, SSN) use input masks or formatted display
- [ ] Lists and grids use pagination, grouping, or progressive loading to limit visible items

### Origins
In 1956, George Miller asserted that the span of immediate memory and absolute judgment were both limited to around 7 pieces of information. The main unit of information is the bit, the amount of data necessary to make a choice between two equally likely alternatives. The point where confusion creates an incorrect judgment is the channel capacity -- the quantity of bits which can be transmitted reliably through a channel within a certain amount of time.

### Examples
- **Chunking:** Content organized into meaningful groups helps users process, understand, and memorize it more easily. Phone numbers displayed as (555) 123-4567 instead of 5551234567.
- **Navigation Design:** A navigation bar with 5 top-level items, each expanding into categorized sub-menus, rather than 15 flat links.

### Further Reading
- [Miller's Law, Chunking, and the Capacity of Working Memory](https://www.khanacademy.org/test-prep/mcat/social-sciences-practice/social-science-practice-tut/e/miller-s-law--chunking--and-the-capacity-of-working-memory) - Khan Academy
- [Design Principles for Reducing Cognitive Load](https://blog.prototypr.io/design-principles-for-reducing-cognitive-load-84e82ca61abd) - Jon Yablonski | Medium.com
- [The Magical Mystery Four: How is Working Memory Capacity Limited, and Why?](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2864034/) - Nelson Cowan | NCBI
- [Miller's Law on Wikipedia](https://en.wikipedia.org/wiki/Miller%27s_law) - Wikipedia
- [The Magical Number Seven, Plus or Minus Two](http://www2.psych.utoronto.ca/users/peterson/psy430s2001/Miller%20GA%20Magical%20Seven%20Psych%20Review%201955.pdf) - George A. Miller
