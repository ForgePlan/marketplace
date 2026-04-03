## Chunking

**Summary:** Chunking is the process of breaking individual pieces of information into grouped, meaningful units. It enables users to scan, process, and memorize content more efficiently by aligning with how the brain naturally organizes data.

### Key Takeaways
- Chunking enables users to easily scan content. It allows them to easily identify the information that aligns with their goals and process that information to achieve their goals more quickly.
- Structuring content into visually distinct groups with a clear hierarchy enables designers to align information with how people evaluate and process digital content.
- Chunking can be used to help users understand underlying relationships by grouping content into distinctive modules, applying rules to separate content, and providing hierarchy.

### Frontend Code Implications
- Format phone numbers with input masks `(XXX) XXX-XXXX`, credit card numbers as `XXXX XXXX XXXX XXXX`, and dates as `MM/DD/YYYY`. Use `inputmode` attributes and `pattern` attributes for validation.
- Group related form fields inside `<fieldset>` elements with descriptive `<legend>` tags. Separate groups with `margin-bottom: 24px-32px` or visible dividers (`border-bottom: 1px solid`).
- Break long lists into visual chunks of 3-5 items using CSS Grid or Flexbox with `gap`. Use headings (`<h2>`, `<h3>`) and whitespace to create clear content hierarchy.
- For data tables, use alternating row backgrounds (`tr:nth-child(even)`) and group related columns with `<colgroup>`. Insert visual separators between logical sections.

### Code Review Checklist
- [ ] Long sequences of data (phone, card, account numbers) are formatted with visual separators or input masks
- [ ] Related form fields are grouped with `<fieldset>`/`<legend>` or equivalent ARIA grouping
- [ ] Content sections have clear visual separation via spacing, borders, or background color
- [ ] Lists exceeding 5-7 items are broken into labeled sub-groups or categories

### Origins
The word chunking comes from George A. Miller's 1956 paper "The Magical Number Seven, Plus or Minus Two." Miller observed that short-term memory did not fit the channel capacity model of information theory, leading to the concept of grouping individual bits into meaningful chunks to extend effective memory capacity.

### Examples
- **Input Formatting:** Phone number fields that automatically insert dashes or parentheses as the user types, turning `5551234567` into `(555) 123-4567`.
- **Content Layout:** Blog articles that break long text into sections with subheadings, bullet points, and whitespace to aid scanning.

### Further Reading
- [How Chunking Helps Content Processing](https://www.nngroup.com/articles/chunking/) - Kate Moran | Nielsen Norman Group
- [Chunking](https://www.interaction-design.org/literature/book/the-glossary-of-human-computer-interaction/chunking) - Interaction Design Foundation
- [Why Chunking Content is Important [Video]](https://www.nngroup.com/videos/chunking/) - Kate Moran | Nielsen Norman Group
