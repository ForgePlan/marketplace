## Choice Overload

**Summary:** Users become overwhelmed when presented with too many options, leading to decision paralysis and a worse overall experience. Reducing and organizing choices improves decision-making and satisfaction.

### Key Takeaways
- Too many options hurts users' decision-making ability. How they feel about the experience as a whole can be significantly impacted as a result.
- When comparison is necessary, we can avoid choice overload by enabling side-by-side comparison of related items and options that require a decision (e.g. pricing tiers).
- We can avoid choice overload by optimizing our designs for the decision-making process and avoid overwhelming users by prioritizing the content that's shown to them at any given moment (e.g. featured product), providing tools for narrowing down choices up front (e.g. search and filtering).

### Frontend Code Implications
- Limit visible options in dropdowns and select menus. For lists exceeding 5-7 items, implement a searchable/filterable `<input>` with a dropdown (`combobox` pattern) instead of a plain `<select>`.
- Use progressive disclosure: show primary actions immediately, nest secondary actions behind a "More" button or expandable panel. Navigation menus should expose no more than 7 top-level items.
- Highlight a recommended or default option visually (e.g., `border: 2px solid var(--color-primary)`, a "Recommended" badge) in pricing tables or plan selectors to reduce decision friction.
- Provide filtering and sorting controls (`<input type="search">`, category chips, sort dropdowns) at the top of any list or grid with more than 10 items.

### Code Review Checklist
- [ ] No dropdown or radio group presents more than 7 options without search/filter capability
- [ ] A default or recommended option is visually highlighted when users must choose between plans, tiers, or configurations
- [ ] Lists with 10+ items include sorting, filtering, or pagination controls
- [ ] Complex multi-step decisions are broken into sequential steps (wizard/stepper pattern) rather than a single form

### Origins
The term "overchoice" was first introduced by Alvin Toffler in his 1970 book *Future Shock*. It describes the paradoxical phenomenon where choosing between a large variety of options can be detrimental to decision-making processes.

### Examples
- A pricing page with 3 clearly differentiated tiers (with one highlighted as "Most Popular") converts better than a page showing 6+ plans with subtle differences.
- An e-commerce category page with filter chips (size, color, price range) at the top helps users narrow hundreds of products to a manageable set.

### Further Reading
- [The Paradox of Choice](https://thedecisionlab.com/reference-guide/economics/the-paradox-of-choice) - The Decision Lab
- [Choice Overload Impedes User Decision-Making [Video]](https://www.nngroup.com/videos/choice-overload/) - Alita Kendrick | Nielsen Norman Group
- [Simplicity Wins over Abundance of Choice](https://www.nngroup.com/articles/simplicity-vs-choice/) - Hoa Loranger | Nielsen Norman Group
