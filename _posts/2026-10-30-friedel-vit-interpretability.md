---
layout: post
title: What a diffraction transformer learns about Friedel's law
date: 2026-10-30
description: A vision transformer pretrained on electron diffraction knows where the Bragg disks are, but not what Friedel's law says about their intensities.
tags: machine-learning interpretability 4d-stem diffraction
categories: research
---

In four-dimensional scanning transmission electron microscopy (4D-STEM), a focused electron beam is scanned across a sample and a diffraction pattern is recorded at every probe position. Each pattern encodes the local crystal structure, orientation, strain, and thickness of the sample, but extracting this information is difficult. Machine learning is a natural fit because the datasets are large and simulations can provide as much training data as we want. We have been training a vision transformer (ViT) as a general-purpose encoder for electron diffraction patterns, meant to serve as the backbone for downstream tasks such as orientation, strain, and phase mapping. Before building on top of it, we wanted to know what physics the encoder has actually learned. This post looks at Friedel's law and uses the tools of mechanistic interpretability to ask how the model represents it.

This first section gives some background on the physics, the model, and the challenges of this work before we get to our preliminary results.

**Diffraction patterns.** When a beam passes through a crystal, it scatters into discrete directions set by the crystal lattice. In the convergent-beam electron diffraction (CBED) patterns studied here, the incoming beam is a cone rather than a plane wave, so each scattered beam appears as a disk instead of a point. The undiffracted beam (the zero beam) sits at the center, and every other disk sits at a position **g**, a vector of the crystal's reciprocal lattice. The positions of the disks are fixed by the lattice geometry alone and are straightforward to calculate. The disk intensities, on the other hand, depend on the arrangement and species of atoms in the unit cell, the sample thickness, the orientation, and the beam energy, and this is where most of the useful information lives.

**The model.** A vision transformer divides the image into square patches (here 16 x 16 pixels) and turns each patch into a vector, called a token. The tokens then pass through a stack of blocks. In each block, every token is updated by attention, a weighted sum over all other tokens in which the weights depend on how well a "query" computed from one token matches a "key" computed from another, and then by a small per-token neural network (an MLP). Each block runs several attention heads in parallel, and each head can learn a different pattern of which tokens to look at. The running sum of all these updates is called the residual stream. Our encoder is the size of the standard ViT-S (12 blocks, 6 heads per block, and 384-dimensional tokens). It has no learned position table; instead it tells tokens where they are with rotary position embeddings (RoPE), which rotate the queries and keys by an angle proportional to their position, so that attention depends only on the offset between two tokens.

**Pretraining.** The encoder was pretrained by masked image modeling in the SimMIM style (Xie et al. 2022), the image counterpart of the fill-in-the-blank training behind language models. Most of each pattern is hidden, and the model is trained to predict the missing pixels. Figure 1 shows what this looks like. The training data are simulated CBED patterns over many orientations and thicknesses. During training, most of the image is hidden in 48 px blocks, and the visible part is degraded by detector blur, an inelastic background, and shot noise at doses as low as 20,000 electrons for the whole pattern, which is about 0.01 electrons per pixel. The model has to predict the clean pattern. The patterns are also augmented geometrically, as they would vary on a real microscope. They are shifted so that the zero beam is not always at the image center, rescaled to mimic changes in camera length, flipped, and cropped and resampled so that the image size varies from 128 to 1200 px. All of this makes symmetry harder to learn. The model cannot find -**g** by reflecting through the image center or by memorizing where disks sit for a given crystal; it has to find the zero beam and work out the lattice from each pattern.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/friedel_pretraining.png" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
Figure 1. Pretraining by masked inpainting, on a held-out silicon [110] pattern (17 nm thick) at the lowest training dose (20,000 electrons per pattern). Red marks the part of the image the model sees; the rest is hidden. The model reconstructs the pattern, including the disks in the zoomed region, which are hidden completely or seen only as a few scattered counts.
</div>

The model is quite good after pretraining. Most of the disks in the zoomed region are entirely hidden, and the visible parts carry only a few counts per patch, yet the model puts disks of the right size and brightness in the right places.

