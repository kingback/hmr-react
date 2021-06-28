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

// 注册组件
export function updateComponent(name, NextComponent) {
  let CurrentComponent = componentMap[name];

  if (!CurrentComponent) {
    // 首次注册
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