## Cognitive Load

**Summary:** Cognitive load is the total amount of mental effort required to understand and interact with an interface. When the load exceeds a user's available mental resources, tasks become harder, details are missed, and users feel overwhelmed.

### Key Takeaways
- When the amount of information coming in exceeds the space we have available, we struggle mentally to keep up -- tasks become more difficult, details are missed, and we begin to feel overwhelmed.
- Intrinsic cognitive load refers to the effort required by users to carry around information relevant to their goal, absorb new information and keep track of their goals.
- Extraneous cognitive load refers to the mental processing that takes up resources but doesn't help users understand the content of an interface (e.g. distracting or unnecessary design elements).

### Frontend Code Implications
- Remove decorative elements that do not serve the user's task. Eliminate gratuitous animations (`animation`, `transition`) on non-interactive elements. Every visual element should earn its place.
- Reduce form fields to the essential minimum. If a field can be derived (e.g., city from ZIP code), auto-populate it. Use `autocomplete` attributes (`autocomplete="email"`, `autocomplete="address-level2"`) to reduce typing effort.
- Show validation messages inline next to the relevant field (`aria-describedby` linking input to error), not collected in a bulk list at the top of the form. Use real-time validation on `blur` events so users fix issues as they go.
- Use progressive disclosure: hide advanced options behind a "Show more" toggle or an expandable `<details>`/`<summary>` element. Show only what the user needs at each step.

### Code Review Checklist
- [ ] Form fields use appropriate `autocomplete` attributes to reduce manual input
- [ ] Validation errors appear inline next to the relevant field, not in a bulk summary only
- [ ] Advanced or rarely-used options are hidden behind progressive disclosure (details/summary, accordion, tabs)
- [ ] Decorative animations and non-functional visual elements are minimized or removed
- [ ] Each screen/step shows only the information necessary for the current task

### Origins
Cognitive load theory was developed in the late 1980s by John Sweller as an expansion on the information processing theories of George Miller. Sweller argued that instructional design can reduce cognitive load in learners, publishing "Cognitive Load Theory, Learning Difficulty, and Instructional Design" in 1988. Researchers later developed methods to measure perceived mental effort as an indicator of cognitive load.

### Examples
- **Simplified Checkout:** A checkout flow that shows one step at a time (shipping, payment, review) instead of a single long form with all fields visible.
- **Progressive Disclosure:** A settings page that shows basic options by default and hides advanced configuration behind an "Advanced Settings" expandable section.

### Further Reading
- [What Is Cognitive Load? [Video]](https://www.nngroup.com/videos/cognitive-load/) - Maddie Brown | Nielsen Norman Group
- [Ease Cognitive Overload in UX Design](https://mailchimp.com/resources/cognitive-overload/) - Mailchimp
- [Minimize Cognitive Load to Maximize Usability](https://www.nngroup.com/articles/minimize-cognitive-load/) - Kathryn Whitenton | Nielsen Norman Group
- [Design Principles for Reducing Cognitive Load](https://lawsofux.com/articles/2015/design-principles-for-reducing-cognitive-load/) - Jon Yablonski | Laws of UX
- [Reducing Cognitive Overload For A Better User Experience](https://www.smashingmagazine.com/2016/09/reducing-cognitive-overload-for-a-better-user-experience/) - Danny Halarewich | Smashing Magazine
