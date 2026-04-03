## Jakob's Law

**Summary:** Users spend most of their time on other sites, so they prefer your site to work the same way as all the other sites they already know. Leveraging familiar patterns reduces learning curves and improves usability.

### Key Takeaways
- Users will transfer expectations they have built around one familiar product to another that appears similar.
- By leveraging existing mental models, we can create superior user experiences in which the users can focus on their tasks rather than on learning new models.
- When making changes, minimize discord by empowering users to continue using a familiar version for a limited time.

### Frontend Code Implications
- Place the logo in the top-left corner linked to the homepage (`<a href="/">`) with primary navigation as a horizontal bar below or beside it. Search goes in the top-right area. Do not invent novel navigation placements -- follow the F-pattern layout users expect.
- Use standard HTML form controls and follow platform conventions: `<select>` for dropdowns, `<input type="checkbox">` for multi-select options, radio buttons for single-select. Custom components must replicate native behavior exactly (keyboard support, focus management, ARIA roles).
- Shopping and checkout patterns must follow established conventions: cart icon top-right with item count badge, "Add to Cart" as a primary button on product pages, linear checkout flow. Use naming that matches established industry usage — avoid inventing entirely novel labels for well-understood concepts (e.g., "Cart", "Bag", and "Basket" are all widely recognized conventions).
- When redesigning, implement a feature flag system (`if (featureFlags.newUI)`) to allow gradual rollout. Provide a visible toggle (e.g., "Try the new experience" banner) so users can switch between old and new versions during the transition period.

### Code Review Checklist
- [ ] Primary navigation follows established web conventions (logo top-left, nav bar top, search top-right)
- [ ] Form controls use standard HTML elements or custom components that replicate native keyboard and screen reader behavior
- [ ] Common user flows (login, search, checkout) follow widely established patterns from major platforms
- [ ] Major UI redesigns include a gradual rollout mechanism (feature flags, opt-in toggle)

### Origins
Jakob's Law was coined by Jakob Nielsen, a User Advocate and principal of the Nielsen Norman Group which he co-founded with Dr. Donald A. Norman (former VP of research at Apple Computer). Dr. Nielsen established the "discount usability engineering" movement for fast and cheap improvements of user interfaces and has invented several usability methods, including heuristic evaluation.

### Examples
- *Form Controls:* Things like form toggles, radio inputs, and even buttons originated from the design of their tactile counterparts.
- *YouTube Redesign:* When YouTube launched a new version in 2017, they allowed desktop users to preview the new Material Design UI without committing. Users could preview, submit feedback, and revert to the old version if they preferred. This avoided mental model discordance by empowering users to switch when ready.

### Further Reading
- [Jakob's Law of Internet User Experience](https://www.nngroup.com/videos/jakobs-law-internet-ux/) - Nielsen Norman Group
- [The Power Law of Learning: Consistency vs. Innovation in User Interfaces](https://www.nngroup.com/articles/power-law-learning/) - Nielsen Norman Group
- [Familiar vs Novel](https://lawsofux.com/articles/2024/familiar-vs-novel/) - Jon Yablonski | Laws of UX
- [Top 10 Mistakes in Web Design](https://www.nngroup.com/articles/top-10-mistakes-web-design/) - Nielsen Norman Group
- [End of Web Design](https://www.nngroup.com/articles/end-of-web-design/) - Nielsen Norman Group
