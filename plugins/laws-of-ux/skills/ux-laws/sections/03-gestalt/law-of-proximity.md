## Law of Proximity

**Summary:** Objects that are near, or proximate to each other, tend to be grouped together. Spatial closeness signals relatedness, making proximity one of the most powerful tools for organizing interface elements.

### Key Takeaways
- Proximity helps to establish a relationship with nearby objects.
- Elements in close proximity are perceived to share similar functionality or traits.
- Proximity helps users understand and organize information faster and more efficiently.

### Frontend Code Implications
- Related form labels and inputs must have `gap: 4px` to `8px` between them. Group spacing between separate field groups should be `24px` or more. Use CSS `gap` property on flex/grid containers for consistent spacing.
- In navigation menus, related links should be grouped with `gap: 4px` to `8px` while separate nav sections use `gap: 24px` or a visible divider (`border-top: 1px solid var(--color-border)`).
- In card layouts, elements within a card (title, description, meta) should use tight spacing (`gap: 4px` to `8px`) while cards themselves are separated by `16px` to `24px` using CSS Grid `gap`.
- For list items with actions (e.g., edit/delete buttons), keep the action buttons within `8px` of their parent row content. Do not float actions far to the right edge where the proximity relationship breaks down on wide screens -- use `max-width` on the row or `margin-inline-start: auto` with a reasonable cap.

### Code Review Checklist
- [ ] Form labels are visually closer to their own input than to the adjacent field's input (label-to-input gap < field-to-field gap)
- [ ] Related content groups use tighter internal spacing than the space separating them from other groups
- [ ] CSS `gap` property is used on flex/grid containers instead of individual margins for consistent spacing
- [ ] On wide viewports, related elements remain visually proximate (use `max-width` or constrained grid columns)

### Origins
The principles of grouping (Gestalt laws of grouping) were first proposed by Gestalt psychologists to account for the observation that humans naturally perceive objects as organized patterns. These principles are organized into categories including Proximity, Similarity, Continuity, Closure, and Connectedness.

### Examples
- *Google Search Results:* The spacing between each result on Google's search results page contributes to the overall scannability of the page but also helps to effectively group each result as a related cluster of information.

### Further Reading
- [Gestalt Principles of Design -- Proximity](https://www.chrbutler.com/gestalt-principles-of-design-proximity) - Chris Butler
- [Proximity Principle in Visual Design](https://www.nngroup.com/articles/gestalt-proximity/) - Aurora Harley | Nielsen Norman Group
- [Laws of Proximity, Uniform Connectedness, and Continuation](https://www.interaction-design.org/literature/article/laws-of-proximity-uniform-connectedness-and-continuation-gestalt-principles-2) - Mads Soegaard | Interaction Design Foundation
- [The Psychology Principles Every UI/UX Designer Needs to Know](https://blog.marvelapp.com/psychology-principles-every-uiux-designer-needs-know/) - Thanasis Rigopoulos | Marvel
- [Design Principles: Visual Perception And The Principles Of Gestalt](https://www.smashingmagazine.com/2014/03/design-principles-visual-perception-and-the-principles-of-gestalt/) - Steven Bradley | Smashing Magazine
