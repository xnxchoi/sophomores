# my vision for `tour`

`tour` is my version of an overlay/modal interface that intends to provide responsive guidance and help to user's needs.

The Tour component holds two distinct types: **Interface**, and **Registration**.

# Interface Tour

The former is a      
helper overlay that assists users in navigating the site UI and functionalities. As such, a
crucial component is the capacity to engage with users in subtle, uninterruptive yet intuitive
interactions - such as subtle toast message displayed where the user's focus would be at, or a gentle
outlining/highlighting of a UI they
seem
to be looking
for; or a popover placed and pointed at a relevant place in the viewport.
Akin to a great hotel staff- actively helpful, yet considerately uninterruptive; unseen unless necessary, but
efficient and impactful when engaging.

## Message

an example of what I would want the tool to communicate to the user :

"You rarely notice me - unless you are lost; I always step in instantly to help - either directly, or indirectly
through providing manuals/docs on the matter. "

## Theme/Intention

the theme is "nudges" - the behavioral economic concept. The core tenets in my opinion are 3:

- Effective & intuitive
- Uninterruptive & subtle
- Pleasant; not "actively", of course, but just good enough for the feeling to linger.

## Sketch of interaction scenarios

"Hey, if you need help locating a button press [some combination of keys] to bring up the help menu" if the user keeps
pressing a
similar but ineffective combination of keys (indicating they are repeating attempts to do SOMETHING and failing);

## Directive on the component

- The component is half-complete, both in the tour itself and, perhaps most critically, the "activation".
- Right now users don't know 1) usch a functionality exists at all, 2) nor do they know how to activate it.
- This component should made with extensibility in mind. If we do grow big enough to run user journey monitoring,
  per-page falloff rates/total time spent on platform, part of the learned improvements would plug directly in here;
  so this would mean that new, external data/content or code should be easily pluggable; on the flipside, we should
  have a strong, competent-enough-to-almost-be-a-SAAS-product level of standalone capability.
- A large portion of the attempt to deliver a high-quality, elite UX should be invested in plotting out a
  methodology for "subtly letting the user know of new or possibly overlooked features". The reason this compoonent
  has remained largely static is because the very first challenge - letting the user know that there is a "help
  overlay" - embodies much of the key driving factors of such tool's quality.
- so while I don't expect (nor see it desirable) to have a full-scale, modularized, easily customizable component
  from the get go, the fundamental structure and approach in implementation should condier the extensibility and
  modularity high priorities.

# Registration Tour

## Directive on the component

- Form submission & validation require serious reassessment and correction. Functionality, ux, design, security, and
  performance & efficiency are all in need of stress-testing; the larger intention and vision should be considered
  as well to ensure that we are well-adhering to the bigger picture as well. /readmes holds quite a few of relevantg 
  materials; whichever is more recent will always win if something conflicts between docs.
- Honestly, frontend
  layout/design and
  the modular
  structure is
  quite
  well-developed at
  this
  point. It's the form and
  relevant UX flow implementation that is proving to be a challenge.
- Not sure if this still happens, but prior to a quite heavy edits this component was for some reason causing an 
  infinite loop of navigating to the same page under `src/app/(frontend)/(site)/(auth)/me/onboarding`.