---
layout: page
title: interactive 4D-STEM
permalink: /interactive/4dstem/
description: Watch the diffraction pattern change as you scan an electron probe across a polycrystalline sample.
nav: false
---

<div class="back-link"><a href="{{ '/interactive/' | relative_url }}"><i class="fa-solid fa-arrow-left"></i> interactive</a></div>

Move the scan-position slider to sweep the electron probe across the polycrystalline sample and see how the diffraction pattern changes as
it crosses each grain. The convergence semiangle switches between nanobeam diffraction (small semiangle, separated Bragg disks) and
ptychographic imaging conditions (large semiangle, overlapping disks).

<div data-widget="stem4d-sim"></div>

<script type="module" src="{{ '/assets/js/widgets/mount.js' | relative_url }}"></script>


## What is 4D-STEM?

In scanning transmission electron microscopy (STEM), a focused electron probe is rastered across the sample. In **4D-STEM**, a fast pixelated
detector records a full 2D diffraction pattern at every 2D probe position, giving a four-dimensional dataset. That one dataset can be
analyzed after the experiment in many ways: virtual imaging, crystal orientation and strain mapping, or phase retrieval with
[ptychography]({{ '/interactive/ptychography/' | relative_url }}).

Open-source tools for this analysis include [quantEM](https://github.com/electronmicroscopy/quantem) and
[py4DSTEM](https://github.com/py4dstem/py4DSTEM).
