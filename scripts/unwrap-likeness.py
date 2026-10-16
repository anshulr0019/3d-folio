"""Geometry-only xatlas helper. Images are baked by the Node asset pipeline."""
import json
import os
import sys

if os.environ.get("PORTFOLIO_UV_PACKAGES"):
    sys.path.insert(0, os.environ["PORTFOLIO_UV_PACKAGES"])
import numpy as np
import xatlas

with open(sys.argv[1]) as source:
    mesh = json.load(source)
atlas = xatlas.Atlas()
atlas.add_mesh(np.asarray(mesh["positions"], dtype=np.float32).reshape(-1, 3),
               np.asarray(mesh["indices"], dtype=np.uint32).reshape(-1, 3))
packing = xatlas.PackOptions()
packing.resolution = 1024
packing.padding = 4
atlas.generate(pack_options=packing)
mapping, indices, uvs = atlas[0]
with open(sys.argv[2], "w") as target:
    json.dump({"mapping": mapping.tolist(), "indices": indices.reshape(-1).tolist(),
               "uvs": uvs.reshape(-1).tolist(), "width": atlas.width, "height": atlas.height}, target)
