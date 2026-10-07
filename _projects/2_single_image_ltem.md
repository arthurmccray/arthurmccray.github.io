---
layout: page
title: Quantitative Lorentz TEM from a single image
description: Self-supervised and simulation-trained ML for magnetic phase imaging.
img: assets/img/projects/skyrmion_bmap.jpg
importance: 2
category: research
related_publications: true
---

Lorentz transmission electron microscopy (LTEM) images magnetic textures, such as skyrmions, vortices, and domain walls, through the phase
shift they impart on the electron wave. Recovering that phase quantitatively traditionally requires a through-focal series and the
transport-of-intensity equation (TIE). Collecting it is slow, sensitive to drift, and incompatible with fast in-situ experiments.

I developed two complementary machine-learning approaches:

- **Self-supervised single-image reconstruction.** A deep image prior combined with a differentiable LTEM forward model recovers the
  magnetic phase from just one defocused image, with no training data.
- **Simulation-trained networks.** A micromagnetic simulation and LTEM image-formation pipeline generates large training sets, enabling
  networks that analyze spin textures statistically across thousands of images.

The image above is a magnetic induction map of a skyrmion lattice, with color showing the in-plane field direction. The tools are available in
[PyLorentz](https://github.com/PyLorentz/PyLorentz). To build intuition for how magnetic textures show up in LTEM, try the
[interactive Lorentz TEM demo]({{ '/interactive/lorentz/' | relative_url }}).

{% bibliography --cited_in_order --query @*[key=mccray2024ai] %}

{% bibliography --cited_in_order --query @*[key=mccray2024simulation] %}

{% bibliography --cited_in_order --query @*[key=mccray2021understanding] %}
