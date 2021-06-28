import React from 'react';
import Title from './Title';
import Text from './Text';
import Counter from './Counter';

export default class App extends React.Component {
  render() {
    return (
      <div>
        <Title text="HMR" />
        <Text text="Hot Module Replacement" />
        <Counter />
      </div>
    );
  }
}