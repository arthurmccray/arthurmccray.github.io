---
layout: page
title: PyLorentz
description: Python package for Lorentz TEM simulation, phase reconstruction, and ML-based analysis.
img: assets/img/projects/pylorentz_logo.png
importance: 2
category: software
---

<div class="back-link"><a href="{{ '/projects/' | relative_url }}"><i class="fa-solid fa-arrow-left"></i> projects</a></div>

<p class="lead"><strong>Paper:</strong>
<a href="https://doi.org/10.1103/PhysRevApplied.15.044025">Understanding complex magnetic spin textures with simulation-assisted Lorentz transmission electron microscopy</a>,
<em>Physical Review Applied</em> (2021) · <strong>Code:</strong> <a href="https://github.com/PyLorentz/PyLorentz">github.com/PyLorentz/PyLorentz</a></p>

[PyLorentz](https://github.com/PyLorentz/PyLorentz) is an open-source Python codebase for Lorentz transmission electron microscopy. I'm its
sole author and have maintained it since 2020. It is widely used in the magnetic-microscopy community for:

- **Simulation:** computing the electron phase shift of an arbitrary magnetization, such as the output of a micromagnetic simulation, with
  either the Mansuripur algorithm or our linear superposition method, which also handles tilted and 3D samples. Realistic LTEM images are
  then simulated with a partially coherent microscope transfer function.
- **Phase reconstruction:** transport-of-intensity (TIE) reconstruction from through-focal series, including separating the magnetic and
  electrostatic phase with flipped-sample series, single-image TIE, and automatic-differentiation reconstruction with a deep image prior
  ([SIPRAD]({{ '/projects/2_single_image_ltem/' | relative_url }})).
- **ML-based analysis:** self-supervised and simulation-trained approaches to quantitative magnetic imaging.

Simulation matters for LTEM because integrated induction maps are easy to over-interpret. They show the magnetic induction integrated along
the beam, including stray fields, not the magnetization itself. Matching experimental images to simulations of candidate magnetization
configurations is how you tell the two apart.

For a taste of what PyLorentz simulates, try the [interactive Lorentz TEM demo]({{ '/interactive/lorentz/' | relative_url }}).