The inpainting itself is not the goal. The output head is discarded after pretraining, and downstream tasks will read the encoder's tokens. What matters is whether those tokens carry the physics of the pattern. For phase and orientation mapping, much of that physics is in the relative intensities of the disks (which reflections are bright, which are forbidden, and how the intensity at **g** compares with -**g**), so we want to know whether the encoder treats those relationships as physics or as texture. Inpainting is a useful window onto this, because we can hide a disk and ask what the model thinks should be there.

**Friedel's law.** If an electron (or an X-ray) scatters only once on its way through the sample, the intensity of the beam at **g** is proportional to \|F(**g**)\|², where F(**g**) is the structure factor. For a real potential, F(-**g**) is the complex conjugate of F(**g**), so I(**g**) = I(-**g**). This is Friedel's law, and it means a diffraction pattern looks the same after a 180 degree rotation about the zero beam. The single-scattering (kinematical) approximation works well for X-rays, which interact weakly with matter, and Friedel's law then holds except near absorption edges. Electrons interact with matter far more strongly, and in a sample only tens of nanometers thick each electron scatters many times. Under this dynamical scattering, Friedel's law breaks in two physically meaningful ways (Figure 2). In a crystal without an inversion center (here GaN viewed along a polar direction), multiple scattering makes I(**g**) and I(-**g**) differ even when the beam is aligned exactly with a zone axis; this is the basis for determining the polarity of crystals by CBED. The second way is when the crystal is tilted off a zone axis by even a few milliradians. In this case **g** and -**g** are excited unequally, which breaks the symmetry even in centrosymmetric crystals like silicon.

The disk positions, however, are always symmetric, because if **g** is a lattice vector then so is -**g**. A model that understands diffraction should therefore use the symmetry where it holds and not where it fails. It should know that a disk at **g** implies a disk at -**g**, and so be able to place hidden disks from a few visible ones. It should not assume that the two disks are equally bright, since in electron diffraction they usually are not. The rest of this post uses Friedel symmetry to separate the "where" of diffraction (disk positions) from the "what" (disk intensities).

## Background from interpretability research

Most work on the internals of vision transformers has focused on classifiers and contrastive encoders trained on natural images. A few of these results have guided this study. Attention heads in ViTs tend to specialize into positional and content operators (Kim et al. 2021; Doshi et al. 2026). Masked image models keep local, diverse attention in every layer (Xie et al. 2023; Park et al. 2023), but how they fill in a hidden patch has not been studied mechanistically. Networks trained with augmentation can become close to equivariant to the augmenting group (Gruver et al. 2023), and this can be measured directly by fitting linear maps between representations of transformed inputs (Lenc and Vedaldi 2015). Finally, several recent papers warn that information a probe can decode is not necessarily information the model uses (Huang and Chang 2025), and that models trained on physical data often predict well without using the law behind the data (Vafa et al. 2025). Diffraction is a good testbed for these ideas. Position has a physical meaning, the symmetry group is known exactly along with where it breaks, and we can simulate counterfactual inputs (the same crystal at a different thickness or tilt) with a known answer.

## Friedel's law in the data

Figure 2 shows the three regimes in our simulations. Most of the training patterns are simulated near a low-index zone axis, and the rest are a mix of two-beam conditions, random orientations, and structures with added strain, bending, and distortions. The zone-axis patterns are rarely exactly on zone, however. Only about 20% of all patterns are within 5 mrad, and about 1% are within 1 mrad. So almost none of the training data obeys Friedel's law exactly, and a model that copied intensities from -**g** to **g** would be wrong nearly all the time.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/friedel_regimes.png" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
Figure 2. Three Friedel regimes. Top, simulated CBED patterns (log intensity) of silicon on the [110] zone axis, the same crystal tilted by 5 mrad, and polar GaN on the [100] zone axis. Bottom, the intensity at each point divided by the intensity at the inverted point (180 degree rotation about the zero beam). On zone, silicon is symmetric to within frozen-phonon noise. The tilt breaks the symmetry with a smooth gradient across the pattern, and polar GaN breaks it disk by disk even at the exact zone axis. In all three, the disk positions are symmetric.
</div>

