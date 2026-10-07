---
layout: page
title: Deep material priors
description: Multimodal vision transformer foundation models for electron microscopy, with Toyota Research Institute.
img: assets/img/projects/dmp_overview.png
importance: 0
category: research
---

<div class="back-link"><a href="{{ '/projects/' | relative_url }}"><i class="fa-solid fa-arrow-left"></i> projects</a></div>

<p class="lead"><strong>Current project.</strong> A $1.2M program with the Toyota Research Institute to build physics-aware foundation
models for materials characterization.</p>

Most machine learning in electron microscopy is still built one task at a time: a network for strain, another for orientation, another for
thickness, each trained on its own small dataset. Deep material priors aims to replace that with a single **pretrained foundation model**
that has learned what diffraction from real materials looks like, enabling fast-training of output heads for many downstream tasks or to be used as a prior
inside physics-based reconstructions.

The model is a **multimodal transformer**:

- A **vision transformer (ViT) encodes** 4D-STEM diffraction patterns, alongside encoders for crystal structure, chemical composition, X-ray diffraction data, etc.
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
mapping, strain mapping, and phase identification.
</div>

Training data comes from large-scale multi-slice simulations across crystalline and amorphous structures, passed through a detailed
augmentation pipeline that models real detectors, noise, backgrounds, and experimental geometry, so that the model transfers directly to
experimental data. Training uses DDP/FSDP and is performed on the [Perlmutter](https://www.nersc.gov/what-we-do/resources/perlmutter) system at NERSC.

## Early results

Small pretaining runs are promising and already produce a model that can fill in missing information in sparse, low-dose diffraction data. Initial testing uses 
the pre-trained backbone and a simple output head to center diffraction patterns (a non-trivial task because the brightest beam is not always the central beam),
which is an instrumental step in pre-processing [multi-angle precession electron diffraction (MAPED)](https://academic.oup.com/mam/article/31/6/ozaf103/8321844) data.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/projects/dmp_results.jpg" class="img-fluid rounded" zoomable=true %}
</div>
</div>
<div class="caption">
(1) Inpainting a low-dose diffraction pattern after pretraining. The model sees only the red patches of the input, with most of the pattern
hidden, and predicts the rest; the zoomed insets compare a predicted disk with the ground truth. (2) Preprocessing for MAPED: the
model predicts the central-beam position (orange) in each diffraction pattern of a beam-tilt series, so that the exposures can be
centered and merged into a single pattern.
</div>

## Pretrained models as priors

The longer-term goal of this project is to use the pretrained representation as a **deep material prior** inside physics-based reconstructions, in the
same way my [deep generative priors for ptychography]({{ '/projects/1_deep_priors_ptychography/' | relative_url }}) regularize the object.
The difference is that the prior is learned once, across many materials, and will help regularize the reconstruction towards only physically-plausible
objects given information that is known about the material. 

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/projects/dmp_atomic_prior.png" class="img-fluid rounded" zoomable=true %}
</div>
</div>
<div class="caption">
Schematic of a deep material prior for atomic-resolution tomography. (1) A pretrained multimodal encoder turns prior knowledge about the
sample, such as composition, an XRD pattern, and synthesis notes, into an embedding. A conditional denoiser is trained as an output head
which converges to physically viable atomic structures for a given embedding. (2, 3) Gaussian splatting is performed to reconstruct 
an atmoic resolution tomography dataset. A regularizing loss from the denoiser is added to the data loss and conditions the reconstruction
towards physically viable samples that reproduce experimental observations. 
</div>
