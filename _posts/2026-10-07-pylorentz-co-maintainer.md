---
layout: post
title: PyLorentz is looking for a co-maintainer
date: 2026-10-07
description: I'm looking for someone to share and eventually take over the development of PyLorentz.
tags: pylorentz open-source ltem
categories: software
related_posts: false
---

I'm looking for a co-maintainer for [PyLorentz](https://github.com/PyLorentz/PyLorentz), the open-source Python package for Lorentz TEM that
I wrote and have maintained since 2020. My research has moved from magnetism to machine learning for electron microscopy, and the code
deserves a maintainer who uses it more than I do.

## What PyLorentz does

PyLorentz simulates LTEM images from a magnetization, such as the output of a micromagnetic simulation, using the Mansuripur algorithm or
linear superposition. It reconstructs the electron phase shift from through-focal series with the transport-of-intensity equation, or with
automatic differentiation and a deep image prior (SIPRAD). It runs on the GPU through PyTorch and CuPy,
and the example notebooks come with data on [Zenodo](https://zenodo.org/records/13147848). The [project page]({{ '/projects/6_pylorentz/' | relative_url }}) has more detail, and the
[interactive LTEM demo]({{ '/interactive/lorentz/' | relative_url }}) shows the kind of imaging it simulates.

## Where it stands

A major refactor in 2024 cleaned up the code and added the automatic-differentiation reconstructions. It also broke most old workflows,
and the infrastructure around the code never caught up. Good first tasks:

- **Packaging.** PyLorentz is installed from a local clone. Publishing it to PyPI and conda-forge would help most users.
- **Tests and CI.** There are none yet. Even running the example notebooks on every pull request would catch most regressions.
- **Documentation.** The [docs](https://pylorentztem.readthedocs.io/) could use modernizing, including migration notes for people still
  on the pre-2024 API.

I would most likely suggest we use [quantEM](https://github.com/electronmicroscopy/quantem) as a template for how we update the code. I
briefly considered integrating `PyLorentz` into `quantEM`, but the userbase is large enough that I don't think it makes sense. Longer-term
goals would be to make the whole package `torch`-native, in preparation for additional ML-based reconstruction methods.

## Working with me

There's no deadline or anything. I'd be happy for this transition to be as fast or slow as you'd like, and I'm happy to review PRs and answer
questions for as long as it's useful. You would of course get credit as maintainer in the repo and docs, and we could potentially write a
methods paper down the line if it makes sense.

## Who would be a good fit

Probably a graduate student, postdoc, or staff scientist who works with LTEM and already uses PyLorentz, or wishes it did something it
doesn't. You should be comfortable with NumPy and Python packaging; familiarity with PyTorch helps for the reconstruction code. You don't
need to know all of it on day one.

If this is interesting to you, please email me at [arthurmccray95@gmail.com](mailto:arthurmccray95@gmail.com) with a few lines about
who you are and what you'd want to work on first.
