import test from "node:test";
import assert from "node:assert/strict";
import {
  validateCppSource,
  validateCSource,
  validateJavaSource,
  validatePythonSource,
  validateSource,
} from "./compiler/validator";
import { executeLocalCode, buildSanitizedSandboxEnv } from "./compiler/local-runner";
import { runSecureCode } from "./compiler/index";

// ==========================================
// C++ Validation Tests
// ==========================================
test("validateCppSource - rejects empty code", () => {
  const res = validateCppSource("");
  assert.ok(res, "Returns error for empty code");
  assert.equal(res.status, "compilation_error");
});

test("validateCppSource - rejects code missing main function", () => {
  const res = validateCppSource("void helper() { int x = 1; }");
  assert.ok(res);
  assert.equal(res.status, "compilation_error");
  assert.ok(res.stderr.includes("main"));
});

test("validateCppSource - detects unbalanced curly braces", () => {
  const res = validateCppSource("int main() { int x = 5;");
  assert.ok(res);
  assert.equal(res.status, "compilation_error");
  assert.ok(res.stderr.includes("curly braces"));
});

test("validateCppSource - passes valid C++ structure", () => {
  const validCode = `
#include <iostream>
using namespace std;

int main() {
    cout << "Hello DSA.viz" << endl;
    return 0;
}
`;
  const res = validateCppSource(validCode);
  assert.equal(res, null, "Returns null for valid C++ code");
});

test("validateCppSource - passes Circle class with methods", () => {
  const circleCode = `
#include <iostream>
using namespace std;
class Circle
{
    public:
    int r,a;
    void getArea();
    void displayArea();
};
void Circle :: getArea()
{
    cout << "Enter Value of Radius:";
    cin >> r;
    a = 3.14 * r * r;
}
void Circle :: displayArea()
{
    cout << "Area of Circle:" << a << endl;
}
int main()
{
    Circle c;
    c.getArea();
    c.displayArea();
    return 0;
}
`;
  const res = validateCppSource(circleCode);
  assert.equal(res, null, "Circle class structure passes static validation");
});

// ==========================================
// C Validation Tests
// ==========================================
test("validateCSource - rejects empty code", () => {
  const res = validateCSource("   ");
  assert.ok(res);
  assert.equal(res.status, "compilation_error");
  assert.equal(res.language, "c");
});

test("validateCSource - rejects missing main function", () => {
  const res = validateCSource("int helper(int a) { return a * 2; }");
  assert.ok(res);
  assert.equal(res.status, "compilation_error");
  assert.ok(res.stderr.includes("missing main function"));
});

test("validateCSource - detects unbalanced braces in C", () => {
  const res = validateCSource("int main() { int arr[5];");
  assert.ok(res);
  assert.equal(res.status, "compilation_error");
  assert.ok(res.stderr.includes("unbalanced curly braces"));
});

test("validateCSource - passes valid C source with comments and strings", () => {
  const code = `
#include <stdio.h>
#include <stdlib.h>

// Comment with brace {
/* Block comment { } */
int main() {
    const char *str = "Hello {world}";
    printf("%s\\n", str);
    return 0;
}
`;
  const res = validateCSource(code);
  assert.equal(res, null);
});

// ==========================================
// Java Validation Tests
// ==========================================
test("validateJavaSource - rejects empty code", () => {
  const res = validateJavaSource("");
  assert.ok(res);
  assert.equal(res.status, "compilation_error");
  assert.equal(res.language, "java");
});

test("validateJavaSource - rejects code without class declaration", () => {
  const code = `
public static void main(String[] args) {
    System.out.println("No class");
}
`;
  const res = validateJavaSource(code);
  assert.ok(res);
  assert.equal(res.status, "compilation_error");
  assert.ok(res.stderr.includes("class, interface, enum, or record expected"));
});

test("validateJavaSource - rejects code without main method", () => {
  const code = `
public class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}
`;
  const res = validateJavaSource(code);
  assert.ok(res);
  assert.equal(res.status, "compilation_error");
  assert.ok(res.stderr.includes("Main method not found"));
});