All tests below use noise-free inputs with a fixed background, cropped to 1184 px so that the zero beam sits on a corner between patches and inversion maps patches onto patches. We used two datasets, about 2,000 held-out patterns from crystal configurations the model never saw, and a controlled set we simulated with the training code. Below, "symmetric" means a centrosymmetric crystal (or a non-polar projection) at the exact zone axis, "tilted" means any tilt, and "polar" means a polar zone axis at the exact orientation. Blocks are numbered 1 to 12 from the input, and the heads in each block 0 to 5.

## Results

### The model knows where the disks are

The cleanest test of "where versus what" is to hide half the pattern. With a half-plane through the zero beam hidden, every hidden disk has its Friedel pair in the visible half, so the visible half contains everything needed to place the hidden disks and, if Friedel's law holds, to set their brightness too. Figure 3 shows the result for the three patterns of Figure 2.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/friedel_where_what.png" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
Figure 3. Hiding half the pattern. Left, the input (red, the visible half), the model's prediction in the hidden half, and the target. Right, mean error of the predicted intensity of hidden disks (log intensity, averaged over each disk) for the model and for simply copying the intensity of the visible Friedel pair. The three colored pairs are the regimes of the controlled set, and the gray pair is the held-out patterns.
</div>

The model puts every hidden disk in the right place. Measured over the controlled set, the center of each predicted disk lies a median of 2.5 px from the center of the true disk, under a tenth of the disk radius, and the predicted disks have about 75% of the true contrast against the background. Under the training-style block mask, the error is 1.2 px and the contrast 92%. The held-out data give the same picture (3.3 px for the half mask and 1.3 px for the training mask). There is a limit. With 90% of the pattern hidden, well beyond the fraction hidden in training, the model stops drawing disks at all (predicted contrast 1 to 4% of the truth).

Two measurements show that the model's tokens carry the geometry needed for this. First, the tokens learn their own position relative to the zero beam (Figure 4). After each block of the encoder, we fit a linear map from each token's residual-stream vector to its position relative to the zero beam on half the patterns, and score it on the other half. We ask for two things. One is the distance \|**g**\| from the zero beam, which is the same for every token on a ring. The other is the vector **g** itself (its row and column components, with sign), which also says in which direction the token lies. Only the vector tells a token where its Friedel pair is, since -**g** has the same distance but the opposite direction. The distance is easy to read out, with R² of 0.8 to 0.94 from the first block on. The vector is harder, reaching R² of 0.66 for visible tokens and 0.78 for hidden ones by block 9. Hidden tokens all enter the model as the same learned mask vector, so whatever they know about their position they have learned from their neighbors through attention.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/friedel_position_probe.png" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
Figure 4. How well a linear probe reads a token's position from the encoder's residual stream after each block (R² on held-out patterns). "emb" is the patch embedding before the first block. Gray, the distance |<b>g</b>| from the zero beam. Orange, the vector <b>g</b> from the zero beam to the token (R² averaged over its two components). Solid lines are visible tokens, and dashed lines are hidden tokens, which all start as an identical mask token.
</div>

This probe cannot tell whether the tokens measure **g** from the zero beam or from the center of the image. The patterns here were cut with the zero beam up to 8 patches off center, but that is small compared with the 58-patch frame, so the two coordinates are strongly correlated and probes for them score the same.

To separate the two, we looked at how attention heads find each token's Friedel pair (Figure 5). For a hidden query token sitting on a disk at **g**, we compare the attention a head gives to the token at -**g** with the attention it gives to other disks at the same \|**g**\| and with the same brightness. Most heads give the pair less attention than the matched disks, because the pair is the farthest disk at that \|**g**\| and most heads prefer nearby tokens. In four heads, the Friedel pair gets 2.4 to 3.9 times more attention than the matched disks, and it gets more in 79 to 97% of individual queries. These are heads 0, 3, and 4 in block 10 and head 2 in block 8 (Figure 5b).

