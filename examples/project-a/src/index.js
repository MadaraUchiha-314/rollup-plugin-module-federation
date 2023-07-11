import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import { ABC } from './abc';

export function doSomething() {
  console.log("Inside doSomething()");
  console.log(React.version);
  console.log(typeof Component);
  console.log(ReactDOM.version);
  console.log(uuidv4());
  console.log(ABC);
}

doSomething();