# custom-babel-plugin

## 실행

### prerequisite
- 테스트 코드를 src/에 작성

### CLI
```
$ cd [PROJECT_HOME]
$ npm install
$ npx babel src/
```


## 개발 환경 구성

바벨플러그인을 작성하기위한 자세한 내용은 [여기](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/ko/plugin-handbook.md)에 잘 정리되어있다. 

개발환경은 [ASTExplorer](https://astexplorer.net/)으로 테스트를 해보면 된다. 

![스크린샷 2022-05-20 오후 5 32 07](https://user-images.githubusercontent.com/42398891/169825185-e796c20b-5a41-4729-9070-91e587d12553.png)




좌측 상단에 변환 전 코드를 작성하면 우측에 AST Tree를 친절하게 보여준다. 각 코드 스트링의 어떤식으로 변환되는지 클릭하여 확인할 수 있다. 

babel/parser를 선택(예전 명칭 babylon)하고 transform에 babelv7을 선택하면 플러그인 함수를 구현하기 위한 템플릿 함수가 정의되어 있다. 

크롬 개발자 도구를 켜서 console.log를 사용하면 간단하게 작업을 해볼 수 있다.  



## 플러그인 개발 

### JS AST

- type

  - 각 노드 별로 type property를 가지고 있음

    ```ts
    interface Node {
    	type: string;
    }	
    ```

  - program(AST root 노드)

  - VariableDeclaration(변수)

    - declarations: 하나의 문장에서 여러 개의 변수를 선언할 수 있기 때문에 [] array로 관리
    - VariableDeclarator: 선언된 변수를 나타내는 타입

  - identifier(variable name 타입)

  - BinaryExpression(사칙연산)

- start, end, loc

  - 오리지널 소스코드 안의 노드의 위치를 알려주는 속성



### Babel 플러그인 실행 단계

1. Parse : AST parse
2. Transform: Node Update(플러그인의 수행 단계)
3. Generate: 변환된 AST를 DFS traverse하면서 Node -> Code로 생성



### Visitors

AST traverse에 사용되는 패턴. 다른 언어 AST에서도 사용되는 방식이다. 트리에서 특정 노드 타입(아래에서 Identifier)을 다룰 수 있는 메소드를 정의하고 호출 해줄 수 있다. 

기본적으로 enter/exit 할 때 두번의 타이밍에 방문자 메소드가 호출되도록 할 수 있다. 

```ts
const MyVisitor = {
  Identifier: {
    enter() {
      console.log("Entered!");
    },
    exit() {
      console.log("Exited!");
    }
  }
};
```



### Path

트리상의 많은 노드들의 연결정보를 표현하는 객체이다. 노드의 위치에 대한 정보이고, 위에서처럼 트리를 변경하는 메소드를 visitor에서 정의하여 호출 될 때마다 path는 업데이트 된다. 바벨에서 상태와 무관하게 node 정보를 제공하기 위해 관리된다. 

Identifier 메소드가 호출됐을 때, path가 결정되고, path에 접근을 통해 원하는 Node에 접근하고 변경할 수 있다. 

```ts
const MyVisitor = {
  Identifier(path) {
    console.log("Visiting: " + path.node.name);
  }
};
```



### 상태

state에 대한 고려를 제대로 하지 못하면 원치 않는 변환이 이루어질 수 있다. 

```ts
let test;
function foo(input) {
  console.log(input);
}
console.log(test);
foo("test")
test
```



위와 같이 global state와 function declaration 에 동일한 변수명이 있을 때, 함수 정의의 파라미터 이름만을 변경하고 싶을 수 있다. 

 identifier path의 name에만 접근하여 name을 변경하면 원치 않는 동작이 일어날 수 있다. 함수 내부의 identifier만 바꿀 수 있도록 재귀적인 방문자 메소드 정의가 필요하다. 

```ts
module.exports = function ({ types: t }) {
  let paramName;

  const updateParamNameVisitor = {
    Identifier(path) {
      if (path.node.name === this.paramName) {
        path.node.name = "input";
      }
    }
  };
  return {
    visitor: {
      FunctionDeclaration(path) {
        const param = path.node.params[0];
        paramName = param.name;
        param.name = "input";
        path.traverse(updateParamNameVisitor, { paramName});
      },
    },
  };
};

```



### Scope

JS는 lexical scoping을 가지고 있다. 변수, 함수 클래스 뭐든 참조 객체를 선언할 경우 트리 구조의 현재 depth에 속하게 된다. 

하위 depth에서는 상위 depth의 참조를 사용할 수 있으나 그 반대는 되지 않는다. 그리고 하위 depth에서는 같은 이름의 참조를 덮어쓸 수 있다. 

따라서 코드 변환 시, 이 scope을 고려해야한다. 

```ts
function scopeOne() {
  var one = "I am in the scope created by `scopeOne()`";

  function scopeTwo() {
    var one = "I am creating a new `one` but leaving reference in `scopeOne()` alone.";
  }
}
```

Scope 에 속하는 참조 정보를 바인딩 정보를 통해 알 수 있다. 



### API

바벨 플러그인을 개발하기위한 API 정리 

- babel-traverse

  - 모듈은 트리의 모든 상태를 관리하고, 노드들의 교체, 삭제, 추가하는 일을 담당

- babel-types

  - AST 노드들을 위한 Lodash 스타일의 유틸리티 라이브러리

  - AST 생성, 검사, 변환하는 메소드들을 제공 

  - 정의

    - babel types는 모든 노드  type에 대한 정의를 가지고 있음

    - 노드 type의 정의는 다음과 같다. `a*b`

      ```ts
      defineType("BinaryExpression", {
        builder: ["operator", "left", "right"],
        fields: {
          // fields 정보와 이것을 어떻게 검증(validate) 하는지에 대한 정보를 포함
          // 검증 메소드들을 만들기위해 사용
          // t.isBinaryExpression(foo), t.isBinaryExpression(foo, { operator: "*"})
          operator: {
            validate: assertValueType("string")
          },
          left: {
            validate: assertNodeType("Expression")
          },
          right: {
            validate: assertNodeType("Expression")
          }
        },
        visitor: ["left", "right"],
        aliases: ["Binary", "Expression"]
      });
      ```

  - 빌더

    - 위에서 builder 속성의 노드에 존재

    - 이는 각 노드 타입이 빌더 메소드를 받기 때문인데, 다음과 같이 사용됨

      ```ts
      t.binaryExpression("*", t.identifier("a"), t.identifier("b"));
      ```

    - 아래와 같은 AST 생성

      ```ts
      {
        type: "BinaryExpression",
        operator: "*",
        left: {
          type: "Identifier",
          name: "a"
        },
        right: {
          type: "Identifier",
          name: "b"
        }
      }
      ```

- babel-generator

  - Babel Generator는 Babel의 코드 생성기입니다. AST를 받아 소스 코드와 소스맵으로 변경함

    ```ts
    const ast = babylon.parse(code);
    
    generate(ast, {}, code);
    // {
    //   code: "...",
    //   map: "..."
    // }
    ```

- babel-template

  - 직접 거대한 AST 를 만드는 대신 데이터가 들어갈 곳을 표시자(placeholders) 로 나타내며 코드를 작성할 수 있게 해줌
    - quasiquotes



### 바벨 플러그인 작성 팁

- 노드 및 경로 형식 확인: babel-types 이용하여 path를 인자로 넘겨줘 체크 
  - `t.isIdentifier(path)`
  - `t.isIdentifier(path, {propFoo: "foo"})`
- 식별자 참조확인 
  - `t.isReferenced()`
  - `path.isReferencedIdentifier()`
- 형제 경로 얻기
  - `path.getSibling(index)`
  - `path.key`
  - `path.container`
    - sibling 배열 접근 가능
  - `path.listkey`
    - sibling을 가지고 있는 리스트의 key에 접근 
- 탐색 중지 
  - `path.skip()`
    - 하위 child에 대한 traverse를 중단
  - `path.stop()`
    - 현재의 AST traverse를 중단(state을 저장하고 싶은경우)
- 노드 조작
  - 노드 교체
    - `path.replaceWith()`
    - `path.replaceWithMultiple()`
  - 노드 하나를 소스 문자열로 교체
    -  `path.replaceWithSourceString()`
  - 형제 노드를 삽입
    - `path.insertBefore`
    - `path.insertAfter`
  - 컨테이너에 삽입
    - `path.get('body').unshiftContainer('body', t.expressionStatement(t.stringLiteral('before')));`
    - `path.get('body').pushContainer('body', t.expressionStatement(t.stringLiteral('after')));`
  - 노드 삭제
    - `path.remove()`
  - 부모 교체
    - `path.parentPath.replaceWith()`
  - 부모 삭제
    - `path.parent.remove()`
- 범위
  - 지역변수 바인딩 확인
  - UID 생성
  - 부모 스코프에 변수 선언 집어넣기
  - 바인딩과 참조의 이름 바꾸기
- 노드 만들기 
  - builder 메소드를 이용하여 만들 수 있음(babel-types)
  - 자세한 [정의](https://github.com/babel/babel/tree/master/packages/babel-types/src/definitions) 및 [문서](https://github.com/babel/babel/blob/master/packages/babel-parser/ast/spec.md#classmethod)