To find -**g**, a head has to know where **g** is measured from. With rotary embeddings, attention depends only on the offset between two tokens, and the offset from **g** to -**g** is -2**g**, which depends on where the query sits relative to the zero beam. In training, the zero beam was never more than about 2 patches from the center of the image, so the model could have used the image center as its origin. To test this, we cut frames out of each pattern with the zero beam moved up to 11 patches off center. The partner heads follow the zero beam (Figure 5c). At every shift, block 10 head 0 puts the same attention (about 0.008 per token) on the true Friedel pair, while attention on the reflection through the frame center falls to the level of a control at the same \|**g**\| (about 0.0005) as soon as the two points separate.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/friedel_attention.png" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
Figure 5. Heads that find the Friedel pair. (a) A GaN pattern with the zero beam (+) moved off the frame center (x). For the query disk (cyan), the Friedel pair is the reflection through the zero beam (orange); the reflection through the frame center (dashed blue) is where a head using the image as its reference would look. (b) For every head, attention from a hidden query on a disk to its Friedel pair, divided by attention to other disks at the same |<b>g</b>| and brightness. (c) Attention per token from hidden queries in block 10 head 0 as the zero beam moves away from the frame center. The shaded region covers the shifts seen in training.
</div>

So the model has what it needs to use Friedel symmetry. Its tokens know where they are relative to the zero beam, and dedicated heads locate each token's Friedel pair from the physical origin of the pattern, even when that origin is moved far outside anything seen in training.

### But it does not use the pair for intensities

Disk positions are only half of the information in a diffraction pattern. The intensity of a disk relative to its Friedel pair is important as well. On a zone axis of a centrosymmetric crystal the two must match, and in polar GaN their difference tells which way the crystal points. So the question here is whether the model treats the pair's intensity as information about the hidden disk.

Figure 3 gives a first answer, and the model does not use the symmetry for intensities. On symmetric zone-axis patterns, where copying the brightness of the visible pair would be nearly exact (mean error 0.03), the model's hidden disks are off by 0.30, ten times worse. In the top row of Figure 3, the hidden disks of on-zone silicon come out visibly dimmer than their pairs. On tilted and polar patterns, where copying would be wrong, the model's error (0.44 and 0.55) is about the same as the copying error (0.49 and 0.48). On the held-out patterns, which are far from symmetric, the model beats copying by a factor of two (0.55 against 1.06).

The model does much better on intensities under the training-style mask than under the half-plane mask. A joint regression of each hidden disk's predicted brightness on its true brightness and on its pair's brightness gives a slope of 0.9 to 1.0 on the true brightness and only 0.01 to 0.09 on the pair. On tilted and polar patterns, the mean error of hidden disks is 0.19 to 0.22, against 0.49 to 0.53 for copying the pair. The model gets the intensity of a hidden disk from its surroundings (the neighboring disks and the overall thickness and tilt), with almost no weight on the disk's Friedel pair.

If the partner heads do not carry the pair's intensity, they must be doing something else. Mean-ablating block 10 heads 0, 3, and 4 together (replacing their output with its average over tokens) raises the inpainting error by 77%, against 17% for the other three heads of the same block (Figure 6). The increase is the same whether or not the hidden block's Friedel pair is visible. Block 8 head 2 can be removed at a cost of 3%. The block 10 heads matter to the model, and their importance does not depend on the pair being available. Activation patching agrees. When we change the pixels of the visible pair (replacing them with the same crystal at another thickness) and copy the output of a single partner head from this edited run into the original run, the prediction for the hidden disk moves only about 3% as much as it does under the full edit.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/friedel_head_ablation.png" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
Figure 6. Inpainting error on hidden bright blocks after mean-ablating groups of heads, relative to the intact model, for blocks whose Friedel pair is visible (circles) or also hidden (squares). Orange marks the heads that attend to the Friedel pair.
</div>