test("validateJavaSource - passes valid Java program with main", () => {
  const code = `
import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>();
        list.add(42);
        System.out.println("Value: " + list.get(0));
    }
}
`;
  const res = validateJavaSource(code);
  assert.equal(res, null);
});

// ==========================================
// Python Validation Tests
// ==========================================
test("validatePythonSource - rejects empty code", () => {
  const res = validatePythonSource("   \n  \t ");
  assert.ok(res);
  assert.equal(res.status, "compilation_error");
  assert.equal(res.language, "python");
});

test("validatePythonSource - detects unclosed parentheses", () => {
  const code = `
def solve(nums):
    result = [x * 2 for x in nums (
    return result
`;
  const res = validatePythonSource(code);
  assert.ok(res);
  assert.equal(res.status, "compilation_error");
  assert.ok(res.stderr.includes("unclosed bracket"));
});

test("validatePythonSource - detects mismatched closing bracket", () => {
  const code = `
def solve():
    pairs = [(1, 2], [3, 4)]
`;
  const res = validatePythonSource(code);
  assert.ok(res);
  assert.equal(res.status, "compilation_error");
  assert.ok(res.stderr.includes("unmatched closing bracket"));
});

test("validatePythonSource - passes valid Python program with comments and quotes", () => {
  const code = `
import collections

# Bracket in comment: ) ] }
"""
Triple quotes with brackets: ( [ {
"""
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []

if __name__ == "__main__":
    print(two_sum([2, 7, 11, 15], 9))
`;
  const res = validatePythonSource(code);
  assert.equal(res, null);
});

// ==========================================
// Unified validateSource Dispatcher Tests
// ==========================================
test("validateSource - routes validation based on language argument", () => {
  assert.ok(validateSource("", "c"));
  assert.ok(validateSource("", "java"));
  assert.ok(validateSource("", "python"));
  assert.ok(validateSource("", "cpp"));

  const pyValid = "print('DSA.viz')\n";
  assert.equal(validateSource(pyValid, "python"), null);
});

