## Goal-Gradient Effect

**Summary:** The tendency to approach a goal increases with proximity to the goal. Users accelerate their behavior as they get closer to completing a task, and showing progress can dramatically boost completion rates.

### Key Takeaways
- The closer users are to completing a task, the faster they work towards reaching it.
- Providing artificial progress towards a goal will help to ensure users are more likely to have the motivation to complete that task.
- Provide a clear indication of progress in order to motivate users to complete tasks.

### Frontend Code Implications
- Multi-step forms must include a visible progress indicator: use a step bar (`<ol>` with styled `<li>` elements) or a progress bar (`<progress value="3" max="5">`) showing "Step 3 of 5". Place it at the top of the form, fixed or sticky (`position: sticky; top: 0`).
- For onboarding flows, pre-fill the progress bar to show artificial advancement (e.g., start at 20% instead of 0%) using `<progress value="1" max="5">` where step 1 is "Create Account" which they've already done. This leverages the endowed progress effect.
- Loyalty or gamification UIs should show a visual progress track with the current position clearly marked: use `width: ${percentage}%` on an inner bar div, with milestone markers at key thresholds using `position: absolute; left: ${milestone}%`.
- For long-running uploads or processing, show a determinate progress bar that updates in real-time via `requestAnimationFrame` or WebSocket events, not just an indeterminate spinner. Include percentage text alongside the bar.

### Code Review Checklist
- [ ] Multi-step flows display a progress indicator showing current step and total steps
- [ ] Progress indicators update in real-time as users complete each step (not only at the end)
- [ ] Long-running operations use determinate progress bars with percentage, not just spinners
- [ ] Onboarding or setup wizards give users a sense of initial progress (not starting at 0%)

### Origins
The goal-gradient hypothesis was originally proposed by behaviorist Clark Hull in 1932, stating that the tendency to approach a goal increases with proximity to the goal. Hull (1934) found that rats in a straight alley ran progressively faster as they proceeded from the starting box to the food. The implications for human behavior and consumer decision-making in reward programs were later studied extensively.

### Examples
- A coffee shop loyalty card that comes pre-stamped with 2 out of 12 stamps (artificial progress) results in higher completion rates than a blank 10-stamp card, even though both require 10 purchases.
- Uber's ride progress screen showing the driver approaching on a map, with estimated time decreasing, keeps users engaged and reduces cancellation rates.

### Further Reading
- [How Uber uses psychology to perfect their customer experience](https://medium.com/choice-hacking/how-uber-uses-psychology-to-perfect-their-customer-experience-d6c440285029) - Jennifer Clinehens | Choice Hacking
- [Moving the Finish Line: The Goal Gradient Hypothesis](https://fs.blog/2016/10/goal-gradient-hypothesis/) - Farnam Street
- [Designing for motivation with the goal-gradient effect](https://uxdesign.cc/designing-for-motivation-with-the-goal-gradient-effect-c873cdf58beb) - Ian Batterbee | UX Collective
- [The Goal-Gradient Hypothesis Resurrected: Purchase Acceleration, Illusionary Goal Progress, and Customer Retention](http://home.uchicago.edu/ourminsky/Goal-Gradient_Illusionary_Goal_Progress.pdf) - Ran Kivetz, Oleg Urminsky, Yuhuang Zheng | uchicago.edu
- [The importance of percent-done progress indicators for computer-human interfaces](https://www.researchgate.net/publication/234791131_The_importance_of_percent-done_progress_indicators_for_computer-human_interfaces) - Brad A. Myers | Carnegie Mellon University
