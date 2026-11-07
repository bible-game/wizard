"""
Copies the webapp's Play page into the wizard, unchanged, with everything of the webapp's own it imports, so the first-run
tutorial overlays the genuine page. What only works on the server or against the services (Next, actions, sign-in) is
not copied: stand-ins take their place (the actions and sign-in at their own paths under src/core, each marked as a
stand-in; Next, SWR, HeroUI and Sentry in src/web-shims, aliased in vite.config.ts). Run again after Play changes in the webapp:
    python3 scripts/sync-play.py [--dry]
A file the wizard already has and that differs from the webapp's is reported, not overwritten.
"""
import os, re, shutil, sys

WEB = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../webapp/src"))
WIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "../src"))
# the Play page, the first-visit tutorial and round notes that sit on it, and the home page's landing over it (their
# hosts, tutorial/play-host.tsx and home/home-host.tsx, are the webapp's own: the wizard's is src/demo/onboarding.tsx)
ROOTS = ["app/play/[game]/game.tsx", "app/play/play.sass", "app/play/[game]/tutorial/tutorial.tsx",
         "app/play/[game]/tutorial/round-tips.tsx", "app/home/landing-overlay.tsx"]
# server-only or service-bound: the wizard has stand-ins at these paths, so they're not followed
SHIMMED = ("core/action/", "core/util/auth-")
IMPORT = re.compile(r"""(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]""")

def resolve(spec, here):
    if spec.startswith("@/"): base = os.path.join(WEB, spec[2:])
    elif spec.startswith("."): base = os.path.normpath(os.path.join(os.path.dirname(here), spec))
    else: return None
    for ext in ["", ".ts", ".tsx", ".json", ".sass", "/index.ts", "/index.tsx"]:
        if os.path.isfile(base + ext): return base + ext
    return None

dry = "--dry" in sys.argv
seen, todo, shims = set(), [os.path.join(WEB, r) for r in ROOTS], set()
while todo:
    path = todo.pop()
    if path in seen: continue
    seen.add(path)
    if not path.endswith((".ts", ".tsx")): continue
    for a, b in IMPORT.findall(open(path).read()):
        spec = a or b
        target = resolve(spec, path)
        if not target: continue
        rel = os.path.relpath(target, WEB)
        if rel.startswith(SHIMMED): shims.add(rel); continue
        todo.append(target)

for path in sorted(seen):
    rel = os.path.relpath(path, WEB)
    dest = os.path.join(WIZ, rel)
    if os.path.exists(dest):
        same = open(dest, "rb").read() == open(path, "rb").read()
        print(("  same     " if same else "  DIFFERS  ") + rel)
        continue
    print("  copy     " + rel)
    if not dry:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(path, dest)
print("\nstood in for (the wizard's own, at the same paths):\n  " + "\n  ".join(sorted(shims)))