// ==========================================
// Local Sandboxed Runner Tests (Python, C, Java, C++)
// ==========================================
test("buildSanitizedSandboxEnv - strips sensitive secrets while preserving runtime vars", () => {
  const prevSecret = process.env.GEMINI_API_KEY;
  const prevRedis = process.env.REDIS_URL;
  const prevEncryption = process.env.ENCRYPTION_KEY;
  process.env.GEMINI_API_KEY = "test-secret-gemini-key";
  process.env.REDIS_URL = "redis://secret-host:6379";
  process.env.ENCRYPTION_KEY = "super-secret-encryption-key";

  try {
    const sanitized = buildSanitizedSandboxEnv("/tmp/sandbox-test");
    assert.equal(sanitized.GEMINI_API_KEY, undefined);
    assert.equal(sanitized.REDIS_URL, undefined);
    assert.equal(sanitized.ENCRYPTION_KEY, undefined);
    assert.equal(sanitized.PYTHONUNBUFFERED, "1");
    assert.equal(sanitized.PYTHONDONTWRITEBYTECODE, "1");
  } finally {
    if (prevSecret === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevSecret;
    if (prevRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = prevRedis;
    if (prevEncryption === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = prevEncryption;
  }
});

test("executeLocalCode - runs Python code with stdout", async () => {
  const code = "print(sum([10, 20, 30]))";
  const res = await executeLocalCode(code, "", "python");
  assert.equal(res.language, "python");
  if (res.statusMessage === "Toolchain Not Found") {
    assert.equal(res.exitCode, 1);
    return;
  }
  assert.equal(res.status, "success");
  assert.equal(res.exitCode, 0);
  assert.equal(res.stdout.trim(), "60");
});

test("executeLocalCode - handles Python stdin input", async () => {
  const code = `
a = int(input())
b = int(input())
print(f"SUM={a + b}")
`;
  const res = await executeLocalCode(code, "17\n25\n", "python");
  if (res.statusMessage === "Toolchain Not Found") {
    assert.equal(res.exitCode, 1);
    return;
  }
  assert.equal(res.status, "success");
  assert.equal(res.exitCode, 0);
  assert.ok(res.stdout.includes("SUM=42"));
});

test("executeLocalCode - compiles and runs C code with stdin", async () => {
  const code = `
#include <stdio.h>

int main() {
    int x;
    if (scanf("%d", &x) == 1) {
        printf("C_RESULT=%d\\n", x * 4);
    }
    return 0;
}
`;
  const res = await executeLocalCode(code, "11\n", "c");
  assert.equal(res.language, "c");
  if (res.statusMessage === "Toolchain Not Found") {
    assert.equal(res.exitCode, 1);
    return;
  }
  assert.equal(res.status, "success");
  assert.equal(res.exitCode, 0);
  assert.ok(res.stdout.includes("C_RESULT=44"));
});

test("executeLocalCode - compiles and runs Java code with stdin", async () => {
  const code = `
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int val = sc.nextInt();
            System.out.println("JAVA_RESULT=" + (val * 3));
        }
    }
}
`;
  const res = await executeLocalCode(code, "12\n", "java");
  assert.equal(res.language, "java");
  if (res.statusMessage === "Toolchain Not Found") {
    assert.equal(res.exitCode, 1);
    return;
  }
  assert.equal(res.status, "success");
  assert.equal(res.exitCode, 0);
  assert.ok(res.stdout.includes("JAVA_RESULT=36"));
});

test("executeLocalCode - compiles and runs C++ code with stdin", async () => {
  const code = `
#include <iostream>

int main() {
    int n;
    if (std::cin >> n) {
        std::cout << "CPP_RESULT=" << (n * 5) << std::endl;
    }
    return 0;
}
`;
  const res = await executeLocalCode(code, "8\n", "cpp");
  assert.equal(res.language, "cpp");
  if (res.statusMessage === "Toolchain Not Found") {
    assert.equal(res.exitCode, 1);
    return;
  }
  assert.equal(res.status, "success");
  assert.equal(res.exitCode, 0);
  assert.ok(res.stdout.includes("CPP_RESULT=40"));
});

test("runSecureCode - appends stdin assistance hint on runtime EOF", async () => {
  const pyCode = `
val = input("Enter number: ")
print("Val is " + val)
`;
  const res = await runSecureCode(pyCode, "", "python");
  assert.equal(res.status, "runtime_error");
  assert.ok(res.stderr.includes("[DSA.viz Input Notice]"));
  assert.ok(res.stderr.includes("input()"));
});

test("runSecureCode - appends stdin assistance hint on C++ empty stdin success", async () => {
  const cppCode = `
#include <iostream>
int main() {
    int x = 0;
    std::cin >> x;
    std::cout << "Value: " << x << std::endl;
    return 0;
}
`;
  const res = await runSecureCode(cppCode, "", "cpp");
  assert.equal(res.status, "success");
  assert.ok(res.stdout.includes("[DSA.viz Input Notice]"));
  assert.ok(res.stdout.includes("cin >>"));
});

test("runSecureCode - executes Java code with public class and stdin", async () => {
  const javaCode = `
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int val = sc.nextInt();
        System.out.println("JAVA_OUT=" + (val * 10));
    }
}
`;
  const res = await runSecureCode(javaCode, "7\n", "java");
  assert.equal(res.status, "success");
  assert.equal(res.exitCode, 0);
  assert.ok(res.stdout.includes("JAVA_OUT=70"));
});

test("runSecureCode - executes Python code with calculations", async () => {
  const pyCode = `
def solve():
    nums = [1, 2, 3, 4, 5]
    print(f"PY_SUM={sum(nums)}")

solve()
`;
  const res = await runSecureCode(pyCode, "", "python");
  assert.equal(res.status, "success");
  assert.equal(res.exitCode, 0);
  assert.ok(res.stdout.includes("PY_SUM=15"));
});

test("runSecureCode - executes C code with standard I/O", async () => {
  const cCode = `
#include <stdio.h>

int main() {
    printf("C_PIPELINE_OK\\n");
    return 0;
}
`;
  const res = await runSecureCode(cCode, "", "c");
  assert.equal(res.status, "success");
  assert.equal(res.exitCode, 0);
  assert.ok(res.stdout.includes("C_PIPELINE_OK"));
});

