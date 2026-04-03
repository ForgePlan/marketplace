## Von Restorff Effect

**Summary:** Also known as the Isolation Effect, the Von Restorff Effect predicts that when multiple similar objects are present, the one that differs from the rest is most likely to be remembered. Use visual distinction strategically to highlight key actions and information.

### Key Takeaways
- Make important information or key actions visually distinctive.
- Use restraint when placing emphasis on visual elements to avoid them competing with one another and to ensure salient items don't get mistakenly identified as ads.
- Don't exclude those with a color vision deficiency or low vision by relying exclusively on color to communicate contrast.
- Carefully consider users with motion sensitivity when using motion to communicate contrast.

### Frontend Code Implications
- Use color, size, or animation to highlight primary CTAs. A primary button should use a filled background (`background-color`) while secondary buttons use `border` or `background: transparent`. Ensure contrast ratio meets WCAG AA: 4.5:1 for text, 3:1 for UI components.
- Do not rely solely on color for distinction. Combine color with shape (filled vs outlined icons), size (`font-size`, `padding`), weight (`font-weight: 700` vs `400`), or iconography so color-blind users can perceive the difference.
- Use `prefers-reduced-motion` media query to provide non-animated alternatives when using motion to draw attention. For example: `@media (prefers-reduced-motion: reduce) { .highlight { animation: none; border: 3px solid var(--accent); } }`.
- Limit the number of visually distinctive elements per screen to one or two. If everything is highlighted, nothing stands out. Use a single accent color for the primary action and neutral tones for everything else.

### Code Review Checklist
- [ ] Primary CTAs are visually distinct from secondary and tertiary actions through multiple cues (color + size + weight), not color alone
- [ ] Contrast ratios meet WCAG AA (4.5:1 text, 3:1 UI components) for all distinctive elements
- [ ] Motion-based emphasis respects `prefers-reduced-motion` with a static fallback
- [ ] No more than 1-2 elements per screen compete for visual prominence

### Origins
The theory was coined by German psychiatrist and pediatrician Hedwig von Restorff (1906-1962), who in her 1933 study found that when participants were presented with a list of categorically similar items with one distinctive, isolated item on the list, memory for that item was improved.

### Examples
- **Pricing Tables:** The recommended pricing tier is visually elevated with a different background color, a "Most Popular" badge, and slightly larger card size, while other tiers share the same neutral styling.
- **Call to Action:** A single "Sign Up" button in a bold accent color on a landing page where all other links and buttons use subdued, outlined styles.

### Further Reading
- [Psychology in Design (Part 1)](https://blog.prototypr.io/psychology-in-design-part-1-cdc63229cbe4) - Andri Budzinskiy | Medium.com
- [The Psychology Principles Every UI/UX Designer Needs to Know](https://blog.marvelapp.com/psychology-principles-every-uiux-designer-needs-know/) - Thanasis Rigopoulos | Marvel
- [Von Restorff Effect on Wikipedia](https://en.wikipedia.org/wiki/Von_Restorff_effect) - Wikipedia
- [Superior pattern processing is the essence of the evolved human brain](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4141622/) - Mark P. Mattson
- [Working Memory and Attention -- A Conceptual Analysis and Review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6688548/) - Klaus Oberauer
