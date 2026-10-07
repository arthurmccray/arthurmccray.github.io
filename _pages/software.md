---
layout: page
permalink: /software/
title: software
description: Open-source tools for electron microscopy.
nav: true
nav_order: 4
---

I care about turning research methods into tools that other people can actually use. These are the two projects I spend the most time on.

<div class="row mt-4">
<div class="col-md-4 mb-3">
<img class="img-fluid" src="{{ '/assets/img/projects/quantem_logo.png' | relative_url }}" alt="quantEM logo">
</div>
<div class="col-md-8" markdown="1">

### [quantEM](https://github.com/electronmicroscopy/quantem)

_Package creator and core developer_

An open-source Python library for quantitative electron microscopy. I lead the **ptychography** and **machine learning** modules,
including the deep-generative-prior reconstructions from [our recent work]({{ '/projects/1_deep_priors_ptychography/' | relative_url }}),
and contributed much of the core infrastructure: data structures, visualization, utilities, and configuration.

[Source code](https://github.com/electronmicroscopy/quantem) · [Tutorials](https://github.com/electronmicroscopy/quantem-tutorials) ·
[Interactive ptychography demo]({{ '/interactive/ptychography/' | relative_url }})

</div>
</div>

<div class="row mt-4">
<div class="col-md-4 mb-3">
<img class="img-fluid" src="{{ '/assets/img/projects/skyrmion_bmap.jpg' | relative_url }}" alt="Magnetic induction map of a skyrmion lattice">
</div>
<div class="col-md-8" markdown="1">

### [PyLorentz](https://github.com/PyLorentz/PyLorentz)

_Sole author and maintainer since 2020_

A Python package for Lorentz transmission electron microscopy, widely used in the magnetic-microscopy community. It covers simulating LTEM
images from micromagnetic configurations, transport-of-intensity and single-image phase reconstruction, and ML-based analysis of magnetic
spin textures.

[Source code](https://github.com/PyLorentz/PyLorentz) · [Interactive Lorentz TEM demo]({{ '/interactive/lorentz/' | relative_url }})

</div>
</div>

---

{% if site.data.repositories.github_users %}

## GitHub users

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for user in site.data.repositories.github_users %}
    {% include repository/repo_user.liquid username=user %}
  {% endfor %}
</div>

---

{% if site.repo_trophies.enabled %}
{% for user in site.data.repositories.github_users %}
{% if site.data.repositories.github_users.size > 1 %}

  <h4>{{ user }}</h4>
  {% endif %}
  <div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% include repository/repo_trophies.liquid username=user %}
  </div>

---

{% endfor %}
{% endif %}
{% endif %}

{% if site.data.repositories.github_repos %}

## Repositories

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
{% endif %}
