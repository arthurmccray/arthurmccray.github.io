---
layout: page
title: Deep material priors
description: Multimodal vision transformer foundation models for electron microscopy, with Toyota Research Institute.
img: assets/img/projects/dmp_overview.png
importance: 0
category: research
---

<p class="lead"><strong>Current project.</strong> A $1.2M program with the Toyota Research Institute to build physics-aware foundation
models for materials characterization.</p>

Most machine learning in electron microscopy is still built one task at a time: a network for strain, another for orientation, another for
thickness, each trained on its own small dataset. Deep material priors aims to replace that with a single **pretrained foundation model**
that has learned what diffraction from real materials looks like, and that can be fine-tuned for many downstream tasks or used as a prior
inside physics-based reconstructions.

The model is a **multimodal transformer**:

- **Vision transformer (ViT) encoders** for 4D-STEM diffraction patterns, alongside encoders for crystal structure and chemical composition.
- A **fusion backbone** that combines the modalities into a shared representation.
- **Self-supervised pretraining** with masked autoencoding and super-resolution objectives, followed by supervised heads for physical
  quantities such as sample thickness and crystal orientation.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/projects/dmp_overview.png" class="img-fluid rounded" zoomable=true %}
</div>
</div>
<div class="caption">
The diffraction backbone. (1) A vision transformer encodes each diffraction pattern as a grid of patches; plain, windowed, and Swin
attention are all under evaluation. (2) Self-supervised pretraining corrupts unlabeled patterns by downsampling, masking patches, or adding
noise, and trains the model to reconstruct the clean pattern. (3) The pretrained backbone then feeds downstream tasks such as orientation
mapping, strain mapping, and phase identification (illustrative maps).
</div>

Training data comes from large-scale diffraction simulations across crystalline and amorphous structures, passed through a detailed
augmentation pipeline that models real detectors, noise, backgrounds, and experimental geometry, so that the model transfers to
experimental data. Training runs use distributed DDP/FSDP on GPU clusters.

## Early results

Pretraining already produces a model that can fill in missing information in sparse, low-dose diffraction data, and the same backbone is
being put to work on practical preprocessing steps.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/projects/dmp_results.jpg" class="img-fluid rounded" zoomable=true %}
</div>
</div>
<div class="caption">
(1) Inpainting a low-dose diffraction pattern after pretraining. The model sees only the red patches of the input, with most of the pattern
hidden, and predicts the rest; the zoomed insets compare the predicted central disk with the ground truth. (2) Preprocessing for MAPED: the
model predicts the central-beam position (orange circles) in each diffraction pattern of a beam-tilt series, so that the exposures can be
centered and merged into a single pattern.
</div>

## Pretrained models as priors

The longer-term goal is to use the pretrained representation as a **deep material prior** inside physics-based reconstructions, in the
same way my [deep generative priors for ptychography]({{ '/projects/1_deep_priors_ptychography/' | relative_url }}) regularize the object.
The difference is that the prior is learned once, across many materials, instead of being trained from scratch on each dataset.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/projects/dmp_atomic_prior.png" class="img-fluid rounded" zoomable=true %}
</div>
</div>
<div class="caption">
Schematic of a deep material prior for atomic-resolution tomography. (1) A pretrained multimodal encoder turns prior knowledge about the
sample, such as composition, an XRD pattern, and synthesis notes, into an embedding. (2) An atomic model, seeded from peak finding on a
conventional reconstruction, is projected analytically to predict a tilt series. (3) The data loss against the experimental tilt series is
backpropagated to the atom positions and species, together with a regularizing loss from an equivariant graph neural network denoiser
conditioned on the embedding.
</div>
