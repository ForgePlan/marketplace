"""DELIBERATELY BROKEN variant for the negative control test (F3, Python side).
Bug: 'prerelease < release' inverted (returns 1 instead of -1 when b has no prerelease),
so v07 (1.0.0-rc.1 vs 1.0.0 -> expected -1) fails and INV-2 antisymmetry breaks."""


def _parse(v):
    no_build = v.split("+", 1)[0]
    if "-" in no_build:
        core_s, pre_s = no_build.split("-", 1)
        pre = pre_s.split(".")
    else:
        core_s, pre = no_build, []
    core = [int(x) for x in core_s.split(".")]
    return core, pre


def _sign(n):
    return 1 if n > 0 else (-1 if n < 0 else 0)


def _is_num(s):
    return s.isascii() and s.isdigit()


def semver_compare(a, b):
    ca, pa = _parse(a)
    cb, pb = _parse(b)
    for i in range(3):
        if ca[i] != cb[i]:
            return _sign(ca[i] - cb[i])
    if not pa and not pb:
        return 0
    if not pa:
        return 1
    if not pb:
        return 1  # BUG: should be -1
    for x, y in zip(pa, pb):
        if x == y:
            continue
        xn, yn = _is_num(x), _is_num(y)
        if xn and yn:
            return _sign(int(x) - int(y))
        if xn and not yn:
            return -1
        if yn and not xn:
            return 1
        return -1 if x < y else 1
    return _sign(len(pa) - len(pb))
