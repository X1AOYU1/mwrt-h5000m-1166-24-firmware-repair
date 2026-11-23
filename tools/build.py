"""Rebuild the MWRT input without extracting POSIX file metadata onto the host."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile

repo = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('image', type=Path)
args = parser.parse_args()
manifest = json.loads((repo / 'firmware/manifest.json').read_text())
assert hashlib.file_digest(args.image.open('rb'), 'sha256').hexdigest() == manifest['sha256'], 'wrong input firmware'
work = repo / 'build'
out = repo / 'dist'
work.mkdir(exist_ok=True)
out.mkdir(exist_ok=True)
base = args.image.resolve()
os.chdir(work)

run = lambda *argv: subprocess.run(argv, check=True)
rootname = 'sysupgrade-hiveton-h5000m/root'
with tarfile.open(base) as src, open('root', 'wb') as dest:
    shutil.copyfileobj(src.extractfile(rootname), dest)
run('fwtool', '-i', 'metadata.json', str(base))
run('unsquashfs', '-force', '-no-progress', '-pf', 'base.pseudo', 'root')
end = b'# START OF DATA - DO NOT MODIFY\n#\n'
changes = {p.relative_to(repo/'overlay').as_posix().encode():p.read_bytes() for p in (repo/'overlay').rglob('*') if p.is_file()}
assert set(changes) == {b'usr/libexec/mwrt-clients', b'www/luci-static/resources/mwrt-topo.js', b'www/luci-static/resources/mwbehav/main.js', b'usr/bin/footer.htm', b'www/luci-static/resources/view/system/flash.js'}
with open('base.pseudo','rb') as src, open('patched.pseudo','wb') as dst:
    header = bytearray()
    while not header.endswith(end):
        line = src.readline(); assert line and len(header)<5000000; header.extend(line)
    # Preserve the unmodified pseudo data stream, then append the replacement files.
    offset = os.fstat(src.fileno()).st_size-src.tell()
    header = bytes(header)
    seen = set()
    for line in header.splitlines(keepends=True):
        name = line.split(b' ',1)[0]
        if name in changes:
            cols = line.split(); assert cols[1] == b'R' and cols[-1] == b'0'
            cols[6:8] = [str(len(changes[name])).encode(),str(offset).encode()]; offset += len(changes[name]); seen.add(name)
            line = b' '.join(cols)+b'\n'
        dst.write(line)
    assert seen == changes.keys()
    shutil.copyfileobj(src,dst)
    for line in header.splitlines():
        name = line.split(b' ',1)[0]
        if name in changes: dst.write(changes[name])
run('mksquashfs','-','patched.root','-pf','patched.pseudo','-noappend','-comp','xz','-b','262144','-no-xattrs','-no-progress','-processors','4')
image = out/'Mwrt-h5000m-tf-1166-24-topology-v7.bin'
with tarfile.open(base) as src, tarfile.open(image,'w',format=tarfile.GNU_FORMAT) as dst:
    for item in src:
        if item.name==rootname:
            item.size=Path('patched.root').stat().st_size
            with open('patched.root','rb') as root: dst.addfile(item,root)
        else: dst.addfile(item,src.extractfile(item) if item.isfile() else None)
run('fwtool','-I','metadata.json',str(image))
run('fwtool','-i','check.json',str(image))
assert Path('metadata.json').read_bytes()==Path('check.json').read_bytes()
with tarfile.open(base) as src, tarfile.open(image) as result:
    assert src.getnames()==result.getnames()
    for name in src.getnames():
        if name!=rootname and src.getmember(name).isfile(): assert src.extractfile(name).read()==result.extractfile(name).read()
    assert hashlib.file_digest(result.extractfile(rootname),'sha256').digest()==hashlib.file_digest(open('patched.root','rb'),'sha256').digest()
for name, data in changes.items():
    assert subprocess.check_output(['unsquashfs','-cat','patched.root',os.fsdecode(name)])==data
print(image,hashlib.file_digest(image.open('rb'),'sha256').hexdigest())
