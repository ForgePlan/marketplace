## Law of Pragnanz

**Summary:** People will perceive and interpret ambiguous or complex images as the simplest form possible, because it requires the least cognitive effort. Interfaces should favor simple, clean shapes and layouts over complex ones.

### Key Takeaways
- The human eye likes to find simplicity and order in complex shapes because it prevents us from becoming overwhelmed with information.
- Research confirms that people are better able to visually process and remember simple figures than complex figures.
- The human eye simplifies complex shapes by transforming them into a single, unified shape.

### Frontend Code Implications
- Use simple geometric shapes for UI elements: rectangular cards (`border-radius: 8px`), circular avatars (`border-radius: 50%`), and pill-shaped badges (`border-radius: 9999px`). Avoid irregular or complex SVG clip-paths for content containers.
- Reduce visual noise by limiting the number of distinct border styles, shadow depths, and color variations on a single screen. Use at most 2-3 `box-shadow` elevation levels (e.g., `0 1px 3px`, `0 4px 12px`, `0 8px 24px`).
- Icons should use a single consistent stroke weight and style (e.g., all 1.5px stroke, all rounded caps). Mixing filled and outlined icon styles on the same screen creates visual complexity that fights Pragnanz.
- Simplify layout structures: prefer single-column or two-column CSS Grid layouts over complex multi-region compositions. Each viewport breakpoint should reduce, not add, layout complexity (e.g., collapse sidebar on mobile with `@media (max-width: 768px)`).

### Code Review Checklist
- [ ] UI containers use simple, consistent geometric shapes (no irregular clip-paths on functional elements)
- [ ] Shadow elevation system uses 3 or fewer levels, applied consistently
- [ ] Icon set uses a single style (all outline or all filled, consistent stroke weight)
- [ ] Layout does not exceed 3 distinct content regions visible simultaneously without scrolling

### Origins
In 1910, psychologist Max Wertheimer had an insight when he observed a series of lights flashing on and off at a railroad crossing, similar to lights encircling a movie theater marquee. To the observer, it appeared as if a single light moved around, when in reality it was a series of bulbs turning on and off. This observation led to a set of descriptive principles about how we visually perceive objects, forming the heart of Gestalt design principles.

### Examples
- A logo composed of overlapping circles is perceived as a unified symbol rather than as multiple separate shapes, even though the individual circles are distinct elements.
- Users perceive a set of navigation tabs as a single unified bar rather than as individual rectangles, especially when the tabs share consistent height, color, and typography.

### Further Reading
- [Design Principles: Visual Perception And The Principles Of Gestalt](https://www.smashingmagazine.com/2014/03/design-principles-visual-perception-and-the-principles-of-gestalt/) - Steven Bradley | Smashing Magazine
- [The Laws of Figure/Ground, Pragnanz, Closure, and Common Fate](https://www.interaction-design.org/literature/article/the-laws-of-figure-ground-praegnanz-closure-and-common-fate-gestalt-principles-3) - Mads Soegaard | Interaction Design Foundation
