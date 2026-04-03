## Cognitive Bias

**Summary:** Cognitive biases are systematic errors in thinking that influence perception, judgment, and decision-making. Understanding them helps designers avoid exploiting users and instead create interfaces that support sound decision-making.

### Key Takeaways
- Rather than thinking through every situation, we conserve mental energy by developing rules of thumb to make decisions which are based on past experiences. These mental shortcuts increase our efficiency by enabling us to make quick decisions without the need to thoroughly analyze a situation but can also influence our decision-making processes and judgement without our awareness.
- Understanding of our own intrinsic biases may not eliminate them completely from our decision-making but it increases the chance that we can identify them in ourselves and others and serve as a safeguard against fallacious reasoning, unintentional discrimination or costly mistakes in our decisions.
- Take for example our tendency to seek out, interpret, and recall information in a way that confirms their preconceived notions and ideas. This is known as confirmation bias, and it can make having a logical discussion about a polarizing hot-button issue with someone incredibly difficult.

### Frontend Code Implications
- Present pricing and comparison tables with objective data side by side. Avoid pre-selecting the most expensive option or using dark patterns like hidden checkboxes (`<input type="checkbox" checked>` for add-ons the user did not request).
- Use neutral, descriptive microcopy for CTAs. Avoid shame-based opt-out language ("No thanks, I don't want to save money"). Label buttons with what they do: "Subscribe", "Skip", "Close".
- Display social proof (reviews, ratings) alongside product information but ensure counts and averages are accurate and not artificially inflated. Use `<time datetime="">` for review dates so recency is transparent.
- When showing defaults or recommendations, clearly label them as such (`aria-label="Recommended"`) and make it equally easy to choose alternatives.

### Code Review Checklist
- [ ] No pre-selected options that benefit the business at the user's expense (dark patterns)
- [ ] Opt-out flows are as easy as opt-in flows (same number of steps, same button prominence)
- [ ] Comparison UIs present data objectively without misleading visual weight on a preferred option
- [ ] Microcopy is neutral and does not use guilt, fear, or shame to influence decisions

### Origins
Amos Tversky and Daniel Kahneman introduced the notion of cognitive biases in 1972 after observing people's inability to reason intuitively with greater orders of magnitude. Through replicable experiments, they demonstrated that human judgment differs from rational choice theory, explaining differences in terms of heuristics -- mental shortcuts that provide quick estimates but can introduce severe and systematic errors.

### Examples
- **Confirmation Bias:** A search interface that only surfaces results confirming the user's initial query phrasing, without suggesting alternative perspectives or corrections.
- **Anchoring Bias:** A pricing page that shows a high "original price" crossed out next to the sale price, anchoring the user's perception of value.
- **Default Bias:** Pre-checked newsletter signup boxes on registration forms exploit users' tendency to accept defaults.

### Further Reading
- [Thinking, Fast and Slow [Book]](https://us.macmillan.com/books/9780374533557/thinkingfastandslow) - Daniel Kahneman | Farrar, Straus and Giroux
- [Design for Cognitive Bias [Book]](https://abookapart.com/products/design-for-cognitive-bias.html) - David Dylan Thomas | A Book Apart
- [Decision Frames: How Cognitive Biases Affect UX Practitioners](https://www.nngroup.com/articles/decision-framing-cognitive-bias-ux-pros/) - Kathryn Whitenton | Nielsen Norman Group
- [Daniel Kahneman Explains The Machinery of Thought](https://fs.blog/daniel-kahneman-the-two-systems/) - Farnam Street
- [Cognitive Biases](https://www.interaction-design.org/literature/topics/cognitive-biases) - Interaction Design Foundation
- [How Cognitive Biases Influence the Way You Think and Act](https://www.verywellmind.com/what-is-a-cognitive-bias-2794963) - Kendra Cherry, MSEd | verywell mind
