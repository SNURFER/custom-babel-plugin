console.log("foo");
const lsd = 322;
console.log("boo");

const renderCode = {
  test : 10,
  test2 : 20,
  test3 : {
    nestedTest : 10
  }
}

console.log(renderCode)

function multify(num) {
  return num * num
}

function add(a, b) {
  return a + b;
}

console.log(`${lsd} * ${lsd}` + `${lsd} + ${lsd} is`)
console.log(multify(lsd) + add (lsd, lsd))
