---
layout: page
title: interactive Lorentz TEM
permalink: /interactive/lorentz/
description: Image magnetic skyrmions with an electron microscope, and reconstruct their magnetic induction, live in your browser.
nav: false
---

Magnetic skyrmions are tiny whirls in the magnetization of a material, typically tens to hundreds of nanometers across. Electrons passing
through a magnetic film are deflected by the Lorentz force from the in-plane magnetic induction, by only tens of microradians, far less than
Bragg scattering. Equivalently, the electron wave picks up a phase shift from the magnetic vector potential (the Aharonov–Bohm effect). An
in-focus image shows no magnetic contrast at all. **Lorentz TEM** in Fresnel mode turns the phase shift into visible contrast by deliberately
defocusing the microscope: domain walls that converge the beam appear bright, and those that diverge it appear dark.

Pick a texture, drag it around, and see what the microscope sees.

<div data-widget="ltem-sim"></div>

<script type="module" src="{{ '/assets/js/widgets/mount.js' | relative_url }}"></script>

## Things to try

- **Flip the defocus.** Going from over- to under-focus inverts the contrast: the skyrmion core switches between bright and dark. At
  exactly zero defocus the magnetic contrast vanishes.
- **Make it Néel.** Press _Néel_ (or drag the helicity to 0°). Néel skyrmions, whose spins point radially, produce _no_ Lorentz contrast
  when the film is flat. Tilt the sample and they appear as a pair of bright and dark half-moons, which swap when you tilt the other way.
  This is how Néel textures, for example in Fe₃GeTe₂, are identified experimentally.
- **Lower the dose.** Real images are noisy. Watch how shot noise, down to a fraction of an electron per pixel, propagates into the TIE reconstruction. This regime is where
  [machine-learning approaches]({{ '/projects/2_single_image_ltem/' | relative_url }}) help.
- **Antiskyrmion.** Its in-plane spins wind the opposite way, which gives a distinctive four-lobed image.
- **Turn on arrows** to see the in-plane magnetization directly, and compare it to the reconstructed induction map.

## What's being simulated

1. **Magnetization.** A thin film (40 nm thick, saturation induction μ₀M<sub>s</sub> = 0.2 T) with the chosen spin texture, uniform through
   the thickness.
2. **Electron phase shift.** For magnetization that is uniform along the beam, the magnetic phase shift has a compact closed form in Fourier
   space, the Mansuripur algorithm: it depends only on the in-plane magnetization, and only on its curl. That's why radial Néel textures are
   invisible until the film is tilted, which gives the out-of-plane core a component perpendicular to the beam.
3. **Fresnel imaging.** The exit wave is propagated by ±Δf with the microscope's phase transfer function for a 200 kV beam, including a
   damping envelope from the small beam divergence, and Poisson shot noise is added.
4. **Reconstruction.** The two defocused images are fed into the transport-of-intensity equation (TIE),
   ∇·(I₀∇φ) = −(2π/λ) ∂I/∂z, a Poisson equation linking the change in intensity with defocus to the phase. The gradient of the recovered
   phase gives the integrated in-plane magnetic induction, (B<sub>x</sub>, B<sub>y</sub>) ∝ (−∂φ/∂y, ∂φ/∂x).

One caveat that this simplified demo hides: an induction map shows the magnetic induction _integrated along the beam_, including stray
fields above and below the film, not the magnetization itself. For Bloch skyrmions the two look nearly identical, but for many textures they
don't. Interpreting real LTEM images therefore needs full image simulations.

That's what my open-source package [PyLorentz](https://github.com/PyLorentz/PyLorentz) does. It covers arbitrary 3D and tilted
magnetizations from micromagnetics, realistic microscope transfer functions, TIE and single-image reconstruction, and ML-based analysis.
