"""Implementation of SPEC-001 semver_compare. Pure: no I/O, no time, no randomness.
Generated to conform to the frozen corpus; the corpus is the oracle (read-only)."""


def _parse(v):
    no_build = v.split("+", 1)[0]  # build metadata ignored
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
    return s.isascii() and s.isdigit()  # F2: ASCII-only, matches TS /^[0-9]+$/


def semver_compare(a, b):
    ca, pa = _parse(a)
    cb, pb = _parse(b)
    for i in range(3):
        if ca[i] != cb[i]:
            return _sign(ca[i] - cb[i])  # numeric, not lexical
    if not pa and not pb:
        return 0
    if not pa:
        return 1  # release > prerelease
    if not pb:
        return -1  # prerelease < release
    for x, y in zip(pa, pb):
        if x == y:
            continue
        xn, yn = _is_num(x), _is_num(y)
        if xn and yn:
            return _sign(int(x) - int(y))
        if xn and not yn:
            return -1  # numeric < non-numeric
        if yn and not xn:
            return 1
        return -1 if x < y else 1  # both non-numeric: ASCII
    return _sign(len(pa) - len(pb))  # more fields wins
