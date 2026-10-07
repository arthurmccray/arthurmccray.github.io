---
layout: page
title: interactive ptychography
permalink: /interactive/ptychography/
description: Multislice electron ptychography, from 4D-STEM acquisition to gradient-based reconstruction, live in your browser.
nav: false
---

<div data-widget="ptycho-ms"></div>

<script type="module" src="{{ '/assets/js/widgets/mount.js' | relative_url }}"></script>

<p class="text-muted small mt-2">Interactive widget by <a href="https://colab.stanford.edu">Colin Ophus</a>, from the
<a href="https://colab.stanford.edu/interactive-ptycho">Ophus Lab website</a>.</p>

## How the measurement works

A focused electron probe illuminates a small region of the sample. Because the probe is intentionally defocused, neighboring scan positions
overlap strongly, and every region of the sample is measured many times from slightly different illumination conditions. At each of the 15 by
15 scan positions we record the far-field diffraction pattern, giving a four-dimensional dataset: two scan dimensions and two diffraction
dimensions.

The simulation uses a 300 kV beam, an adjustable convergence semiangle (10 to 40 mrad), and a strongly defocused probe (200 Å of overfocus to
200 Å of underfocus). Larger convergence angles reach higher scattering angles and sharpen the depth resolution; more defocus spreads the
illumination over more of the sample. The sample is a five-fold twinned decahedral nanoparticle embedded in an amorphous carbon substrate.
Every diffraction pattern is computed live with the multislice algorithm, which alternates between transmission through each thin slice and
Fresnel propagation between slices.

## How the reconstruction works

Ptychography recovers the sample from the recorded intensities alone. We parameterize the object as a stack of complex slices and use the
same multislice model in the forward direction, comparing the modeled far-field intensity against the measurement.

The solver minimizes the amplitude error between modeled and measured diffraction patterns using mini-batch gradient descent. Each iteration:

1. picks a small random batch of probe positions,
2. back-propagates the residual through the multislice model to get the gradient with respect to every object slice, and
3. takes an Adam step.

This is the same pixelated multislice approach used in [quantEM](https://github.com/electronmicroscopy/quantem), with the probe assumed known
and starting from a blank object.

The depth resolution of ptychography is limited to roughly twice the wavelength divided by the square of the convergence angle, which is tens of
ångströms here. You can see this in the reconstructed slice stack: the nanoparticle and substrate blur across neighboring slices, including the
empty padding slices above and below the sample.

## Going further: deep generative priors

Pixel-based reconstructions like this one are sensitive to noise and need careful regularization, especially in 3D. In my recent work we
replace the pixel grids with **deep generative priors**, neural networks that parameterize the object and probe inside the same differentiable
multislice model. This improves noise robustness, convergence speed, and depth regularization.
[Read more about the project]({{ '/projects/1_deep_priors_ptychography/' | relative_url }}) or see the
[paper on arXiv](https://doi.org/10.48550/arXiv.2511.07795).

To work through these algorithms yourself, see the quantEM
[diffractive imaging tutorials](https://github.com/electronmicroscopy/quantem-tutorials/tree/main/tutorials/diffractive_imaging).
