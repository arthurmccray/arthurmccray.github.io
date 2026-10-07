---
layout: page
title: Deep generative priors for ptychography
description: Self-supervised neural priors make electron ptychography faster, sharper, and more robust to noise.
img: assets/img/projects/deep_prior_ptycho.jpg
importance: 1
category: research
related_publications: true
---

Electron ptychography recovers the full complex transmission function of a sample, potentially at deep sub-ångström resolution, from a
4D-STEM dataset. In practice, conventional pixel-based reconstructions are sensitive to noise and need careful hand-tuned regularization,
especially for thick samples reconstructed in 3D with multislice models.

We replace the pixel grids with **deep generative priors**: neural networks that parameterize the object and probe inside the same
automatic-differentiation multislice forward model. The networks are trained per-dataset and self-supervised, so no training data is required,
and their inductive biases regularize the reconstruction. Compared with state-of-the-art iterative and ML baselines, this gives a **>10× speedup
and 40% better resolution**, with markedly improved robustness at low dose and better depth regularization.

The same framework now underpins projects in tomography and crystallography, and the implementation lives in
[quantEM](https://github.com/electronmicroscopy/quantem).

Want to see how multislice ptychography works? Try the [interactive ptychography demo]({{ '/interactive/ptychography/' | relative_url }}).

{% bibliography --cited_in_order --query @*[key=mccray2025deep] %}

{% bibliography --cited_in_order --query @*[key=mccray2025accelerating] %}
