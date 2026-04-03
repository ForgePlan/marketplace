## Pareto Principle

**Summary:** The Pareto principle states that roughly 80% of the effects come from 20% of the causes. In UX, this means focusing design and development effort on the features and flows that serve the vast majority of users.

### Key Takeaways
- Inputs and outputs are often not evenly distributed.
- A large group may contain only a few meaningful contributors to the desired outcome.
- Focus the majority of effort on the areas that will bring the largest benefits to the most users.

### Frontend Code Implications
- Prioritize performance optimization on the critical 20% of pages that receive 80% of traffic. Use `loading="lazy"` on images below the fold, `<link rel="preload">` for critical CSS/fonts on high-traffic landing pages, and code-split routes so the entry bundle only contains the most-visited pages.
- Invest in polishing the core user flows (sign-up, search, checkout) with refined error handling, loading states, and accessibility before building edge-case features. Ensure these flows have `100%` test coverage with Cypress or Playwright end-to-end tests.
- Focus responsive design effort on the 2-3 viewport sizes that represent 80% of your traffic (typically mobile ~375px and desktop ~1440px) before addressing tablet or ultra-wide edge cases. Use `@media (min-width: 768px)` and `@media (min-width: 1024px)` as primary breakpoints.
- For component libraries, build the 20% of components used in 80% of views first: Button, Input, Card, Modal, Toast/Notification. Ensure these have complete variant coverage, accessibility, and documentation before creating specialized components.

### Code Review Checklist
- [ ] Performance optimizations (lazy loading, preloading, code splitting) are applied to the highest-traffic pages first
- [ ] Core user flows have comprehensive error handling, loading states, and end-to-end test coverage
- [ ] Responsive design covers the primary viewport sizes that represent the majority of traffic
- [ ] Design system prioritizes the most frequently used components with full accessibility and documentation

### Origins
The principle stems from Vilfredo Pareto, an economist who noticed 80% of Italy's land was owned by 20% of the population. Though it might seem vague, the 80/20 way of thinking provides insightful and endlessly applicable analysis of lopsided systems, including user experience strategy.

### Examples
- Analytics show that 80% of users interact with only 3 out of 15 features on a dashboard, indicating where to focus polish and performance.
- In a support interface, 80% of tickets relate to the same 3 issues, suggesting those specific user flows need redesign rather than adding more help documentation.

### Further Reading
- [Good UX is not just about minimizing clicks](https://uxdesign.cc/good-ux-is-not-just-about-minimizing-clicks-5504fa2ff430) - Avi Siegel | UX Collective
- [Prioritize Quantitative Data with the Pareto Principle](https://www.nngroup.com/articles/pareto-principle/) - Evan Sunwall | Nielsen Norman Group
- [The 80/20 Rule in User Experience](https://medium.com/design-ibm/the-80-20-rule-in-user-experience-1695de32aaae) - Arin Bhowmick | Medium
- [Applying the Pareto Principle to the User Experience](https://measuringu.com/pareto-ux/) - Jeff Sauro | Measuring U
- [The Pareto Principle and Your User Experience Work](https://www.interaction-design.org/literature/article/the-pareto-principle-and-your-user-experience-work) - Interaction Design Foundation
- [Pareto Principle on Wikipedia](https://en.wikipedia.org/wiki/Pareto_principle) - Wikipedia
