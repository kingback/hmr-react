/**

针对入口文件添加 module.hot/ref 等代码

+import React, { createRef } from 'react';
+const hmrRef = createRef();

+ReactDOM.render(<App ref={hmrRef} />);

+if (module.hot) {
  +module.hot.accept('./App', () => ref.current.forceUpdate());
+}

针对其他 React 组件添加 updateComponent 函数
+import { updateComponent } from './hmr/patch';

+export default updateComponent(App);
 */


const REF_NAME = 'hmrRef';
const UPDATE_FUNC = 'updateComponent';
const COMPONENT_NAME = 'ReactHotProxyComponent';
const IMPORT_HMR_PATCH = `import { ${UPDATE_FUNC} } from "${__dirname + '/patch.js'}"`;

function extendsReactComponent(node) {
  return node.superClass && 
    (node.superClass.name === 'Component' || ( // extends Component
      node.superClass.object &&
      node.superClass.property &&
      node.superClass.object.name === 'React' &&
      node.superClass.property.name === 'Component' // extends React.Component
    ));
}

module.exports = function({ types, template }, { entry = [] }) {

  function addImportReactHotLoader(path) {
    // import { registerComponent } from 'hmr/patch';
    path.node.body.unshift(template(IMPORT_HMR_PATCH, { sourceType: 'module' })());
  }

  function addEntryHotListener(path, state) {
    path.node.body.push(template(`
if (module.hot) {
  module.hot.accept('${state.appPath}', function() {
    ${state.refName || REF_NAME}.current.forceUpdate();
  });
}`, { sourceType: 'module' })());
  }

  function addConstRef({ node }, state) {
    let lastImportPos = 0;
    
    node.body.some((s, i) => {
      if (types.isImport) {
        lastImport = i;
        return true;
      }
    });

    node.body.splice(lastImportPos + 1, 0, template(`const ${REF_NAME} = ${state.createRefName || 'createRef'}(null);`, { sourceType: 'module' })());
  }

  function getExportDefaultDeclaration(filename, declaration) {
    return types.exportDefaultDeclaration(
      types.callExpression(
        types.identifier(UPDATE_FUNC),
        [types.stringLiteral(filename), declaration]
      )
    )
  }

  function getNamedDeclaration(declaration) {
    // Anonymous class or function
    if (!declaration.id || !declaration.id.name) {
      if (types.isClassDeclaration(declaration)) {
        declaration = types.classDeclaration(
          types.identifier(COMPONENT_NAME),
          declaration.superClass,
          declaration.body,
          declaration.decorators
        );
      } else {
        declaration = types.functionDeclaration(
          types.identifier(COMPONENT_NAME),
          declaration.params,
          declaration.body,
          declaration.generator,
          declaration.async
        );
      }
    }
    return declaration;
  }

  function wrapHotModuleReplacementFunc(path, state) {
    const node = path.node;
    const filename = state.filename;
    let declaration = node.declaration;
    
    if (
      types.isClassDeclaration(declaration) ||
      types.isFunctionDeclaration(declaration)
    ) {
      declaration = getNamedDeclaration(declaration);
      path.replaceWithMultiple([
        declaration,
        getExportDefaultDeclaration(filename, types.identifier(declaration.id && declaration.id.name || COMPONENT_NAME))
      ]);
    } else {
      path.replaceWith(
        getExportDefaultDeclaration(filename, declaration)
      );
    }
  }

  return {
    visitor: {
      Program: {
        enter(path, state) {
          state.imports = {};
          if (entry.indexOf(state.filename) > -1) {
            state.isEntryFile = true;
          }
        },
        exit(path, state) {
          if (
            state.isEntryFile &&
            state.appName &&
            state.imports[state.appName]
          ) {
            state.appPath = state.imports[state.appName];
            !state.refName && addConstRef(path, state);
            addEntryHotListener(path, state);
          }
          if (state.wrapHotModuleReplacementFunc) {
            addImportReactHotLoader(path);
          }
        }
      },
      JSXElement(path, state) {
        if (state.isEntryFile) {
          if (
            types.isCallExpression(path.parent) &&
            (
              path.parent.callee.name === 'render' || (
                types.isMemberExpression(path.parent.callee) &&
                path.parent.callee.property.name === 'render'
              )
            )
          ) {
            const elem = path.node.openingElement;
            const attrs = elem.attributes || (elem.attributes = []);
            state.appName = elem.name.name;
            
            attrs.some(a => {
              if (a.name.name === 'ref') {
                state.refName = a.value.expression.name;
                return true;
              }
            });

            if (!state.refName) {
              attrs.push(
                types.jsxAttribute(
                  types.jsxIdentifier('ref'),
                  types.jsxExpressionContainer(types.identifier(REF_NAME))
                )
              );
            }
          }
        }
      },
      ImportDeclaration({ node }, state) {
        node.specifiers = node.specifiers || [];

        node.specifiers.some(s => {
          if (types.isImportDefaultSpecifier(s)) {
            state.imports[s.local.name] = node.source.value;
          }
        });

        if (node.source.value === 'react') {
          state.importedReact = true;
          if (state.isEntryFile) {
            node.specifiers = node.specifiers || [];
            node.specifiers.some(s => {
              if (s.imported && s.local.name === 'createRef') {
                state.createRefName = s.imported.name;
                return true;
              }
            });
            if (!state.createRefName) {
              node.specifiers.push(types.importSpecifier(types.identifier('createRef'), types.identifier('createRef')));
            }
          }
        }
      },
      ExportDefaultDeclaration(path, state) {
        const node = path.node;
        let declaration = node.declaration;
        if (
          !state.isEntryFile &&
          state.importedReact &&
          types.isFunctionDeclaration(declaration) || // export default function App() {}
          types.isIdentifier(declaration) || // export default App;
          (types.isCallExpression(declaration) && declaration.callee.name !== UPDATE_FUNC ) || // export default connect(App);
          (types.isClassDeclaration(declaration) && extendsReactComponent(declaration)) // export default class App extends Component/React.Component {}
        ) {
          state.wrapHotModuleReplacementFunc = true;
          wrapHotModuleReplacementFunc(path, state);
        }
      }
    }
  }
}