---
title: "A First Look at Quantum Key Distribution"
date: 2026-07-08
excerpt: "The core idea of QKD in a few lines of mathematics — with a preview of our phiQKD work."
author: "Animesh Banik"
tags:
  - quantum computing
  - cryptography
---

Quantum key distribution (QKD) lets two parties generate a shared secret key whose secrecy follows from the laws of quantum mechanics rather than computational hardness. The canonical example is BB84, where a secret is encoded in the polarization of single photons.

The secrecy can be quantified by the von Neumann entropy. For a state $\rho$, the entropy is

$$ S(\rho) = -\operatorname{Tr}(\rho \log \rho). $$

A protocol is secure if the eavesdropper's information, $I_{E}$, satisfies

$$ I_{E} \leq \frac{S(\rho)}{2}, $$

so that privacy amplification can reduce the eavesdropper's knowledge to an arbitrarily small amount. The states involved are often written in the computational basis $\{ \lvert 0\rangle, \lvert 1\rangle \}$ and the Hadamard basis

$$ \lvert + \rangle = \frac{1}{\sqrt{2}}\big( \lvert 0\rangle + \lvert 1\rangle \big), \qquad \lvert - \rangle = \frac{1}{\sqrt{2}}\big( \lvert 0\rangle - \lvert 1\rangle \big). $$

In our ongoing work on the phiQKD protocol, we use *generalized state discrimination* instead of simple projective measurements. This improves the tolerable error rate and makes the protocol tunable. A full write-up is available as a preprint, and more details will appear here soon.
