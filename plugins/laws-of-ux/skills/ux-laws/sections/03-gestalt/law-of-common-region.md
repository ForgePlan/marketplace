## Law of Common Region

**Summary:** Elements tend to be perceived into groups if they share an area with a clearly defined boundary. Adding borders or background colors around related elements creates instant visual grouping that helps users understand structure.

### Key Takeaways
- Common region creates a clear structure and helps users quickly and effectively understand the relationship between elements and sections.
- Adding a border around an element or group of elements is an easy way to create common region.
- Common region can also be created by defining a background behind an element or group of elements.

### Frontend Code Implications
- Use `border: 1px solid var(--color-border)` or `background-color: var(--color-surface)` to create visual containers around related content groups (e.g., form fieldsets, card sections, settings panels).
- Apply consistent `padding: 16px 20px` inside region containers and `gap: 24px` or `margin-bottom: 24px` between separate regions to reinforce grouping boundaries.
- Use the `<fieldset>` element for form groups and `<section>` for content areas rather than purely decorative `<div>` wrappers -- semantic HTML reinforces the visual grouping for assistive technologies.
- Apply `border-radius: 8px` consistently on all region containers. Avoid mixing sharp corners and rounded corners for containers at the same hierarchy level.

### Code Review Checklist
- [ ] Related form fields are wrapped in a visual container (border, background, or `<fieldset>`) rather than floating loosely
- [ ] Padding inside grouped regions is consistent (same value across all cards/panels)
- [ ] Spacing between separate regions is visibly larger than spacing within regions (e.g., 24px between vs. 12px within)
- [ ] Semantic HTML elements (`<fieldset>`, `<section>`) are used where appropriate instead of generic `<div>` containers

### Origins
The principles of grouping (Gestalt laws of grouping) were first proposed by Gestalt psychologists to account for the observation that humans naturally perceive objects as organized patterns. Gestalt psychologists argued these principles exist because the mind has an innate disposition to perceive patterns in stimuli based on certain rules, organized into categories including Proximity, Similarity, Continuity, Closure, and Connectedness.

### Examples
- A settings page where each group of options (e.g., "Notifications", "Privacy", "Account") is enclosed in a card with a subtle background color and border, making it immediately clear which toggles belong together.
- A dashboard where widgets are separated into distinct bordered panels, each with its own background shade, so users can quickly scan and identify different data sections.

### Further Reading
- [The Principle of Common Region: Containers Create Groupings](https://www.nngroup.com/articles/common-region/) - Aurora Harley | Nielsen Norman Group
- [Design Principles: Visual Perception And The Principles Of Gestalt](https://www.smashingmagazine.com/2014/03/design-principles-visual-perception-and-the-principles-of-gestalt/) - Steven Bradley | Smashing Magazine
- [Gestalt principles](http://www.scholarpedia.org/article/Gestalt_principles) - Scholarpedia
