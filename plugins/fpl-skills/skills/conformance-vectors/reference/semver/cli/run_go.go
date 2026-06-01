// Go runner: reads TSV "a<TAB>b" lines from stdin, prints semver_compare per line.
// Self-contained (impl + CLI). SEMVER_BREAK env injects the same release/prerelease bug.
package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func isNum(s string) bool {
	if s == "" {
		return false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func sign(n int) int {
	if n > 0 {
		return 1
	}
	if n < 0 {
		return -1
	}
	return 0
}

func parse(v string) ([]int, []string) {
	if i := strings.Index(v, "+"); i >= 0 {
		v = v[:i]
	}
	var coreStr string
	var pre []string
	if i := strings.Index(v, "-"); i >= 0 {
		coreStr = v[:i]
		pre = strings.Split(v[i+1:], ".")
	} else {
		coreStr = v
		pre = []string{}
	}
	parts := strings.Split(coreStr, ".")
	core := make([]int, len(parts))
	for k, p := range parts {
		n, _ := strconv.Atoi(p)
		core[k] = n
	}
	return core, pre
}

func cmp(a, b string, broken bool) int {
	ca, pa := parse(a)
	cb, pb := parse(b)
	for i := 0; i < 3; i++ {
		if ca[i] != cb[i] {
			return sign(ca[i] - cb[i])
		}
	}
	if len(pa) == 0 && len(pb) == 0 {
		return 0
	}
	if len(pa) == 0 {
		if broken {
			return -1 // injected bug
		}
		return 1
	}
	if len(pb) == 0 {
		return -1
	}
	n := len(pa)
	if len(pb) < n {
		n = len(pb)
	}
	for i := 0; i < n; i++ {
		x, y := pa[i], pb[i]
		if x == y {
			continue
		}
		xn, yn := isNum(x), isNum(y)
		if xn && yn {
			xi, _ := strconv.Atoi(x)
			yi, _ := strconv.Atoi(y)
			return sign(xi - yi)
		}
		if xn && !yn {
			return -1
		}
		if yn && !xn {
			return 1
		}
		if x < y {
			return -1
		}
		return 1
	}
	return sign(len(pa) - len(pb))
}

func main() {
	broken := os.Getenv("SEMVER_BREAK") != ""
	sc := bufio.NewScanner(os.Stdin)
	sc.Buffer(make([]byte, 1024*1024), 1024*1024)
	var out []string
	for sc.Scan() {
		line := sc.Text()
		if line == "" {
			continue
		}
		f := strings.SplitN(line, "\t", 2)
		out = append(out, strconv.Itoa(cmp(f[0], f[1], broken)))
	}
	fmt.Println(strings.Join(out, "\n"))
}
