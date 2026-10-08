---
layout: post
title: "emdatabase: example data for electron microscopy"
date: 2026-10-09
description: A central index for downloading electron microscopy datasets and model weights from wherever they're hosted.
tags: emdatabase open-source data
categories: software
---

In scientific computing, the easiest way to share code or techniques is through Jupyter notebooks. Actually, in my experience, a Jupyter notebook is the only way to get people to look try using your code. There are some cool (and frankly better) alternatives such as [Marimo](https://marimo.io/), but academics tend to lag behind when it comes to technology and I don't think Jupyter is going away anytime soon. 

So you have some cool new method and you post a notebook, but you also need to share the data that goes along with it. This wouldn't seem to be a problem, you can host large files on Zenodo or have a publicly available google drive download, but every additional step decreases the chance that a curious PI or experimentally-focused grad student will actually get the code to run. Having users download the file(s), unzip them, put them in the right folder or change the paths, each step presents an opportunity for something to go wrong. 

We created [emdatabase](https://github.com/electronmicroscopy/emdatabase) to simplify this process so that sharing data is as simple as sharing the notebook and running a few lines of code. It is a central index of electron microscopy datasets--the files stay where they are hosted, and `emdatabase` downloads, verefies, and caches them for you. 

This project was started by [Carter Francis](https://github.com/CSSFrancis) after we kept circling back to this problem at our biweekly `electronmicroscopy` dev meeting (reach out if you want to join!); he introduced us to the nifty package [pooch](https://pypi.org/project/pooch/) and got things started using many of [hyperspy](https://hyperspy.org/) example datasets. 

We have since integrated `emdatabase` into the `electronmicroscopy` ecosystem, and expanded it to handle the distribution of trained ML model weights. Similar to datasets, when you publish a new ML method you need to share example code which necessarily includes the trained model weights. The catch for model weights is that it's not uncommon for later improved versions to be released as well. If the data is uploaded to Zenodo this is easy to handle, as all previous records are stored so we can just list all past versions along with `latest`. This poses a problem for Google Drive and similar hosting services, however, as they only serve the latest version of what has been uploaded. Our current solution is to cache each version of the weights on GitHub (which can handle files up to 50 GB), but we might have to come up with a more scalable solution if this catches on.



## Using it

Install it with `pip install em-database` (the import name is `emdatabase`). It's also a dependency of `quantEM`, so if you have `quantEM` in your environment you will also have `emdatabase`. 

Each dataset is a class, and downloading one returns a local path:

```python
from emdatabase.data import BilayerWS2
from quantem.core.io.file_readers import read_4dstem

path = BilayerWS2().download()             # fetched once, checksum-verified, then cached
data = read_4dstem(path)
```

The path goes straight into HyperSpy, quantEM, or whatever reader you use. Searching never touches the network, because the index ships
with the package. You can point downloads at a scratch disk, or at a shared group drive so a lab downloads each file only once. In Jupyter,
`emdatabase.browse()` opens an interactive browser that lists every dataset by technique and downloads one with a click.

For a more complete set of examples on how to use the package, check out the [tutorial notebook](https://github.com/electronmicroscopy/quantem-tutorials/blob/main/tutorials/core/em_data.ipynb) (the widgets don't persist when uploading to GitHub, so you will have to run the notebook to see what it actually looks like). 

The index currently holds about two dozen datasets: 4D-STEM, EELS, EBSD, Lorentz, cryo, in-situ, and simulated data, plus model weights
organized by ML task. The [full list](https://electronmicroscopy.github.io/emdatabase/all_data.html) has the metadata for each one.

## Adding your data

The most important feature of `emdatabase` (and why it's more than just a wrapper around `pooch`) is that it's a curated source for electron microscopy datasets that will continue to grow over time. The docs at [https://electronmicroscopy.github.io/emdatabase/](https://electronmicroscopy.github.io/emdatabase/) lets you browse through all of the datasets and model weights, sort by tags or technique, and find example data. Here are the datasets: 


<div data-widget="emdb-browser"></div>
<script type="module" src="{{ '/assets/js/widgets/mount.js' | relative_url }}"></script>



Adding a new dataset or model weights to `emdatabase` is quite straightforward. Internally, each entry is a short YAML file: a description, the source URL, a checksum and file size, the license, the techniques, and the authors. In practice, adding a new dataset is as easy as filling in the [new-dataset issue form](https://github.com/electronmicroscopy/emdatabase/issues/new?template=new_dataset.yaml). A GitHub Action turns it into the YAML file and opens the pull request. 

Your data stays wherever you host it. So far we've tested Zenodo, Google Drive, and files in GitHub repositories, and any publicly
accessible link should work. 

