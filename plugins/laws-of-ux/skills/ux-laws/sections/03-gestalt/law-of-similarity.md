## Law of Similarity

**Summary:** The human eye tends to perceive similar elements as a complete picture, shape, or group, even if those elements are separated. Consistent visual styling signals that elements share functionality or meaning.

### Key Takeaways
- Elements that are visually similar will be perceived as related.
- Color, shape, and size, orientation and movement can signal that elements belong to the same group and likely share a common meaning or functionality.
- Ensure that links and navigation systems are visually differentiated from normal text elements.

### Frontend Code Implications
- All clickable elements of the same type must share identical visual treatment: primary buttons use `background-color: var(--color-primary); border-radius: 6px; padding: 10px 20px; font-weight: 600`, secondary buttons use `border: 1px solid var(--color-primary); background: transparent` -- never mix styles for buttons at the same hierarchy level.
- Links within body text must be consistently styled with `color: var(--color-link); text-decoration: underline` to differentiate them from non-interactive text. Do not use link color on non-clickable elements.
- Card components representing the same data type (e.g., product cards, article cards) must use identical dimensions, typography scale, and image aspect ratios. Enforce this via a shared component or CSS class rather than per-instance styling.
- Use consistent icon sizing (`width: 20px; height: 20px` for inline, `24px` for nav) and color (`currentColor` or a single icon token) across similar functional elements. Inconsistent icon sizes break the similarity signal.

### Code Review Checklist
- [ ] All buttons at the same hierarchy level share the same size, color, and border-radius
- [ ] Links are visually distinct from non-interactive text (color + underline or other non-color indicator)
- [ ] Repeated components (cards, list items, badges) use a shared component/class, not per-instance styles
- [ ] Icon sizes and colors are consistent across elements that serve the same function

### Origins
The principles of grouping (Gestalt laws of grouping) were first proposed by Gestalt psychologists to account for the observation that humans naturally perceive objects as organized patterns. These principles are organized into categories including Proximity, Similarity, Continuity, Closure, and Connectedness.

### Examples
- In a data table, alternating row background colors (`nth-child(even)`) still read as a unified table because the rows share the same column structure, font, and cell padding.
- A navigation bar where all items share the same font size, weight, and spacing is perceived as a single group, while the active item with a different color or underline stands out as the current selection.

### Further Reading
- [Gestalt Principles of Design -- Similarity](https://www.chrbutler.com/gestalt-principles-of-design-similarity) - Chris Butler
- [Similarity Principle in Visual Design](https://www.nngroup.com/articles/gestalt-similarity/) - Aurora Harley | Nielsen Norman Group
- [The Law of Similarity - Gestalt Principles](https://www.interaction-design.org/literature/article/the-law-of-similarity-gestalt-principles-1) - Interaction Design Foundation | Mads Soegaard
- [Design Principles: Visual Perception And The Principles Of Gestalt](https://www.smashingmagazine.com/2014/03/design-principles-visual-perception-and-the-principles-of-gestalt/) - Steven Bradley | Smashing Magazine
- [Use Gestalt Laws to Improve Your UX](http://blog.usabilla.com/gestalt-laws-start-with-thinking-basic/) - Sabina Idler | Usabilla Blog
