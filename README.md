# React 热更新原理

> 三步实现一个 React 热更新功能

*本项目只是一个简单的原理介绍，实际 [react-hot-loader](https://www.npmjs.com/package/react-hot-loader) 实现要比以上复杂得多，需要处理很多极端情况*

## 监听热更新

知识点1：`webpack` 开启热更新后可以通过 `module.hot.accept` 方法监听对应文件的变化，在回调中进行处理，通常只需要监听 `App` 组件即可，因为它是根组件，所有组件的修改都会导致根组件发生变化，[详细 API 见文档](https://webpack.docschina.org/guides/hot-module-replacement/)

知识点2：通过 `React` 组件的 `forceUpdate` 可以强制调用页面组件的更新

```jsx
import React, { createRef } from 'react';
import ReactDOM from 'react-dom';
import App from './App';
const ref = createRef();

ReactDOM.render(<App ref={ref} />, document.querySelector('#app'));

if (module.hot) {
  module.hot.accept('./App', function() {
    ref.current.forceUpdate();
  });
}
```

## 组件更新入口

由于每次加载更新后的组件，对于 `React` 来说都是不同的 `Component Type`，而对于 `VirtualDOM` 的 `diff` 算法来说，每次都是一个新组件，所以会重新渲染导致丢失状态（`state`）。

因此我们需要做一些事情，让组件应用变化时 `Component Type` 不发生变化，此处我们需要有一个修改组件的入口，而每次加载新的组件代码，都会重新执行一遍，因此我们在组件 `export` 时添加一个 `updateComponent` 的方法，保证每次变化都会执行。

```jsx
import React from 'react';
import { updateComponent } from './hmr';

class Title extends React.Component {
  render() {
    return (
      <div>
        <h1>Hello, {this.props.name}</h1>
      </div>
    );
  }
}

export default updateComponent('Title', Title);
```

## 热更新组件

想保证组件的状态不被丢失，必须保证原组件类型不会发生变化，因此不能直接替换原组件，但是可以通过一些 `hack` 手段来进行 “替换”

* 类组件：将新组件的原型 `prototype` 方法拷贝到旧组件上
* 函数组件：初始化时使用一个代理函数组件，每次只需要更新关联的函数对象即可 `renderComponent`

```jsx
const componentMap = {};

// 是否是函数组件
function isFunctionalComponent(Component) {
  return typeof Component === 'function' && (!Component.prototype || !Component.prototype.render);
}

// 获取代理组件
function getProxyComponent(Component) {
  if (isFunctionalComponent(Component)) {
    // 函数式代理组件
    const ProxyComponent = function () {
      return ProxyComponent.renderComponent.apply(this, arguments);
    }
    ProxyComponent.renderComponent = Component;
    return ProxyComponent;
  } else {
    return Component;
  }
}

// 更新组件
export function updateComponent(name, NextComponent) {
  let CurrentComponent = componentMap[name];

  if (!CurrentComponent) {
    // 首次更新
    CurrentComponent = componentMap[name] = getProxyComponent(NextComponent);
  } else if (isFunctionalComponent(NextComponent)) {
    // 函数式组件直接修改引用
    CurrentComponent.renderComponent = NextComponent;
  } else {
    // Copy 新的组件原型到之前的组件
    Object.getOwnPropertyNames(NextComponent.prototype).forEach((m) => {
      CurrentComponent.prototype[m] = NextComponent.prototype[m];
    });
  }
  
  // 注意修改显示名称，否则 React Dev Tool 显示名称不正确
  CurrentComponent.displayName = NextComponent.displayName || NextComponent.name;
  
  return CurrentComponent;
}
```

**注意修改显示名称，否则 `React Dev Tool` 显示名称会不正确**

## 最后

将以上改动抽取成[插件](./hmr/babel.js)，加到[配置文件](./.babelrc.js)中，这样每次调试的时候就可以自动处理了