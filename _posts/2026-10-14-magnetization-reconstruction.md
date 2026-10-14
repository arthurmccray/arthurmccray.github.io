---
layout: post
title: Reconstructing 3D magnetization from Lorentz TEM images
date: 2026-10-14
description: Integrated induction maps can be misleading; the magnetization is the quantity of interest.
tags: lorentz-tem magnetism automatic-differentiation
categories: research
---

<p class="lead"><strong>Abstract:</strong>
A. R. C. McCray, M. Cherukara, A. K. Petford-Long, C. Phatak,
<a href="https://doi.org/10.1093/micmic/ozad067.908">3D Magnetization Reconstruction for Lorentz Microscopy using Differential Programming</a>,
<em>Microscopy and Microanalysis</em> <strong>29</strong> (Suppl. 1), 1756–1757 (2023)</p>

Everyone has a project or two from their PhD that never got finished. When I moved to my postdoc, I fully expected to tie this one up at
some point, but with plenty of other projects competing for my time it fell by the wayside. I still think the core idea is important and could open up a new way of characterizing magnetic
materials, but so far it only exists in a conference abstract and my thesis. This post is a condensed version of that thesis section, plus
where I think the project should go next.

## Why induction maps aren't enough

When studying magnetic ordering, the fundamental quantity of interest is the magnetization. It describes how the unpaired spins in the material are
arranged, and it's what couples to the lattice and to any applied stimuli. But LTEM doesn't image the magnetization directly. The electron
wave picks up a phase shift from the magnetic induction it passes through, integrated along the beam. Phase retrieval, for example with the
transport-of-intensity equation, gives you that projected in-plane induction, which includes the stray fields and the demagnetizing field
as well as the magnetization. These integrated induction maps can look very different from the magnetization that produced them.

The classic example is a Néel skyrmion, which has a hedgehog-like structure with spins pointing radially inward or outward from the skyrmion core. Flat in the microscope, it produces no LTEM contrast at all. Tilt the
sample and it appears as a pair of bright and dark lobes, and the reconstructed induction map has a "biskyrmion" shape that looks nothing
like the actual spin texture. You can see this in the demo below:

<div data-widget="ltem-sim" data-widget-config='{"helicity": 0, "tilt": 30, "radius": 80, "arrows": true}'></div>
<script type="module" src="{{ '/assets/js/widgets/mount.js' | relative_url }}"></script>

For an isolated texture, you can usually work out what you're looking at with micromagnetic simulations and approximate magnetic
parameters for your sample. Simulate a candidate magnetization, compute the LTEM images it would produce, and compare them with the
experiment. That's a large part of why I wrote [PyLorentz]({{ '/projects/6_pylorentz/' | relative_url }}). But this doesn't extend well to
dense skyrmion lattices, where many textures and their stray fields interact, or to 3D textures such as merged skyrmion tubes, chiral
bobbers, and magnetic hopfions, which can create very similar LTEM contrast. In these cases, you need to reconstruct the magnetization
directly from the experimental data.

## How MagPy works

MagPy (magnetization reconstruction in Python) is an AD-based method I developed for reconstructing the 3D magnetization from a tilt series
of LTEM images. It takes our automatic-differentiation (AD) phase reconstruction method,
[SIPRAD]({{ '/projects/2_single_image_ltem/' | relative_url }}), one step further. Rather than stopping at the phase shift, it goes back to
the magnetization that produces the phase shift, and in turn the LTEM images.

Starting from a random magnetization, MagPy simulates the phase shift at each tilt angle in the input tableau, computes the LTEM images
those phases would produce, and compares them with the measured images using the mean-squared error. A total-variation term on the
magnetization acts like an exchange energy and pushes it toward a ferromagnetically ordered state. Because every step of the forward model
is differentiable, the loss can be backpropagated all the way to the magnetization. Unlike
conventional tomography, which needs only one tilt axis, this kind of vector tomography requires tilting the sample about two different
axes to fully determine the magnetization.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/magpy_overview.png" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
The MagPy algorithm. Inputs are in grey, the forward model in blue, and the loss in orange. The loss is backpropagated through the forward
model to update the magnetization <b>M</b>.
</div>

There are two key differences from SIPRAD: MagPy learns the magnetization directly rather than through a deep image prior, and it needs a
forward model for the phase shift itself, run once per tilt angle at every iteration.

That phase calculation is what makes this challenging. There are two methods for computing the phase shift from a magnetization, and
neither is ideal here.[^inr] The Mansuripur algorithm is fast but assumes a flat film with magnetization that's uniform along the beam, so
it can't handle tilted 3D textures. The linear superposition method we developed for PyLorentz is accurate for any sample and tilt, but far
too slow to run thousands of times. So I used a compromise, which I called Mansuripur3D. You rotate the 3D magnetization in real space, sum it
along the beam direction, and pass the flattened result to the Mansuripur algorithm. It's an approximation, but for a tilted hopfion, its
simulated image was more than 20× closer to the linear superposition result than the standard Mansuripur algorithm's. It's also fast: 1,000
iterations on a five-image tableau take about 21 seconds, compared with about 64 minutes using linear superposition. We were careful
not to commit any inverse crimes, all of the _input_ images below were simulated with linear superposition, so they aren't approximated.

