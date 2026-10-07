---
layout: about
title: about
permalink: /
subtitle: Postdoctoral Scholar · <a href='https://colab.stanford.edu'>Ophus Group</a> · Stanford University

profile:
  align: right
  image: prof_pic.jpg
  image_circular: false # crops the image to make it circular
  more_info: >
    <p>Stanford University</p>
    <p>Stanford, CA</p>

selected_papers: true # includes a list of papers marked as "selected={true}"
social: true # includes social icons at the bottom of the page

announcements:
  enabled: false # includes a list of news items
  scrollable: true # adds a vertical scroll bar if there are more than 3 news items
  limit: 5 # leave blank to include all the news in the `_news` folder

latest_posts:
  enabled: false # turn on once there are blog posts
  scrollable: true # adds a vertical scroll bar if there are more than 3 new posts items
  limit: 3 # leave blank to include all the blog posts
---

I'm a research scientist working at the intersection of **machine learning and electron microscopy**. I build self-supervised and
physics-informed methods for inverse problems in scientific imaging, including deep generative priors, implicit neural representations, and
differentiable forward models, and increasingly large pretrained models for materials data. Then I ship them as open-source tools that other
microscopists can use.

**Right now** I'm building [deep material priors]({{ '/projects/0_deep_material_priors/' | relative_url }}): **multimodal vision
transformer foundation models** for electron microscopy, pretrained at scale on simulated diffraction data together with crystal structure
and composition. This is a $1.2M program with the Toyota Research Institute, and I led the technical contributions behind the award.

I'm a postdoctoral scholar in [Colin Ophus](https://colab.stanford.edu)'s group at Stanford University, after starting with the group at the
National Center for Electron Microscopy at Berkeley Lab. There, I developed a self-supervised deep-prior framework for (S)TEM inverse
problems. Applied to electron ptychography, it gives reconstructions more than 10× faster and with 40% higher resolution than
state-of-the-art baselines, and it now underpins projects in ptychography, tomography, and crystallography. I also lead the ptychography and
machine-learning development of [quantEM](https://github.com/electronmicroscopy/quantem), an open-source library for quantitative electron
microscopy.

I did my Ph.D. in Applied Physics at Northwestern University and Argonne National Laboratory with Amanda Petford-Long and Charudatta Phatak.
I used Lorentz transmission electron microscopy and computational methods to study magnetic skyrmions and other spin textures in van der Waals magnets. I
also wrote [PyLorentz](https://github.com/PyLorentz/PyLorentz), a Python package for Lorentz TEM simulation and phase reconstruction. Before that, I
studied physics at Carleton College.

Want to learn more? Check out the [interactive demos]({{ '/interactive/' | relative_url }}), which run electron microscopy
simulations and reconstructions live in your browser.

<div data-widget="spin-field"></div>

<script type="module" src="{{ '/assets/js/widgets/mount.js' | relative_url }}"></script>