What these heads compute is still open. Their attention lands on the pair and also along the whole lattice row through it, so they may be gathering information along systematic rows, which would help with positions more than intensities. A probe for the direction of the pattern's Friedel breaking (the tilt direction) does poorly on their output (R² of 0.12 to 0.15, against 0.35 to 0.53 for the full residual stream), so they are not summarizing the asymmetry either.

### The representation carries the symmetry group of the square

The model does not single out Friedel pairs for intensities, yet it does keep track of symmetry in its internal representation. We fit, at every depth, the best linear map rho that takes the representation of the original pattern, h(x), to the representation of a transformed pattern, h(Tx), after moving the tokens accordingly (Lenc and Vedaldi 2015). If the fit is good, the transformation acts on the representation as a fixed linear operation. Figure 7 shows the result for the flips and the 180 degree rotation, which were in the training augmentation, and for the 90 degree rotation and the transpose, which were not.

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/friedel_equivariance.png" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
Figure 7. Left, held-out error of the best linear map between representations of a pattern and its transformed version, by depth. The control maps one pattern onto a different pattern. Middle, how well the fitted maps obey the group's multiplication table. Right, eigenvalues of the fitted 90 degree map at block 6.
</div>

The fit is good everywhere (relative error 0.01 at the input, rising to about 0.2 at the output, against 0.53 to 0.66 for the control), and the 90 degree rotation, which the model never trained on, is represented almost as well as the augmented operations. Many zone axes in the data have 4-fold or 6-fold symmetry, which probably teaches it. The fitted maps also compose like the group they come from. A horizontal flip followed by a vertical flip gives the 180 degree map to within 2% at block 6, two 90 degree maps give the 180 degree map to within 3%, and four give the identity to within 6%. The eigenvalues of the 90 degree map sit at 1, -1, i, and -i, as they must for a rotation of order four. The residual stream therefore holds a near-exact linear representation of the symmetry group of the square, with Friedel inversion as one of its elements.

Friedel breaking is carried through this representation faithfully. When a pattern is replaced by its exact inversion, the representation changes in proportion to how much the pattern itself changes, with the same gain (about 0.9 through block 9) as for a mirror operation. Nothing in the network amplifies or suppresses Friedel breaking specifically; it is treated like any other feature of the pattern.

### The model continues whatever asymmetry it sees

Finally, we asked whether the model expects Friedel's law to hold or to fail by showing it patterns that break the physics. We edited whole patterns in physical and unphysical ways and measured how much worse the inpainting gets (Figure 8).

<div class="row justify-content-sm-center">
<div class="col-sm-12 mt-3 mt-md-0">
{% include figure.liquid path="assets/img/blog/friedel_counterfactual.png" class="img-fluid rounded fig-white" zoomable=true %}
</div>
</div>
<div class="caption">
Figure 8. Top, a GaN [100] pattern and the edits applied to it. "Inverted" is a 180 degree rotation (the same crystal turned upside down, a physical pattern). "Symmetrized" forces Friedel's law. "Asymmetry x 1.5" amplifies the pattern's own Friedel breaking. The odd and even gradients brighten one side of the pattern by up to a factor of 3, with (odd) or without (even) the opposite side darkening. Bottom left, inpainting error relative to the original pattern. Bottom right, for Friedel pairs where both disks are hidden, the asymmetry the model predicts against the true asymmetry of the edited pattern.
</div>

Inverting a pattern leaves the error unchanged, as the equivariance above implies. Forcing Friedel's law on a polar or tilted pattern, which no real crystal at that orientation would produce, makes inpainting easier, lowering the error by 20 to 27%; a model with a physical prior would find these patterns strange. When both disks of a pair are hidden, the asymmetry the model predicts between them follows the asymmetry of the pattern in front of it, close to the diagonal, across every regime and edit. Symmetrized GaN gets symmetric predictions, and silicon with an artificial odd gradient gets strongly asymmetric ones. The model has not learned that GaN [100] must break Friedel's law or that on-zone silicon must obey it. It reads the asymmetry off the visible part of the pattern and continues it.

