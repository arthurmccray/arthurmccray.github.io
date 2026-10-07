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
<img class="img-fluid rounded" style="background: #fff; padding: 0.5rem" src="{{ '/assets/img/projects/quantem_logo.png' | relative_url }}" alt="quantEM logo">
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
<img class="img-fluid rounded" style="background: #fff; padding: 0.5rem" src="{{ '/assets/img/projects/pylorentz_logo.png' | relative_url }}" alt="PyLorentz logo">
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

{% comment %}
GitHub stats card written out here (instead of the theme's repo_user include) so the card can hide the rank grade.
{% endcomment %}
{% assign stats_url = site.external_services.github_readme_stats_url | default: 'https://github-stats-extended.vercel.app' %}
{% for user in site.data.repositories.github_users %}

<div class="repositories d-flex justify-content-center">
<div class="repo p-2 text-center">
<a href="https://github.com/{{ user }}">
<img class="only-light w-100" alt="{{ user }} GitHub stats" src="{{ stats_url }}/api/?username={{ user }}&theme={{ site.repo_theme_light }}&show_icons=true&hide_rank=true" onerror="this.closest('.repo').style.display='none'">
<img class="only-dark w-100" alt="{{ user }} GitHub stats" src="{{ stats_url }}/api/?username={{ user }}&theme={{ site.repo_theme_dark }}&show_icons=true&hide_rank=true" onerror="this.closest('.repo').style.display='none'">
</a>
</div>
</div>
{% endfor %}

{% if site.data.repositories.github_repos %}

## Repositories

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
{% endif %}
