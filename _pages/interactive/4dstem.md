---
layout: page
title: interactive 4D-STEM
permalink: /interactive/4dstem/
description: Watch the diffraction pattern change as you scan an electron probe across a polycrystalline sample.
nav: false
---

Drag the electron probe across the polycrystalline sample to see how the diffraction pattern changes at each position. Use the sliders to
switch between nanobeam diffraction (small convergence semiangle, separated Bragg disks) and ptychographic imaging conditions (large
semiangle, overlapping disks). The defocus slider shifts the probe crossover, changing the illumination on the sample.

<div data-widget="stem4d-sim"></div>

<script type="module" src="{{ '/assets/js/widgets/mount.js' | relative_url }}"></script>

<p class="text-muted small mt-2">Interactive widget by <a href="https://colab.stanford.edu">Colin Ophus</a>, from the
<a href="https://colab.stanford.edu/interactive">Ophus Lab website</a>.</p>

## What is 4D-STEM?

In scanning transmission electron microscopy (STEM), a focused electron probe is rastered across the sample. In **4D-STEM**, a fast pixelated
detector records a full 2D diffraction pattern at every 2D probe position, giving a four-dimensional dataset. That one dataset can be
analyzed after the experiment in many ways: virtual imaging, crystal orientation and strain mapping, or phase retrieval with
[ptychography]({{ '/interactive/ptychography/' | relative_url }}).

Open-source tools for this analysis include [quantEM](https://github.com/electronmicroscopy/quantem) and
[py4DSTEM](https://github.com/py4dstem/py4DSTEM).
