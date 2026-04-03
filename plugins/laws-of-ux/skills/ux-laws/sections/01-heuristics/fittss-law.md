## Fitts's Law

**Summary:** The time to acquire a target is a function of the distance to and size of the target. Larger, closer targets are faster and easier to select, which directly impacts interactive element sizing and placement.

### Key Takeaways
- Touch targets should be large enough for users to accurately select them.
- Touch targets should have ample spacing between them.
- Touch targets should be placed in areas of an interface that allow them to be easily acquired.

### Frontend Code Implications
- Touch targets must be minimum 44x44px (WCAG 2.5.5) or 48x48px (Material Design). Apply `min-width: 44px; min-height: 44px;` to all clickable elements. For icon-only buttons, use padding to reach the minimum: `padding: 12px;` on a 24px icon.
- Buttons and interactive elements must have minimum 8px spacing between them (`gap: 8px` in Flexbox/Grid) to prevent mis-taps. On mobile, increase to 12px minimum.
- Place primary actions in easily reachable zones: bottom of the viewport on mobile (`position: fixed; bottom: 0;`), and in the natural reading flow (top-left to center) on desktop. Avoid placing critical actions in hard-to-reach corners.
- Destructive or irreversible actions (delete, cancel) should be smaller and/or further from primary actions to reduce accidental activation. Never place "Delete" directly adjacent to "Save" without spacing or visual differentiation.

### Code Review Checklist
- [ ] All interactive elements (buttons, links, form controls) meet minimum 44x44px touch target size
- [ ] Interactive elements have minimum 8px gap between them (12px on mobile)
- [ ] Primary CTAs are positioned in thumb-reachable zones on mobile layouts
- [ ] Destructive actions are visually separated from primary actions with adequate spacing

### Origins
In 1954, psychologist Paul Fitts showed that the time required to move to a target depends on the distance to it and relates inversely to its size. Fast movements and small targets result in greater error rates due to the speed-accuracy trade-off. The law is widely applied in UX/UI design, influencing conventions like making interactive buttons large on touch devices.

### Examples
- Mobile navigation bars placed at the bottom of the screen (e.g., iOS tab bar) are easier to reach with the thumb than top-positioned menus.
- Floating action buttons (FABs) in Material Design are 56px diameter, well above the minimum touch target, and positioned in the bottom-right thumb zone.
- Desktop applications place frequently used toolbar buttons larger and closer together while keeping destructive actions (like "Delete") isolated.

### Further Reading
- [Fitts's Law and Its Applications in UX](https://www.nngroup.com/articles/fitts-law/) - Nielsen Norman Group
- [Fitts' Law In The Touch Era](https://www.smashingmagazine.com/2022/02/fitts-law-touch-era/) - Smashing Magazine
- [Fitts's Law: The Importance of Size and Distance in UI Design](https://www.interaction-design.org/literature/article/fitts-s-law-the-importance-of-size-and-distance-in-ui-design) - Interaction Design Foundation
- [Fitts's Law on Wikipedia](https://en.wikipedia.org/wiki/Fitts%27s_law) - Wikipedia
- [Design for Fingers, Touch, and People, Part 1](https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php) - Steven Hoober | UX Matters
- [The information capacity of the human motor system in controlling the amplitude of movement](https://pdfs.semanticscholar.org/634c/9fde5f1c411e4487658ac738dcf18d98ea8d.pdf) - Semantic Scholar
