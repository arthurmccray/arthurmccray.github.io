---
layout: page
title: interactive Lorentz TEM
permalink: /interactive/lorentz/
description: Image magnetic skyrmions with an electron microscope, and reconstruct their magnetic field, live in your browser.
nav: false
---

Magnetic skyrmions are tiny whirls in the magnetization of a material, typically tens to hundreds of nanometers across. They can't be seen in
an ordinary in-focus electron micrograph. But electrons passing through a magnetic film pick up a phase shift from the magnetic field (the
Aharonov–Bohm effect), and **Lorentz TEM** turns that phase into visible contrast by deliberately defocusing the microscope.

Pick a texture, drag it around, and see what the microscope sees.

<div data-widget="ltem-sim"></div>

<script type="module" src="{{ '/assets/js/widgets/mount.js' | relative_url }}"></script>

## Things to try

- **Flip the defocus.** The skyrmion core switches between bright and dark. At exactly zero defocus, the magnetic contrast vanishes.
- **Make it Néel.** Press _Néel_ (or drag the helicity to 0°). Néel skyrmions, whose spins point radially, produce _no_ Lorentz contrast at
  normal incidence. Now tilt the sample and watch them appear. This is how Néel textures are identified experimentally.
- **Lower the dose.** Real images are noisy. Watch how shot noise propagates into the TIE reconstruction.
- **Antiskyrmion.** Its in-plane spins wind the opposite way, which gives a distinctive four-lobed image.

## What's being simulated

1. **Magnetization.** A thin film (40 nm thick, μ₀M<sub>s</sub> = 0.3 T) with the chosen spin texture, uniform through the thickness.
2. **Electron phase.** For magnetization that is uniform through the film, the magnetic phase shift has a compact closed form in Fourier space
   (Mansuroglu, Beleggia and co-workers). It depends only on the curl of the in-plane magnetization, which is why radial Néel textures, which
   have no curl, are invisible until the film is tilted.
3. **Fresnel imaging.** The exit wave is propagated by ±Δf with the microscope transfer function for a 200 kV beam, including a small amount
   of beam divergence, and shot noise is added.
4. **Reconstruction.** The two defocused images are fed into the transport-of-intensity equation (TIE), a Poisson equation linking the change
   in intensity with defocus to the phase. The gradient of the recovered phase gives the in-plane magnetic induction.

The same physics, with many more options (micromagnetic inputs, tilt series, single-image reconstruction, and ML-based analysis), is
implemented in my open-source package [PyLorentz](https://github.com/PyLorentz/PyLorentz). Learn more about
[quantitative Lorentz TEM from a single image]({{ '/projects/2_single_image_ltem/' | relative_url }}).