## Conclusions

The diffraction encoder appears to have learned the geometry of diffraction. It places hidden disks at the right positions from a fraction of the pattern, its tokens know their position relative to the zero beam, and a handful of heads find each token's Friedel pair using the zero beam as the origin, even when the zero beam is moved far from where it was during training. Its residual stream represents the full symmetry group of the square as a clean linear action, including a rotation it never trained on.

It has not learned Friedel's law as a rule for intensities. It gives a hidden disk's Friedel pair almost no weight when predicting the disk's brightness, it does worse than simple copying on patterns where copying is exactly right, and it is comfortable with symmetric patterns where physics says they should be asymmetric. Instead, it reads the local asymmetry off whatever it can see and continues it. Given its training data, this is a sensible strategy. Only about 1% of the training patterns are close enough to a zone axis for Friedel's law to hold, so a copying rule would have been wrong for nearly every pattern it saw.

For the encoder's intended use, the picture is mixed. On the positive side, the representation does not throw intensity relationships away. Friedel breaking passes through the encoder with the same gain as any other change to the pattern, so the relative intensities that phase and polarity mapping depend on are still present in the tokens for a downstream task to read. On the other side, the encoder has no prior that ties those relationships to the crystal. It does not expect polar GaN on a zone axis to be asymmetric or on-zone silicon to be symmetric, so a downstream task will have to learn that connection from its own labels. Whether the tokens already make it easy to learn, for example by encoding the sign of the polar asymmetry in a few directions, is the next thing to measure.

The study also reinforced a lesson from the interpretability literature, namely that attention is not the same as use. The partner heads are the most striking feature of the attention maps, and they are important to the model, but they do not carry the pair's intensity into the prediction.

## References

- Doshi, Fel, Konkle, and Alvarez. Bi-orthogonal factor decomposition for vision transformers. [arXiv:2601.05328](https://arxiv.org/abs/2601.05328), 2026.
- Erdogan and Lucic. Equivariant sparse autoencoders: mechanistic interpretability of neural networks on symmetric data. NeurIPS 2025 workshops (Mechanistic Interpretability; UniReps). [arXiv:2511.09432](https://arxiv.org/abs/2511.09432).
- Gruver, Finzi, Goldblum, and Wilson. The Lie derivative for measuring learned equivariance. ICLR 2023. [arXiv:2210.02984](https://arxiv.org/abs/2210.02984).
- Huang and Chang. Causality ≠ decodability, and vice versa: lessons from interpreting counting ViTs. [arXiv:2510.09794](https://arxiv.org/abs/2510.09794), 2025.
- Kim, Wu, Dai, Zhang, Yan, Vajda, and Kim. Rethinking the self-attention in vision transformers. CVPR Workshops 2021, pp. 3071-3075. [CVF open access](https://openaccess.thecvf.com/content/CVPR2021W/ECV/html/Kim_Rethinking_the_Self-Attention_in_Vision_Transformers_CVPRW_2021_paper.html).
- Lenc and Vedaldi. Understanding image representations by measuring their equivariance and equivalence. CVPR 2015. [arXiv:1411.5908](https://arxiv.org/abs/1411.5908).
- Park, Kim, Heo, Kim, and Yun. What do self-supervised vision transformers learn? ICLR 2023. [arXiv:2305.00729](https://arxiv.org/abs/2305.00729).
- Vafa, Chang, Rambachan, and Mullainathan. What has a foundation model found? Using inductive bias to probe for world models. ICML 2025. [arXiv:2507.06952](https://arxiv.org/abs/2507.06952).
- Xie, Zhang, Cao, Lin, Bao, Yao, Dai, and Hu. SimMIM: a simple framework for masked image modeling. CVPR 2022. [arXiv:2111.09886](https://arxiv.org/abs/2111.09886).
- Xie, Geng, Hu, Zhang, Hu, and Cao. Revealing the dark secrets of masked image modeling. CVPR 2023. [arXiv:2205.13543](https://arxiv.org/abs/2205.13543).
