import test from "node:test";
import assert from "node:assert/strict";
import { validateCppSource } from "./compiler/validator";

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