[^inr]:
    An implicit neural representation of the magnetization would actually solve this problem, because it can be sampled at any
    orientation without interpolation, so the standard Mansuripur algorithm would work.

## A single Néel skyrmion

As a first test, I simulated a Néel skyrmion in MuMax3 and used it to simulate five LTEM images at different orientations. MagPy reconstructs the magnetization nearly perfectly.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/magpy_neel_skyrmion.jpg" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
(a) True magnetization of a Néel skyrmion. (b) Its integrated induction map when tilted by 30°, as phase retrieval would provide it,
showing the "biskyrmion" shape. (c) The five-image tilt tableau used as input. (d) The MagPy reconstruction. (e) The x-component of the
magnetization along the dashed line in (d). (f) Images simulated from the reconstruction, which match the input data.
</div>

What surprised me was that MagPy consistently got the skyrmion's _chirality_ right, whether the spins point inward or outward. Chirality is
very hard to determine with LTEM, because the two chiralities produce nearly identical images that differ only slightly in where the
intensity peaks. (With real experimental data, I don't think it's possible, because of deformations and stray fields, and I wouldn't be
surprised if MagPy can't do it either.) That MagPy recovered the chirality correctly, even from noisy data, is a good sign both for its
sensitivity and that it doesn't seem to get stuck in local minima.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/magpy_chirality.jpg" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
(a, b) Outward- and inward-chirality Néel skyrmions. (c, d) Their simulated images at a 30° tilt, and (e) the difference between them.
(f, g) MagPy recovers the correct chirality for both. (h–l) The same with noise added.
</div>

## Complex and 3D spin textures

Reconstructing the magnetization is most useful when induction maps aren't easy to interpret. For a dense Néel skyrmion lattice, for
example, the induction map of the tilted sample is chaotic and tells you little about the spin textures. This reconstruction used nine
input images from a 30° tilt series, similar to those used in X-ray laminography. The reconstruction looks nearly identical to the ground
truth, both in plan view and in cross section.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/magpy_lattice.jpg" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
(a) True magnetization of a dense Néel skyrmion lattice, averaged through the thickness, and (b) a cross section along the dashed line. (c)
The induction map when tilted 30° about x. (d) The nine-image tilt tableau. (e, f) The MagPy reconstruction.
</div>

The most exciting application would be identifying 3D topological spin textures. The 3D analogue of a skyrmion is the magnetic hopfion,
which looks like a torus of spiraling magnetization. MagPy recovers a hopfion from simulated data with the right chirality and Hopf index.
It isn't a perfect match between the simulation and reconstruction, the torus core is too small, and the top and bottom surfaces are more in-plane than they should be. But it's
impressive given that the maximum tilt angle is only 30°, which doesn't provide much information along the film thickness. Imaging at
higher tilts could help, but in a continuous film, that sends the beam through stray fields from regions outside the field of view, which
the model can't account for.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/magpy_hopfion.jpg" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
(a) Slices through a magnetic hopfion, (b) its central slice in plan view, and (c) a cross section along the dashed line. (d) The nine-image
tilt tableau used as input. (e–g) The same views of the MagPy reconstruction.
</div>

Most importantly, MagPy gets the qualitative features right and clearly identifies the hopfion as a 3D topological spin texture.

## What's next

This project unfortunately stalled after I finished my PhD. I couldn't get experimental data at LBL or Stanford, in large part because not
many people there were making magnetic samples or studying spin textures. A student in CD Phatak's group at Argonne is now continuing the
work, and we're planning several changes that should make it much better:

- **A better representation of the magnetization.** MagPy currently learns a voxel grid directly. Implicit neural representations, or
  tensor decompositions like k-planes, would be a significant improvement. We could sample the magnetization at any point, and therefore at any
  orientation, without interpolation, so we could use the Mansuripur algorithm without approximations.
- **More physics in the loss.** Right now, total variation is the only physical constraint. Adding other energy terms, such as the Zeeman,
  anisotropy, and Dzyaloshinskii–Moriya (DMI) energies, should help the reconstructions converge to physically realistic states. Since
  material parameters are rarely known precisely, it would be better to allow a range of values than to fix them. The dipolar energy is
  the tricky one. It's very expensive to compute, so we'll likely skip it.
- **Electrostatic phase and imaging parameters.** Including the electrostatic phase shift would let MagPy handle patterned samples, and
  optimizing the microscope and sample parameters alongside the magnetization has helped similar AD-based methods.

If you're interested in any of this, or have a sample you'd like to try it on, please [get in touch](mailto:arthurmccray95@gmail.com)!
