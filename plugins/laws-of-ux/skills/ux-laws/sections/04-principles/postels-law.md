## Postel's Law

**Summary:** Be liberal in what you accept, and conservative in what you send. Interfaces should accept a wide range of user inputs gracefully while producing clean, standardized output.

### Key Takeaways
- Be empathetic to, flexible about, and tolerant of any of the various actions the user could take or any input they might provide.
- Anticipate virtually anything in terms of input, access, and capability while providing a reliable and accessible interface.
- The more we can anticipate and plan for in design, the more resilient the design will be.
- Accept variable input from users, translating that input to meet your requirements, defining boundaries for input, and providing clear feedback to the user.

### Frontend Code Implications
- Accept multiple date formats in inputs: parse `MM/DD/YYYY`, `DD.MM.YYYY`, `YYYY-MM-DD`, and natural language ("Jan 15, 2025") using a library like `date-fns` or `dayjs`. Store and display in a single canonical format. Use `<input type="date">` where possible for native browser date pickers.
- Trim whitespace from all text inputs on blur: `input.value = input.value.trim()`. Accept phone numbers with or without country code, dashes, spaces, or parentheses (`+1 (555) 123-4567`, `5551234567`, `555-123-4567`) and normalize before validation.
- For search inputs, handle typos gracefully: implement fuzzy matching or "Did you mean?" suggestions. Accept queries with extra spaces, mixed case, and common misspellings. Normalize search terms with `.toLowerCase().trim().replace(/\s+/g, ' ')`.
- Email inputs should accept leading/trailing spaces (trim silently), mixed case (normalize to lowercase), and common domain typos (suggest "Did you mean gmail.com?" for "gmial.com"). Use `type="email"` with a permissive custom `pattern` attribute that does not over-restrict valid email formats.

### Code Review Checklist
- [ ] Text inputs trim whitespace on blur or before submission
- [ ] Phone, date, and numeric inputs accept multiple common formats and normalize internally
- [ ] Search handles typos, extra spaces, and mixed case gracefully
- [ ] Validation messages explain the expected format rather than just saying "Invalid input"

### Origins
Postel's Law (also known as the Robustness Principle) was formulated by Jon Postel, an early pioneer of the Internet. It is a design guideline for software, specifically regarding TCP and networks: "TCP implementations should follow a general principle of robustness: be conservative in what you do, be liberal in what you accept from others."

### Examples
- A shipping address form that accepts "St.", "Street", "ST", and "st" for street type and normalizes them all to a standard format before saving.
- A search bar that returns relevant results for "iphon" (missing letter), "iPhone" (mixed case), and " iphone " (extra whitespace) without requiring exact input.

### Further Reading
- [Design Systems and Postel's Law](https://markboulton.co.uk/journal/2016-05-17.design-systems-and-postels-law/) - Mark Boulton
- [Robustness and Least Power](https://adactio.com/journal/14327) - Adactio
- [Your Website has Two Faces](https://alistapart.com/article/your-website-has-two-faces) - A List Apart
- [Design with Difficult Data](https://alistapart.com/article/design-with-difficult-data/) - Steven Garrity
- [Robustness Principle on Wikipedia](https://en.wikipedia.org/wiki/Robustness_principle) - Wikipedia
