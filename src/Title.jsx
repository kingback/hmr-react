import React from 'react';

export default class Title extends React.Component {
  render() {
    return (
      <div>
        <h1>Hello, {this.props.text}</h1>
        <input type="text" placeholder="请输入文字" />
      </div>
    );
  }
}
