## Selective Attention

**Summary:** Selective attention is the process of focusing on a subset of stimuli in an environment, usually those related to the user's current goals, while filtering out the rest. Designers must guide attention, prevent overwhelm, and ensure important changes are noticed.

### Key Takeaways
- People often filter out information that isn't relevant. This happens in order to maintain focus on information that is important or relevant to the task at hand. Designers must guide users' attention, prevent them from being overwhelmed or distracted, and help them find relevant information or action.
- Banner Blindness is an example phenomenon of selective attention where visitors consciously or unconsciously ignore banner-like information. Users have learned to ignore content that resembles ads, is close to ads, or appears in locations traditionally dedicated to ads. Avoid confusion by not styling content to look like ads or placing content and ads in the same visual section.
- Change blindness occurs when significant changes in an interface go unnoticed due to the limitations of human attention and the lack of strong cues. Avoid this by analyzing your design for any competing changes that may happen at the same time and that may divert attention from each other.

### Frontend Code Implications
- Never style important content or CTAs to resemble banner ads. Avoid placing content in the standard 728x90 or 300x250 pixel regions at the top or right sidebar. Do not use overly promotional color blocks or animation patterns that trigger banner blindness.
- When content updates dynamically (e.g., a notification count changes, a toast appears), use `aria-live="polite"` or `aria-live="assertive"` regions so screen readers announce changes, and use brief CSS animations (`transition: background-color 0.3s`) to draw visual attention to the updated area.
- Limit simultaneous visual changes to one focal point at a time. If a save operation triggers both a success toast and a form reset, stagger them -- show the toast first, then clear the form after a brief delay (`setTimeout`, 300-500ms).
- Use visual hierarchy (size, color, contrast, position) to direct attention to primary actions. Primary buttons should have strong contrast (`background-color` with 4.5:1 ratio against background), while secondary actions use outlined or ghost styles.

### Code Review Checklist
- [ ] Important content is not styled in a way that resembles advertisements (banner-like dimensions, promotional animation)
- [ ] Dynamic content changes use `aria-live` regions for accessibility
- [ ] Simultaneous visual updates are minimized; competing animations do not distract from each other
- [ ] Primary actions are visually prominent and secondary actions are visually subordinate

### Origins
Selective Attention Theory originated in the mid-20th century. Donald Broadbent proposed the Filter Theory in 1958, suggesting an attentional bottleneck that processes limited information at a time. E. Colin Cherry studied the "cocktail party phenomenon" in 1953. Anne Treisman refined the theory in 1960 with her Attenuation Model, and Deutsch and Deutsch proposed Late Selection Theory in 1963. Kahneman's 1973 capacity model viewed attention as a limited resource that could be divided among tasks.

### Examples
- **Banner Blindness:** Users skip over a legitimate product announcement because it is placed in a 728x90 banner position at the top of the page and styled with bright promotional colors.
- **Change Blindness:** A form error message appears at the top of a long page after submission, but the user does not scroll up to see it because no visual cue directed their attention there.

### Further Reading
- [Change Blindness in UX: Definition](https://www.nngroup.com/articles/change-blindness-definition/) - Raluca Budiu | Nielsen Norman Group
- [Banner Blindness Revisited: Users Dodge Ads on Mobile and Desktop](https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/) - Kara Pernice | Nielsen Norman Group
- [How We Use Selective Attention to Filter Information and Focus](https://www.verywellmind.com/what-is-selective-attention-2795022) - Kendra Cherry, MSEd | VerywellMind
- [Tunnel Vision and Selective Attention](https://www.nngroup.com/articles/tunnel-vision-and-selective-attention/) - Jakob Nielsen | Nielsen Norman Group
