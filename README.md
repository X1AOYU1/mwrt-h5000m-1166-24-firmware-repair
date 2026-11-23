# MWRT H5000M 1166-24 Firmware Repair

This repository is a clean, independent workspace for inspecting and repairing the firmware image supplied for the Hiveton H5000M.

## Input firmware

- File: Mwrt-h5000m-tf-1166-24-20261123.bin
- Board identifier in image: hiveton-h5000m
- Image format: sysupgrade tar (CONTROL, kernel, root)
- Size: 165,151,595 bytes
- SHA-256: 438b38eb1a106f200d4892b66ab33aeae0b27ec45adbd40637de8097d9333805

The original image is published as a GitHub Release asset so it does not inflate the normal Git history. The local working copy and extracted filesystem belong under the ignored work/ directory.

## Repair status

The input image is being inspected independently. No changes from earlier H5000M firmware work are assumed to apply. Findings and reproducible fixes will be added here after validation against this image.
