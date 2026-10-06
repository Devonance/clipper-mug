# Clipper Mug: an interactive explainer

**Live site: https://devonance.github.io/clipper-mug/**

An unofficial, interactive 3D explainer of the *Europa Clipper Geometry Reference Tool* mug. The mug's wrap-around print is an unrolled map of the spacecraft's body frame. This site explains every item on it in 13 stations, in a physical way: you see what each part is, where it sits on the real spacecraft, and what it does during a Europa flyby.

- **ELI5 / Engineer switch:** plain words for everyone, or frames, numbers and sources.
- **Definitions everywhere:** every dotted word has a pop-up, and there is a searchable glossary.
- **The mug in 3D:** hover or tap anything printed on it, or unroll the print flat.
- **Fast and self-contained:** one static page with no external requests. The three.js stage is bundled, and every texture is drawn at runtime.

This repository holds only the built site.

## Credits
- Facts come from public NASA/JPL pages and the mission's open-access *Space Science Reviews* papers, cited in the Engineer text. This is a fan project, not affiliated with or endorsed by NASA or JPL.
- Lid + coaster: [Europa Clipper Mug Lid + Coaster](https://www.thingiverse.com/thing:7387069) by ddThingz (CC BY-SA)
- Music: *Under The Jovian Sky*, made by Kevin with Google Lyria
- 3D: [three.js](https://threejs.org) (MIT), bundled into `js/stage.js`
