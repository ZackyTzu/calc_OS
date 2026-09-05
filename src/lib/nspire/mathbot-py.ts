// MathBot for the TI-Nspire CX II (Python, OS 5.2+): an offline math assistant that answers typed
// questions. MicroPython-safe: no f-strings, no re, no fractions/statistics modules, no math.gcd.
import type { PythonProgram } from './python-gen';

const source = String.raw`# MathBot - offline math assistant for TI-Nspire CX II Python (calc_OS)
# Type a question in plain words, e.g.  solve 3x-7=11   factor 360   sqrt 72   mean 4,8,15
import math

HELP = [
    "Ask me things like:",
    "  solve 3x-7=11        quadratic 1,-5,6",
    "  factor 360           is 97 prime",
    "  gcd 12,18            sqrt 72",
    "  simplify 6/8         0.375 as a fraction",
    "  mean 4,8,15          slope (1,2) (4,8)",
    "  12% of 80            % change 50 to 65",
    "  derivative of x^2 at 3",
    "  integral of x^2 from 0 to 2",
    "  circle r=3    triangle b=4 h=5",
    "  2+3*4   or   3x+2 when x=4",
    "Type quit to leave.",
]

ENV = {"pi": math.pi, "e": math.e, "sqrt": math.sqrt, "sin": math.sin, "cos": math.cos, "tan": math.tan,
       "asin": math.asin, "acos": math.acos, "atan": math.atan, "ln": math.log, "log": math.log10,
       "abs": abs, "exp": math.exp, "floor": math.floor, "ceil": math.ceil}

def fmt(x):
    try:
        if abs(x - round(x)) < 1e-9 and abs(x) < 1e15:
            return str(int(round(x)))
    except Exception:
        return str(x)
    return "%.6g" % x

def gcd(a, b):
    a = abs(int(round(a)))
    b = abs(int(round(b)))
    while b:
        a, b = b, a % b
    return a

def frac(x, maxden=100000):
    # continued fraction approximation; returns (num, den) or None
    if x != x:
        return None
    sign = -1 if x < 0 else 1
    x = abs(x)
    h1, h0, k1, k0 = 1, 0, 0, 1
    v = x
    for i in range(40):
        a = int(math.floor(v))
        h2 = a * h1 + h0
        k2 = a * k1 + k0
        if k2 > maxden:
            break
        h1, h0, k1, k0 = h2, h1, k2, k1
        if abs(x - h1 / k1) < 1e-12:
            break
        if v - a < 1e-12:
            break
        v = 1.0 / (v - a)
    return (sign * h1, k1)

def frac_text(x):
    f = frac(x)
    if not f or f[1] == 1 or f[1] > 10000:
        return ""
    return "  (= %d/%d)" % (f[0], f[1])

def prep(expr):
    s = expr.replace("^", "**").replace(" ", "").replace("X", "x")
    out = ""
    prev = ""
    for ch in s:
        if prev and (prev.isdigit() or prev == ")" or prev == "x" or prev == ".") and (ch == "x" or ch == "(" or (ch.isalpha() and ch != "e")):
            out += "*"
        elif prev == ")" and (ch.isdigit() or ch.isalpha()):
            out += "*"
        elif prev == "x" and ch.isdigit():
            out += "*"
        out += ch
        prev = ch
    return out

def evalx(expr, x=0.0):
    env = dict(ENV)
    env["x"] = x
    return float(eval(prep(expr), env))

def numbers_in(text):
    nums = []
    cur = ""
    prev = " "
    for ch in text + " ":
        if ch.isdigit() or ch == ".":
            cur += ch
        elif ch == "-" and cur == "" and not (prev.isdigit() or prev == ")"):
            cur = "-"
        else:
            if cur not in ("", "-", "."):
                try:
                    nums.append(float(cur))
                except Exception:
                    pass
            cur = ""
        prev = ch
    return nums

def after(text, words):
    # text after the first occurrence of any of the words
    for w in words:
        i = text.find(w)
        if i >= 0:
            return text[i + len(w):].strip()
    return text

def between(text, start_words, end_words):
    s = after(text, start_words)
    for w in end_words:
        i = s.find(w)
        if i >= 0:
            return s[:i].strip(), s[i + len(w):].strip()
    return s.strip(), ""

def newton_roots(f):
    roots = []
    for start in range(-10, 11):
        x = float(start)
        ok = False
        for i in range(60):
            try:
                fx = f(x)
                h = 1e-6 * max(1.0, abs(x))
                d = (f(x + h) - f(x - h)) / (2 * h)
            except Exception:
                break
            if d == 0:
                break
            nx = x - fx / d
            if abs(nx - x) < 1e-10:
                x = nx
                ok = True
                break
            x = nx
        if ok:
            try:
                if abs(f(x)) < 1e-7 and not [r for r in roots if abs(r - x) < 1e-6]:
                    roots.append(x)
            except Exception:
                pass
    roots.sort()
    return roots

def quadratic(a, b, c):
    print("Quadratic a*x^2 + b*x + c = 0 with a=%s b=%s c=%s" % (fmt(a), fmt(b), fmt(c)))
    if a == 0:
        print("a is 0, so it is really linear: x = " + fmt(-c / b))
        return
    disc = b * b - 4 * a * c
    print("Discriminant b^2 - 4ac = " + fmt(disc))
    print("Vertex at x = -b/(2a) = " + fmt(-b / (2 * a)))
    if disc < 0:
        print("Negative: no real roots.")
        print("Complex roots: %s +/- %s i" % (fmt(-b / (2 * a)), fmt(math.sqrt(-disc) / (2 * a))))
    elif disc == 0:
        print("Zero: one repeated root x = " + fmt(-b / (2 * a)))
    else:
        print("x = (-b +/- sqrt(disc)) / (2a)")
        x1 = (-b + math.sqrt(disc)) / (2 * a)
        x2 = (-b - math.sqrt(disc)) / (2 * a)
        print("x1 = " + fmt(x1) + frac_text(x1))
        print("x2 = " + fmt(x2) + frac_text(x2))

def solve(text):
    text = after(text, ["solve for x", "solve"]).replace("for x", "").strip()
    if "=" in text:
        left, right = text.split("=", 1)
    else:
        left, right = text, "0"
    def f(x):
        return evalx(left, x) - evalx(right, x)
    try:
        b = f(0.0); c = f(1.0); d = f(2.0); g = f(-1.0)
    except Exception as e:
        print("I could not read that equation (" + str(e) + "). Use x as the unknown, e.g. 3x-7=11")
        return
    print("Solve for x:  " + left.strip() + " = " + right.strip())
    tol = 1e-9 * (1 + abs(b) + abs(c) + abs(d))
    if abs(d - 2 * c + b) < tol and abs(c - 2 * b + g) < tol:
        m = c - b
        if abs(m) < tol:
            print("There is no x left: the equation is always true or never true.")
            return
        print("It is linear: a*x + b = 0 with a = %s, b = %s" % (fmt(m), fmt(b)))
        print("Subtract b and divide by a: x = -b/a")
        x = -b / m
        print("x = " + fmt(x) + frac_text(x))
        print("Check: both sides equal " + fmt(evalx(left, x)))
        return
    if abs((d - 2 * c + b) - (c - 2 * b + g)) < tol:
        a = (d - 2 * c + b) / 2
        quadratic(a, c - b - a, b)
        return
    print("Not linear or quadratic; solving numerically.")
    roots = newton_roots(f)
    if not roots:
        print("No real solution found near -10..10.")
    for r in roots:
        print("x = " + fmt(r))

def factor(n):
    n = int(round(n))
    if n < 2:
        print("Give me an integer of 2 or more.")
        return
    m = n
    fs = []
    d = 2
    while d * d <= m:
        while m % d == 0:
            fs.append(d)
            m //= d
        d += 1 if d == 2 else 2
    if m > 1:
        fs.append(m)
    if len(fs) == 1:
        print("%d is prime (only divisible by 1 and itself)." % n)
        return
    parts = []
    i = 0
    while i < len(fs):
        j = i
        while j < len(fs) and fs[j] == fs[i]:
            j += 1
        parts.append(str(fs[i]) + ("^%d" % (j - i) if j - i > 1 else ""))
        i = j
    print("%d = %s" % (n, " * ".join(parts)))
    print("%d is not prime." % n)
    divs = [k for k in range(1, min(n, 10000) + 1) if n % k == 0]
    if n <= 10000:
        print("Divisors: " + ", ".join(str(k) for k in divs))

def gcd_lcm(nums):
    if len(nums) < 2:
        print("Give me two integers, e.g. gcd 12,18")
        return
    a, b = nums[0], nums[1]
    g = gcd(a, b)
    print("Euclid: %s = %s*%s + %s ..." % (fmt(max(a, b)), fmt(min(a, b)), fmt(int(max(a, b) // min(a, b))), fmt(max(a, b) % min(a, b))))
    print("gcd = %d" % g)
    print("lcm = %d  (a*b/gcd)" % (abs(int(a * b)) // g))

def simplify_sqrt(n):
    n = int(round(n))
    if n < 0:
        print("sqrt of a negative number is imaginary: %s i" % fmt(math.sqrt(-n)))
        return
    k = int(math.sqrt(n))
    while k > 1 and n % (k * k) != 0:
        k -= 1
    if k <= 1:
        print("sqrt(%d) cannot be simplified = %s" % (n, fmt(math.sqrt(n))))
    else:
        print("sqrt(%d) = %d sqrt(%d) = %s" % (n, k, n // (k * k), fmt(math.sqrt(n))))

def fraction(text):
    nums = numbers_in(text)
    if "/" in text and len(nums) >= 2:
        a, b = nums[0], nums[1]
        g = gcd(a, b)
        print("%s/%s = %d/%d = %s" % (fmt(a), fmt(b), int(a) // g, int(b) // g, fmt(a / b)))
        x = a / b
    elif nums:
        x = nums[0]
        f = frac(x)
        if f:
            print("%s = %d/%d" % (fmt(x), f[0], f[1]))
    else:
        print("Give me a number or a fraction, e.g. simplify 6/8")
        return
    if abs(x) >= 1 and x != int(x):
        f = frac(abs(x) - int(abs(x)))
        if f:
            print("Mixed number: %s%d %d/%d" % ("-" if x < 0 else "", int(abs(x)), f[0], f[1]))
    print("Percent: %s%%" % fmt(100 * x))

def stats(nums):
    if not nums:
        print("Give me a list of numbers, e.g. mean 4,8,15")
        return
    n = len(nums)
    s = sorted(nums)
    mean = sum(nums) / n
    med = s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2
    print("n = %d   sum = %s" % (n, fmt(sum(nums))))
    print("mean = %s   median = %s" % (fmt(mean), fmt(med)))
    if n > 1:
        var = sum((v - mean) ** 2 for v in nums) / (n - 1)
        print("sample sd = %s   population sd = %s" % (fmt(math.sqrt(var)), fmt(math.sqrt(var * (n - 1) / n))))
    print("min = %s   max = %s   range = %s" % (fmt(s[0]), fmt(s[-1]), fmt(s[-1] - s[0])))

def slope(nums):
    if len(nums) < 4:
        print("Give me two points, e.g. slope (1,2) (4,8)")
        return
    x1, y1, x2, y2 = nums[0], nums[1], nums[2], nums[3]
    if x2 == x1:
        print("Vertical line x = %s: slope undefined" % fmt(x1))
    else:
        m = (y2 - y1) / (x2 - x1)
        print("slope = (y2-y1)/(x2-x1) = %s" % fmt(m) + frac_text(m))
        print("y = %sx + %s" % (fmt(m), fmt(y1 - m * x1)))
    print("distance = %s" % fmt(math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)))
    print("midpoint = (%s, %s)" % (fmt((x1 + x2) / 2), fmt((y1 + y2) / 2)))

def percent(text):
    nums = numbers_in(text)
    if len(nums) < 2:
        print("Give me two numbers, e.g. 12% of 80")
        return
    a, b = nums[0], nums[1]
    if "change" in text or "from" in text:
        print("%% change from %s to %s = (b-a)/a*100 = %s%%" % (fmt(a), fmt(b), fmt((b - a) / a * 100)))
    elif "what" in text or "is" in text.split():
        print("%s is %s%% of %s" % (fmt(a), fmt(a / b * 100), fmt(b)))
    elif "increase" in text or "up" in text.split() or "more" in text:
        print("%s increased by %s%% = %s" % (fmt(b), fmt(a), fmt(b * (1 + a / 100))))
    elif "decrease" in text or "off" in text.split() or "less" in text:
        print("%s decreased by %s%% = %s" % (fmt(b), fmt(a), fmt(b * (1 - a / 100))))
    else:
        print("%s%% of %s = %s" % (fmt(a), fmt(b), fmt(a / 100 * b)))

def derivative(text):
    expr, rest = between(text, ["derivative of", "derivative", "differentiate", "d/dx", "deriv"], [" at ", " when ", "x="])
    if not rest:
        print("Tell me where, e.g. derivative of x^2 at 3")
        return
    a = numbers_in(rest)[0]
    h = 1e-5 * max(1.0, abs(a))
    d = (evalx(expr, a + h) - evalx(expr, a - h)) / (2 * h)
    print("f(x) = " + expr)
    print("f'(%s) = %s   (numeric)" % (fmt(a), fmt(d)))
    print("f(%s) = %s" % (fmt(a), fmt(evalx(expr, a))))

def integral(text):
    expr, rest = between(text, ["integral of", "integrate", "integral", "area under"], [" from ", " between "])
    nums = numbers_in(rest)
    if len(nums) < 2:
        print("Tell me the limits, e.g. integral of x^2 from 0 to 2")
        return
    a, b = nums[0], nums[1]
    n = 1000
    h = (b - a) / n
    s = evalx(expr, a) + evalx(expr, b)
    for i in range(1, n):
        s += evalx(expr, a + i * h) * (4 if i % 2 else 2)
    print("Integral of %s from %s to %s = %s   (numeric)" % (expr, fmt(a), fmt(b), fmt(s * h / 3)))

def geometry(text):
    nums = numbers_in(text)
    def need(k, names):
        while len(nums) < k:
            nums.append(float(input(names[len(nums)] + " = ")))
    if "circle" in text:
        need(1, ["radius"]); r = nums[0]
        print("area = pi r^2 = %s   circumference = 2 pi r = %s" % (fmt(math.pi * r * r), fmt(2 * math.pi * r)))
    elif "rectangle" in text:
        need(2, ["length", "width"]); l, w = nums[0], nums[1]
        print("area = %s   perimeter = %s   diagonal = %s" % (fmt(l * w), fmt(2 * (l + w)), fmt(math.sqrt(l * l + w * w))))
    elif "triangle" in text:
        need(2, ["base", "height"]); b, h = nums[0], nums[1]
        print("area = base*height/2 = %s" % fmt(b * h / 2))
    elif "sphere" in text:
        need(1, ["radius"]); r = nums[0]
        print("volume = 4/3 pi r^3 = %s   surface = 4 pi r^2 = %s" % (fmt(4.0 / 3 * math.pi * r ** 3), fmt(4 * math.pi * r * r)))
    elif "cylinder" in text:
        need(2, ["radius", "height"]); r, h = nums[0], nums[1]
        print("volume = pi r^2 h = %s   surface = %s" % (fmt(math.pi * r * r * h), fmt(2 * math.pi * r * h + 2 * math.pi * r * r)))
    elif "cone" in text:
        need(2, ["radius", "height"]); r, h = nums[0], nums[1]
        print("volume = pi r^2 h / 3 = %s   slant = %s" % (fmt(math.pi * r * r * h / 3), fmt(math.sqrt(r * r + h * h))))
    elif "hypot" in text or "pythag" in text:
        need(2, ["leg a", "leg b"]); a, b = nums[0], nums[1]
        print("c = sqrt(a^2 + b^2) = %s" % fmt(math.sqrt(a * a + b * b)))

GEO = ["circle", "rectangle", "triangle", "sphere", "cylinder", "cone", "hypot", "pythag"]

def answer(q):
    q = q.strip()
    low = q.lower()
    if low in ("help", "?", "h"):
        for line in HELP:
            print(line)
    elif "quadratic" in low:
        nums = numbers_in(after(low, ["quadratic"]))
        if len(nums) >= 3:
            quadratic(nums[0], nums[1], nums[2])
        else:
            print("Give me a, b, c: quadratic 1,-5,6")
    elif [w for w in GEO if w in low]:
        geometry(low)
    elif "solve" in low or ("=" in low and "x" in low and "%" not in low and "when" not in low and not low.startswith("x=")):
        solve(low)
    elif "factor" in low or "prime" in low:
        nums = numbers_in(low)
        if nums:
            factor(nums[0])
        else:
            print("Give me an integer, e.g. factor 360")
    elif "gcd" in low or "lcm" in low or "common" in low:
        gcd_lcm(numbers_in(low))
    elif "sqrt" in low or "root" in low or "radical" in low:
        nums = numbers_in(low)
        if nums:
            simplify_sqrt(nums[0])
        else:
            print("Give me a number, e.g. sqrt 72")
    elif "mean" in low or "average" in low or "median" in low or "stat" in low or "deviation" in low:
        stats(numbers_in(after(low, ["of"]) if " of " in low else low))
    elif "slope" in low or "line through" in low or "points" in low:
        slope(numbers_in(low))
    elif "deriv" in low or "differentiate" in low or "d/dx" in low:
        derivative(low)
    elif "integr" in low or "area under" in low:
        integral(low)
    elif "%" in low or "percent" in low:
        percent(low)
    elif "fraction" in low or "simplify" in low:
        fraction(low)
    elif "when" in low or "x=" in low.replace(" ", ""):
        expr, rest = between(low, [""], [" when ", "x=", ","])
        expr = expr.replace("when", "").strip()
        vals = numbers_in(rest)
        if not vals:
            print("Tell me the value of x, e.g. 3x+2 when x=4")
        else:
            print("%s at x = %s: %s" % (expr, fmt(vals[0]), fmt(evalx(expr, vals[0]))))
    else:
        v = evalx(low)
        print("= " + fmt(v) + frac_text(v))

def main():
    print("MathBot - offline math assistant (calc_OS)")
    print("Ask a question in words. Type help for examples, quit to leave.")
    while True:
        try:
            q = input("? ")
        except Exception:
            break
        if q is None:
            break
        low = q.strip().lower()
        if low in ("quit", "exit", "q", "bye", ""):
            if low == "":
                continue
            print("Bye")
            break
        try:
            answer(q)
        except Exception as e:
            print("I could not work that out (" + str(e) + "). Type help for examples.")

main()
`;

export const mathbotPython: PythonProgram = { filename: 'MATHBOT.py', source };
