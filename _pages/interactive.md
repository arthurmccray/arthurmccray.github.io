---
layout: page
title: interactive
permalink: /interactive/
description: Simulations and reconstructions that run live in your browser.
nav: true
nav_order: 5
---

Much of my work involves solving inverse problems in electron microscopy: recovering the relevant information about a sample from different types of measurements.
These demos let you play with the forward and inverse problems directly. Everything is computed live in your browser.

<div class="row mt-4">
<div class="col-md-4 mb-4">
<div class="card h-100">
<div class="card-body">
<h5 class="card-title"><a href="{{ '/interactive/4dstem/' | relative_url }}">4D-STEM diffraction</a></h5>
<p class="card-text">Scan the probe across a polycrystalline sample and watch the diffraction pattern change for different probe 
convergence angles.</p>
</div>
</div>
</div>
<div class="col-md-4 mb-4">
<div class="card h-100">
<div class="card-body">
<h5 class="card-title"><a href="{{ '/interactive/ptychography/' | relative_url }}">Multislice ptychography</a></h5>
<p class="card-text">Scan an electron probe over a nanoparticle, record a 4D-STEM dataset, and watch gradient descent reconstruct the
sample slice by slice.</p>
</div>
</div>
</div>
<div class="col-md-4 mb-4">
<div class="card h-100">
<div class="card-body">
<h5 class="card-title"><a href="{{ '/interactive/lorentz/' | relative_url }}">Lorentz TEM of skyrmions</a></h5>
<p class="card-text">Build a magnetic texture, see how it shifts the phase of the electron beam, image it out of focus, and reconstruct the
magnetic induction with the transport-of-intensity equation.</p>
</div>
</div>
</div>
</div>
