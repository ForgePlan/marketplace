## Occam's Razor

**Summary:** Among competing hypotheses that predict equally well, the one with the fewest assumptions should be selected. In design, the simplest solution that meets all requirements is the best -- remove every element that does not serve a clear purpose.

### Key Takeaways
- The best method for reducing complexity is to avoid it in the first place.
- Analyze each element and remove as many as possible, without compromising the overall function.
- Consider completion only when no additional items can be removed.

### Frontend Code Implications
- Audit every UI element on the page: if a decorative border, divider, icon, or label can be removed without losing clarity, remove it. Prefer whitespace (`gap`, `padding`) over visual separators (`<hr>`, `border-bottom`) to create visual hierarchy.
- Reduce component prop surface area: a Button component should not accept 15 variant props. Limit to essential variants (primary, secondary, destructive) and sizes (sm, md, lg). Each additional prop must justify its existence with a clear use case.
- Simplify form flows by eliminating optional fields that are rarely filled. Use smart defaults (`<select>` pre-selected to the most common option), autofill attributes (`autocomplete="email"`, `autocomplete="address-line1"`), and conditional fields that only appear when relevant (`v-if` / conditional rendering).
- Flatten navigation hierarchies: prefer 2 levels maximum (top nav + page sections) over deep nested menus. If a dropdown menu has more than 7 items, restructure the information architecture rather than adding a mega-menu.

### Code Review Checklist
- [ ] Every visible UI element serves a clear functional purpose (no purely decorative borders, icons, or labels that add no information)
- [ ] Component APIs are minimal -- no unused or rarely-used props
- [ ] Form fields are limited to what is strictly necessary; optional fields are justified
- [ ] Navigation structure does not exceed 2 levels of nesting

### Origins
Occam's razor (also Ockham's razor; Latin: lex parsimoniae, "law of parsimony") is a problem-solving principle attributed to William of Ockham (c. 1287-1347), an English Franciscan friar, scholastic philosopher, and theologian. When presented with competing hypothetical answers to a problem, one should select the one that makes the fewest assumptions.

### Examples
- Google's homepage is the canonical example: a single search input with two buttons, eliminating all other content that could compete for attention or add unnecessary complexity.
- A settings page that shows only the 5 most-changed options by default, with an "Advanced" expandable section for the rest, rather than displaying all 30 settings at once.

### Further Reading
- [How to Use Occam's Razor Without Getting Cut](https://fs.blog/occams-razor/) - Farnam Street
- [Designing with Occam's Razor](https://medium.com/@jonyablonski/designing-with-occams-razor-3692df2f3c7f) - Jon Yablonski | Medium
- [Occam's Razor: The Simplest Solution is Always the Best](https://www.interaction-design.org/literature/article/occam-s-razor-the-simplest-solution-is-always-the-best) - Mads Soegaard | Interaction Design Foundation
- [Complexity Bias: Why We Prefer Complicated to Simple](https://fs.blog/complexity-bias/) - Farnam Street
- [Occam's Razor: A Great Principle for Designers](https://www.webdesignerdepot.com/2010/07/occams-razor-a-great-principle-for-designers/) - Web Designer Depot
