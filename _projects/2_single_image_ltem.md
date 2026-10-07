---
layout: page
title: Quantitative Lorentz TEM from a single image
description: Self-supervised and simulation-trained ML for magnetic phase imaging.
img: assets/img/projects/skyrmion_bmap.jpg
importance: 2
category: research
---

<div class="back-link"><a href="{{ '/projects/' | relative_url }}"><i class="fa-solid fa-arrow-left"></i> projects</a></div>

<p class="lead"><strong>Papers:</strong>
<a href="https://doi.org/10.1038/s41524-024-01285-8">AI-enabled Lorentz microscopy for quantitative imaging of nanoscale magnetic spin textures</a>,
<em>npj Computational Materials</em> (2024) ·
<a href="https://doi.org/10.1063/5.0197138">Simulation-trained machine learning models for Lorentz transmission electron microscopy</a>,
<em>APL Machine Learning</em> (2024)</p>

Fresnel-mode Lorentz TEM makes magnetic domain walls and skyrmions visible by imaging out of focus, but the tecnique is primarily qualitative. To
get quantitative information, or to make maps of the integrated magnetic induction, you have to recover the electron phase shift. That is normally done
with the transport-of-intensity equation (TIE) and a through-focal series of three (or more) images. Acquiring the TFS is slow, sensitive to drift,
and impractical for in situ experiments where the sample is changing. 

## Single-image phase retrieval (SIPRAD)

SIPRAD reconstructs the magnetic phase shift from **a single defocused image**. A deep image prior (DIP) generates the phase, a
differentiable LTEM image-formation model turns it into a simulated image, and the network is trained by backpropagating the mismatch with
the one experimental image. No training data is needed. An optional second DIP reconstructs the amplitude, which lets SIPRAD separate the
magnetic phase from non-magnetic contrast such as surface contamination.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/projects/siprad_overview.jpg" class="img-fluid rounded" zoomable=true %}
</div>
</div>
<div class="caption">
The SIPRAD algorithm. A single LTEM image and the microscope parameters go in. The deep image prior is optimized so that the simulated LTEM
image matches the measurement.
</div>

SIPRAD is significantly more accurate than existing single-image methods over a wide range of conditions, including the large defocus values
and noisy images typical of experiments. It can also be applied frame by frame to in situ experiments, where a through-focal series is impractical.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/projects/siprad_experiment.jpg" class="img-fluid rounded" zoomable=true %}
</div>
</div>
<div class="caption">
Bubble domains in Cr₂Ge₂Te₆. (a) A single experimental LTEM image. (b–d) SIPRAD-reconstructed amplitude, magnetic phase, and integrated
induction. (e, f) Single-image TIE. (g, h) TIE from a full through-focal series.
</div>

## Simulation-trained networks

In some cases, however we are not interested in the integrated induction but in quantitatively measuring specific magnetic features. Conventional
large-scale segmentation models (such as Segment Anything) struggle with magnetic contrast patterns and cannot be used for this imaging mode. 
Building on the PyLorentz code, we developed a pipeline of micromagnetic simulations and realistic LTEM image simulation in order to generate large labeled
training sets, so that neural networks can accurately segment skyrmions in experimental images. That enablese large-scale statistical studies of skyrmions
which would not be viable (or accurate) when segmenting by hand. 

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/projects/skyrmnet_workflow.png" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
Training a network on simulated data. Material parameters drive MuMax3 micromagnetic simulations. The resulting magnetization maps give
the ground-truth labels and, together with the imaging conditions, simulated LTEM training images (PyLorentz). The trained network can be
applied directly to experimental images.
</div>

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/projects/skyrmnet_fgt.jpg" class="img-fluid rounded" zoomable=true %}
</div>
</div>
<div class="caption">
A simulation-trained network applied to experimental LTEM images of a dense Néel skyrmion lattice in Fe₃GeTe₂. Left: full field of view
at 188 K. Top row: the boxed region as the sample cools from 188 K to 100 K. Bottom row: the skyrmions identified by the network (red).
</div>

The tools are available in [PyLorentz](https://github.com/PyLorentz/PyLorentz). To build intuition for how magnetic textures appear in LTEM,
try the [interactive Lorentz TEM demo]({{ '/interactive/lorentz/' | relative_url }}).
