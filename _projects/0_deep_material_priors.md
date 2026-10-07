---
layout: page
title: Deep material priors
description: Multimodal vision transformer foundation models for electron microscopy, with Toyota Research Institute.
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

Training data comes from large-scale diffraction simulations across crystalline and amorphous structures, passed through a detailed
augmentation pipeline that models real detectors, noise, backgrounds, and experimental geometry, so that the model transfers to
experimental data. Training runs use distributed DDP/FSDP on GPU clusters.

This builds directly on my earlier work on [deep generative priors for ptychography]({{ '/projects/1_deep_priors_ptychography/' | relative_url }}):
there the network is trained from scratch on each dataset, whereas here the prior is learned once, from simulation, across many materials.
