---
layout: page
title: PyLorentz
description: Python package for Lorentz TEM simulation, phase reconstruction, and ML-based analysis.
importance: 2
category: software
related_publications: true
---

[PyLorentz](https://github.com/PyLorentz/PyLorentz) is a Python codebase for Lorentz transmission electron microscopy. I'm its sole author
and have maintained it since 2020. It is widely used in the magnetic-microscopy community for:

- **Simulation:** computing electron phase shifts and LTEM images from micromagnetic magnetization configurations.
- **Phase reconstruction:** transport-of-intensity (TIE) reconstruction from through-focal series, plus single-image reconstruction.
- **ML-based analysis:** self-supervised and simulation-trained approaches to quantitative magnetic imaging.

Source: [github.com/PyLorentz/PyLorentz](https://github.com/PyLorentz/PyLorentz)

For a taste of what PyLorentz simulates, try the [interactive Lorentz TEM demo]({{ '/interactive/lorentz/' | relative_url }}).

{% bibliography --cited_in_order --query @*[key=mccray2021understanding] %}

{% bibliography --cited_in_order --query @*[key=mccray2024ai] %}
