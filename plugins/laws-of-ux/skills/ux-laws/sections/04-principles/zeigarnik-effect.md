## Zeigarnik Effect

**Summary:** People remember uncompleted or interrupted tasks better than completed tasks. Showing incomplete progress and open loops in interfaces motivates users to return and finish what they started.

### Key Takeaways
- Users are more likely to return to and complete interrupted tasks because incomplete actions remain cognitively active — this open-loop tension drives re-engagement.
- Expose unfinished state persistently (saved drafts, incomplete profiles, paused downloads) to leverage the open-loop tension and motivate users to return and complete.
- Invite content discovery by providing clear signifiers of additional content — partially visible items signal there is more to explore.

### Frontend Code Implications
- Profile completion prompts should show a progress ring or bar with a percentage: `<progress value="65" max="100">65%</progress>` with text like "Your profile is 65% complete". Use a ring chart (SVG `<circle>` with `stroke-dasharray` and `stroke-dashoffset`) for visual impact. Place this prominently on the dashboard.
- For content feeds and carousels, show partial content at the edge of the viewport to signal there is more to discover. Use `overflow-x: auto` with items that peek 30-50px past the container edge. Do not clip content flush with the viewport boundary.
- Incomplete task lists should visually distinguish completed vs. pending items: use `text-decoration: line-through; opacity: 0.6` for completed items and bold/highlighted styling for the next uncompleted item. Show "3 of 7 tasks complete" as a persistent counter.
- For onboarding checklists, persist completion state in `localStorage` or backend, and show the checklist as a persistent widget (sidebar or floating panel) until all items are done. Use a checkmark animation on completion of each item to provide satisfying feedback while the remaining unchecked items maintain the open-loop motivation.

### Code Review Checklist
- [ ] Incomplete multi-step flows show clear progress indicators (percentage, step count, progress bar)
- [ ] Content carousels and feeds show partial next items to signal additional content exists
- [ ] Task lists visually differentiate completed vs. pending items with a running completion count
- [ ] User progress state is persisted (localStorage, database) so returning users see their incomplete tasks

### Origins
Bluma Wulfovna Zeigarnik (1900-1988) was a Soviet psychologist who, in the 1920s, conducted a study on memory comparing recall of incomplete and complete tasks. She found that incomplete tasks are easier to remember than completed ones. This became known as the Zeigarnik effect. She later received the Lewin Memorial Award in 1983 for her psychological research.

### Examples
- LinkedIn's profile strength meter ("Your profile is 70% complete -- add a photo to reach All-Star status") leverages the Zeigarnik effect to motivate users to fill in missing profile sections.
- Netflix auto-playing the next episode and showing a "Continue Watching" row keeps incomplete series top-of-mind, driving users to return and finish watching.

### Further Reading
- [How to Use the Zeigarnik Effect in UX](https://www.nngroup.com/videos/zeigarnik-effect/) - Feifei Liu | Nielsen Norman Group
- [Endowed progress effect: Give your users a head start](https://uxdesign.cc/endowed-progress-effect-give-your-users-a-head-start-97d52d8b0396) - Canvs Editorial | UX Collective
- [Moving the Finish Line: The Goal Gradient Hypothesis](https://fs.blog/2016/10/goal-gradient-hypothesis/) - Farnam Street
- [The Zeigarnik Effect: Why it is so hard to leave things incomplete](https://medium.com/coffee-and-junk/design-psychology-zeigarnik-effect-a53688b7f6d1) - Abhishek Chakraborty | Medium.com
- [Zeigarnik Effect](http://coglode.com/gem/zeigarnik-effect) - Coglode
- [Zeigarnik Effect on Wikipedia](https://en.wikipedia.org/wiki/Bluma_Zeigarnik) - Wikipedia
