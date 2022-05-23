module.exports = function ({ types: t }) {
  return {
    name: "log-traverse",
    visitor: {
      Identifier(path) {
        if (!looksLike(path.parentPath.parentPath, consolePath)) {
          path.node.name = path.node.name
            .split('')
            .reverse()
            .join('');
        }
      },
      CallExpression(path) {
        if (looksLike(path, consolePath)) {
          console.log("this is console")
          //modify console

          const {line, column} = path.node.callee.object.loc.start
          const date = new Date()
          const prefix = `code location(line:column) (${line} : ${column}), date : ${date}`
          path.node.arguments.unshift(t.stringLiteral(prefix))
        }
      },
    },
  };
};

function looksLike(targetPath, comparePath) {
  return ( 
    targetPath && 
    comparePath &&
    Object.keys(comparePath).every(compKey => {
      const compVal = comparePath[compKey]
      const tarVal = targetPath[compKey]
      if (typeof compVal === 'function') {
        return compVal(tarVal)
      }
      return isPrimitive(compVal) ? compVal === tarVal : looksLike(tarVal, compVal)
    })
  )
}

function isPrimitive(val) {
  return val == null || /^[sbn]/.test(typeof val)
}

const consolePath = {
  node: {
    callee: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
        name: "console"
      },
      property: {
        type: "Identifier",
        name: "log"
      }	
    }
  }
}
