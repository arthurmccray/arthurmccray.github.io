---
layout: post
title: "emdatabase: example data for electron microscopy"
date: 2026-10-09
description: A central index for downloading electron microscopy datasets and model weights from wherever they're hosted.
tags: emdatabase open-source data
categories: software
---

In scientific computing, the easiest way to share code or techniques is through a Jupyter notebook. Actually, in my experience, a notebook
is the only way to get people to try your code. There are some cool (and frankly better) alternatives such as [Marimo](https://marimo.io/),
but academics tend to lag behind when it comes to technology, and I don't think Jupyter is going away anytime soon.

So you have a cool new method and you post a notebook, but you also need to share the data that goes with it. That doesn't sound like a
problem: you can host large files on Zenodo or as a public Google Drive download. But every extra step lowers the chance that a curious PI
or an experimentally focused grad student will actually get the code to run. Downloading the files, unzipping them, putting them in the
right folder, changing the paths, each step is an opportunity for something to go wrong.

We created [emdatabase](https://github.com/electronmicroscopy/emdatabase) so that sharing data is as simple as sharing the notebook and
running the first cell. It's a central index of electron microscopy datasets. The files stay where they're hosted, and `emdatabase`
downloads, verifies, and caches them for you.

[Carter Francis](https://github.com/CSSFrancis) started the project after we kept circling back to this problem at our biweekly
`electronmicroscopy` dev meeting (reach out if you want to join!). He introduced us to the nifty package [pooch](https://pypi.org/project/pooch/)
and got things started with many of the [HyperSpy](https://hyperspy.org/) example datasets. We have since integrated `emdatabase` into the
[`electronmicroscopy`](https://github.com/electronmicroscopy) ecosystem alongside [quantEM](https://github.com/electronmicroscopy/quantem),
and expanded it to distribute trained ML model weights as well.

## Using it

Install it with `pip install em-database` (the import name is `emdatabase`). It's also a dependency of quantEM, so if you have quantEM in
your environment, you already have `emdatabase`.

Each dataset is a class, and downloading one returns a local path:

```python
from emdatabase.data import BilayerWS2
from quantem.core.io.file_readers import read_4dstem

path = BilayerWS2().download()  # fetched once, checksum-verified, then cached
data = read_4dstem(path)
```

The path goes straight into quantEM, HyperSpy, or whatever reader you use. You can also search the index from Python with
`emdatabase.search("4d-stem strain")` or `emdatabase.filter(technique="4D-STEM")`; neither touches the network, because the index ships
with the package. Downloads can go to a scratch disk, or to a shared group drive so a lab downloads each file only once. In Jupyter,
`emdatabase.browse()` opens an interactive browser that lists every dataset by technique and downloads one with a click.

For a more complete set of examples, check out the
[tutorial notebook](https://github.com/electronmicroscopy/quantem-tutorials/blob/main/tutorials/core/em_data.ipynb). (Widgets don't
persist in notebooks on GitHub, so you'll have to run it to see what they actually look like.)

## What's in it

The most important feature of `emdatabase`, and what makes it more than just a wrapper around `pooch`, is a curated source of
electron microscopy data that will keep growing over time. It currently holds about two dozen datasets (4D-STEM, EELS, EBSD, Lorentz,
cryo, in-situ, and simulated data), plus model weights organized by ML task. Here's what's we have right now; search, filter by technique, and
click an entry for its metadata and the line that loads it:

<div data-widget="emdb-browser"></div>
<script type="module" src="{{ '/assets/js/widgets/mount.js' | relative_url }}"></script>

The [docs](https://electronmicroscopy.github.io/emdatabase/) have the same browser, always up to date, for both the
[datasets](https://electronmicroscopy.github.io/emdatabase/all_data.html) and the
[model weights](https://electronmicroscopy.github.io/emdatabase/weights.html).

## Model weights

Model weights have the same problem as datasets. When you publish a new ML method, the example code has to come with the trained weights.
The catch is that improved versions are often released later. If the weights are on Zenodo, this is easy to handle; every previous record
is kept, so we can list all past versions along with `latest`. Google Drive and similar services are harder, because they only serve the
latest upload. Our current solution is to archive each version of the weights on GitHub (which can handle files up to 100 MB), but we will
need a more scalable solution if this catches on.

## Adding your data

Adding a new dataset or model weights is straightforward. Internally, each entry is a short YAML file containing a description, the source URL, a
checksum and file size, the license, the techniques, and the authors. In practice, you just fill in the
[new-dataset issue form](https://github.com/electronmicroscopy/emdatabase/issues/new?template=new_dataset.yaml), and a GitHub Action turns
it into the YAML file and opens the pull request.

Your data stays wherever you host it. So far we've tested Zenodo, Google Drive, and files in GitHub repositories, and any publicly
accessible link should work. If you have a dataset that others would find useful, please add it!

As always, reach out on the GitHub repo and open an Issue if you're having problems, or just email me directly with any questions.
