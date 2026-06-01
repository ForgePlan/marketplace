// Rust runner: reads TSV "a<TAB>b" lines from stdin, prints semver_compare per line.
// Self-contained (impl + CLI), no external crates. SEMVER_BREAK env injects the same bug.
use std::env;
use std::io::{self, Read};

fn is_num(s: &str) -> bool {
    !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit())
}

fn sign(n: i64) -> i64 {
    if n > 0 {
        1
    } else if n < 0 {
        -1
    } else {
        0
    }
}

fn parse(v: &str) -> (Vec<i64>, Vec<String>) {
    let v = match v.find('+') {
        Some(i) => &v[..i],
        None => v,
    };
    let (core, pre) = match v.find('-') {
        Some(i) => (
            &v[..i],
            v[i + 1..].split('.').map(|s| s.to_string()).collect::<Vec<_>>(),
        ),
        None => (v, Vec::new()),
    };
    let core: Vec<i64> = core.split('.').map(|p| p.parse::<i64>().unwrap_or(0)).collect();
    (core, pre)
}

fn cmp(a: &str, b: &str, broken: bool) -> i64 {
    let (ca, pa) = parse(a);
    let (cb, pb) = parse(b);
    for i in 0..3 {
        if ca[i] != cb[i] {
            return sign(ca[i] - cb[i]);
        }
    }
    if pa.is_empty() && pb.is_empty() {
        return 0;
    }
    if pa.is_empty() {
        return if broken { -1 } else { 1 }; // injected bug
    }
    if pb.is_empty() {
        return -1;
    }
    let n = pa.len().min(pb.len());
    for i in 0..n {
        let (x, y) = (&pa[i], &pb[i]);
        if x == y {
            continue;
        }
        let (xn, yn) = (is_num(x), is_num(y));
        if xn && yn {
            return sign(x.parse::<i64>().unwrap() - y.parse::<i64>().unwrap());
        }
        if xn && !yn {
            return -1;
        }
        if yn && !xn {
            return 1;
        }
        return if x < y { -1 } else { 1 };
    }
    sign(pa.len() as i64 - pb.len() as i64)
}

fn main() {
    let broken = env::var("SEMVER_BREAK").is_ok();
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut out: Vec<String> = Vec::new();
    for line in input.lines() {
        if line.is_empty() {
            continue;
        }
        let mut it = line.splitn(2, '\t');
        let a = it.next().unwrap();
        let b = it.next().unwrap();
        out.push(cmp(a, b, broken).to_string());
    }
    println!("{}", out.join("\n"));
}
