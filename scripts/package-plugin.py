#!/usr/bin/env python3
"""Build the installable plugin without adding app dependencies."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys
root = Path(__file__).resolve().parents[1]
target = Path(sys.argv[1] if len(sys.argv) > 1 else 'dist/downloads/figget-world.zip')
target.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for name in ['figget-world.php', 'world.php', 'readme.txt']:
        archive.write(root / 'wordpress' / 'figget-world' / name, 'figget-world/' + name)
print(target)
