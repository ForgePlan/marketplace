## Peak-End Rule

**Summary:** People judge an experience largely based on how they felt at its peak (most intense moment) and at its end, rather than the total sum of every moment. Design the emotional high points and final moments of any flow with extra care.

### Key Takeaways
- Pay close attention to the most intense points and the final moments (the "end") of the user journey.
- Identify the moments when your product is most helpful, valuable, or entertaining and design to delight the end user.
- Remember that people recall negative experiences more vividly than positive ones.

### Frontend Code Implications
- Design success/completion screens with care: after checkout, form submission, or onboarding completion, show a polished confirmation with illustration or animation (`@keyframes confetti` or Lottie animation), a clear summary of what was accomplished, and a next-action CTA. Do not show a bare "Success" text.
- Error states at critical moments (payment failure, form submission error) must be handled gracefully: use `role="alert"` for screen readers, display a clear explanation with recovery action ("Try again" button), and avoid generic messages like "Something went wrong". These negative peaks define the lasting impression.
- For loading-heavy operations (file uploads, data processing), animate the final transition from "processing" to "done" with a satisfying micro-interaction: a checkmark animation (`stroke-dasharray` + `stroke-dashoffset` CSS animation on an SVG path) that takes 400-600ms.
- End-of-session moments matter: save user progress with `beforeunload` event handlers, show a friendly "See you next time" message on logout, and send a well-designed confirmation email. The last interaction shapes the memory of the entire session.

### Code Review Checklist
- [ ] Success/completion screens include visual delight (illustration, animation, brand character) beyond plain text
- [ ] Error states at critical moments provide clear explanations and recovery actions, not generic messages
- [ ] Transitions from loading/processing to completion include a polished micro-animation
- [ ] End-of-flow moments (logout, checkout complete, onboarding done) are designed with the same care as entry points

### Origins
A 1993 study titled "When More Pain Is Preferred to Less: Adding a Better End" by Kahneman, Fredrickson, Schreiber, and Redelmeier provided groundbreaking evidence for the peak-end rule. Participants preferred a longer uncomfortable experience that ended slightly better over a shorter one, concluding that subjects chose based on the memory of the experience rather than the objective duration.

### Examples
- *Mailchimp:* After sending a campaign, Mailchimp shows a branded illustration with subtle animation and humor ("High fives! Your campaign is on its way"), turning a potentially stressful moment into a positive peak.
- *Uber:* By focusing on people's perceptions of time and waiting, Uber reduced its post-request cancellation rate by avoiding what could easily become a negative emotional peak through real-time driver tracking and wait-time estimates.

### Further Reading
- [Peak-End Rule](https://lawsofux.com/articles/2020/peak-end-rule/) - Jon Yablonski
- [How Uber uses psychology to perfect their customer experience](https://medium.com/choice-hacking/how-uber-uses-psychology-to-perfect-their-customer-experience-d6c440285029) - Jennifer Clinehens | Medium
- [The Peak-End Rule: How Impressions Become Memories](https://www.nngroup.com/articles/peak-end-rule) - Lexie Kane | Nielsen Norman Group
- [What is Peak-End Theory? A Psychologist Explains How Our Memory Fools Us](https://positivepsychology.com/what-is-peak-end-theory/) - Positive Psychology
- [How do our memories differ from our experiences?](https://thedecisionlab.com/biases/peak-end-rule/) - The Decision Lab
- [Peak-End Rule on Wikipedia](https://en.wikipedia.org/wiki/Peak%E2%80%93end_rule) - Wikipedia
- [When More Pain Is Preferred to Less: Adding a Better End](https://www.jstor.org/stable/40062570) - Daniel Kahneman, Barbara L. Fredrickson, Charles A. Schreiber and Donald A. Redelmeier
- [Evaluations of pleasurable experiences: The peak-end rule](https://link.springer.com/article/10.3758/PBR.15.1.96) - Amy M. Do, Alexander V. Rupert & George Wolford
