import React, { Component } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ABC } from './abc';

export async function doSomething() {
  console.log("Inside doSomething()");
  console.log(React.version);
  console.log(typeof Component);
  const ReactDOM = await import('react-dom');
  console.log(ReactDOM.version);
  console.log(uuidv4());
  console.log(ABC);
}

doSomething();