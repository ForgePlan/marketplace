## Serial Position Effect

**Summary:** Users best remember the first and last items in a series (primacy and recency effects), while items in the middle are most likely to be forgotten. Place the most important content and actions at the beginning and end of sequences.

### Key Takeaways
- Placing the least important items in the middle of lists can be helpful because these items tend to be stored less frequently in long-term and working memory.
- Positioning key actions on the far left and right within elements such as navigation can increase memorization.
- Avoid placing critical actions or information only in middle positions of lists, menus, or carousels — users are most likely to overlook them there.

### Frontend Code Implications
- In bottom navigation bars (mobile), place the most important tabs at the far left and far right positions. The middle slots are for secondary features. For a 5-tab bar, slots 1 and 5 get primary actions (e.g., Home, Profile), slots 2-4 get secondary ones.
- In horizontal navigation or tab strips, place the primary/default section first and the important secondary action last. Use CSS `order` property or DOM ordering to ensure the most critical items bookend the list.
- For feature lists or pricing comparison tables, put the strongest selling points in the first and last rows. Use visual emphasis (`font-weight: 600` or a checkmark icon) on those rows to reinforce the position advantage.
- In onboarding carousels or step-by-step flows, make the first and last steps the most impactful. The first step sets expectations; the last step should deliver a satisfying conclusion or clear CTA.

### Code Review Checklist
- [ ] Navigation bars place primary actions at the far left and far right positions
- [ ] Lists of features or options put the most important items first and last, not buried in the middle
- [ ] Multi-step flows open with a strong first impression and close with a clear, memorable conclusion
- [ ] Tab order and visual order align so the first and last items are genuinely the most important

### Origins
The serial position effect was coined by Herman Ebbinghaus. It describes how the position of an item in a sequence affects recall accuracy. The primacy effect explains better recall for items at the beginning, while the recency effect explains better recall for items at the end. Items in the middle of a list are recalled with the least accuracy. This principle is reflected in designs by companies like Apple, Electronic Arts, and Nike.

### Examples
- **Mobile Navigation:** iOS tab bars typically place "Home" at the far left and "Profile" or "More" at the far right, with less critical features in the middle positions.
- **Feature Lists:** A pricing page that leads with the most compelling feature and closes with a strong guarantee or support mention, while placing standard features in the middle.

### Further Reading
- [Serial Position Effect: How to Create Better User Interfaces](https://www.interaction-design.org/literature/article/serial-position-effect-how-to-create-better-user-interfaces) - Euphemia Wong | Interaction Design Foundation
- [The Serial Position Effect: Why ABC and XYZ Stand Out the Most Among All the Alphabets](https://medium.com/coffee-and-junk/design-psychology-serial-position-effect-ca0e4cf299cb) - Abhishek Chakraborty | Medium.com
- [Psychology in Design (Part 1)](https://blog.prototypr.io/psychology-in-design-part-1-cdc63229cbe4) - Andri Budzinskiy | Medium.com
- [Serial Position Effect on Wikipedia](https://en.wikipedia.org/wiki/Serial-position_effect) - Wikipedia
