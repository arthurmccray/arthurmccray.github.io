---
layout: page
title: Deep generative priors for ptychography
description: Self-supervised neural priors make electron ptychography faster, sharper, and more robust to noise.
img: assets/img/projects/deep_prior_ptycho.jpg
importance: 1
category: research
---

<div class="back-link"><a href="{{ '/projects/' | relative_url }}"><i class="fa-solid fa-arrow-left"></i> projects</a></div>

<p class="lead"><strong>Papers:</strong>
<a href="https://doi.org/10.48550/arXiv.2511.07795">Deep generative priors for robust and efficient electron ptychography</a>, arXiv (2025) ·
<a href="https://doi.org/10.1111/jmi.13407">Accelerating iterative ptychography with an integrated neural network</a>, <em>Journal of Microscopy</em> (2025)</p>

Electron ptychography recovers the full complex transmission function of a sample, potentially at deep sub-ångström resolution, from a
4D-STEM dataset. In practice, conventional pixel-based reconstructions are sensitive to noise and need careful hand-tuned regularization,
especially for thick samples reconstructed in 3D with multislice methods.

Rather than directly learning the pixelated object and probe, we use **deep generative priors**: neural networks that parameterize the object and probe inside the same
automatic-differentiation multislice forward model. The networks are trained per-dataset and self-supervised, so no training data is required,
and their inductive biases regularize the reconstruction. Compared with state-of-the-art iterative and ML baselines, this gives a **>10× speedup
and 40% better resolution**, with improved robustness at low dose and better depth regularization.

<div class="row justify-content-sm-center">
<div class="col-sm-10 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/projects/deep_prior_ptycho.jpg" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
Deep generative priors (DGPs) for the probe and object feed a differentiable multislice model, alongside auxiliary parameters such as scan
positions, descan, and beam tilt. Everything is optimized together against the measured data.
</div>

The benefit is clearest on real, low-dose data. On a public dataset of the MOSS-6 metal-organic framework, recorded at 100 e⁻/Å², using DGPs
for both the object and the probe reduces noise across a wide range of spatial frequencies without attenuating the signal. The
information limit improves from 1.98 Å to 1.57 Å.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/projects/dgp_moss6.jpg" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
Multiple reconstructions of the MOSS-6 metal-organic framework from the same experimental dataset. (a) Object phase with DGPs generating both the
object and the probe, and (b) its FFT; the dashed circle marks 1.7 Å. (c, d) Pixelated object and probe. (e, f) DGP object with a pixelated
probe. (g, h) Pixelated object with a DGP probe. Insets magnify the red boxes.
</div>

The same framework now underpins projects in tomography and crystallography, and the implementation lives in
[quantEM](https://github.com/electronmicroscopy/quantem). You can run the code yourself in the [quantEM tutorial notebook](https://github.com/electronmicroscopy/quantem-tutorials/blob/main/tutorials/diffractive_imaging/ptycho_iter_04_MOSS6.ipynb).

Interested in how multislice ptychography works? Try the [interactive ptychography demo]({{ '/interactive/ptychography/' | relative_url }}).
